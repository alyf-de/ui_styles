# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from ui_styles.list_tooltip.api import get_last_thread_preview


class TestGetLastThreadPreview(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")
		self.todo = frappe.get_doc(
			doctype="ToDo",
			description="list tooltip thread preview",
			assigned_by="Administrator",
		).insert()

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.delete("Comment", {"reference_doctype": "ToDo", "reference_name": self.todo.name})
		frappe.db.delete("Communication", {"reference_doctype": "ToDo", "reference_name": self.todo.name})
		frappe.delete_doc("ToDo", self.todo.name, force=True, ignore_permissions=True)

	def test_missing_document(self):
		result = get_last_thread_preview("ToDo", "LIST-TOOLTIP-DOES-NOT-EXIST")
		self.assertEqual(result, {"comment": None, "comm": None})

	def test_no_linked_records(self):
		result = get_last_thread_preview("ToDo", self.todo.name)
		self.assertIsNone(result["comment"])
		self.assertIsNone(result["comm"])

	def test_unreadable_document(self):
		# Same pattern as frappe ToDo permission tests: a user without ToDo roles
		# cannot read a document they do not own or assign.
		other = frappe.get_doc(
			doctype="ToDo",
			description="list tooltip unreadable",
			assigned_by="testperm@example.com",
		).insert()

		def _cleanup_other():
			frappe.set_user("Administrator")
			frappe.delete_doc("ToDo", other.name, force=True, ignore_permissions=True)

		self.addCleanup(_cleanup_other)

		frappe.set_user("test4@example.com")
		self.assertFalse(frappe.get_doc("ToDo", other.name).has_permission("read"))

		result = get_last_thread_preview("ToDo", other.name)
		self.assertEqual(result, {"comment": None, "comm": None})

	def test_readable_returns_newest_matching_comment_and_communication(self):
		old_comment = self.todo.add_comment("Comment", "older comment")
		new_comment = self.todo.add_comment("Comment", "newer comment")
		frappe.db.set_value("Comment", old_comment.name, "creation", "2020-01-01 10:00:00")
		frappe.db.set_value("Comment", new_comment.name, "creation", "2020-01-02 10:00:00")

		# Non-matching comment_type must be ignored.
		self.todo.add_comment("Like", "not a user comment")

		old_comm = self._make_communication(
			subject="old",
			content="<p>old body</p>",
			text_content="old body",
			sender="a@example.com",
		)
		new_comm = self._make_communication(
			subject="new",
			content="<p>new body</p>",
			text_content="Contact <alice@example.com>",
			sender="b@example.com",
		)
		frappe.db.set_value("Communication", old_comm.name, "creation", "2020-01-01 11:00:00")
		frappe.db.set_value("Communication", new_comm.name, "creation", "2020-01-02 11:00:00")

		# Non-matching communication_type must be ignored.
		other_type = self._make_communication(
			subject="bot",
			content="automated",
			text_content="automated",
			sender="bot@example.com",
		)
		frappe.db.set_value("Communication", other_type.name, "communication_type", "Automated Message")
		frappe.db.set_value("Communication", other_type.name, "creation", "2020-01-03 11:00:00")

		result = get_last_thread_preview("ToDo", self.todo.name)

		self.assertIsNotNone(result["comment"])
		self.assertEqual(result["comment"]["content"], "newer comment")
		self.assertIsNotNone(result["comm"])
		self.assertEqual(result["comm"]["subject"], "new")
		self.assertEqual(result["comm"]["text_content"], "Contact <alice@example.com>")

	def _make_communication(self, subject: str, content: str, text_content: str, sender: str):
		return frappe.get_doc(
			{
				"doctype": "Communication",
				"communication_type": "Communication",
				"communication_medium": "Email",
				"status": "Open",
				"sent_or_received": "Received",
				"subject": subject,
				"content": content,
				"text_content": text_content,
				"reference_doctype": "ToDo",
				"reference_name": self.todo.name,
				"sender": sender,
			}
		).insert(ignore_permissions=True)
