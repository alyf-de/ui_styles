# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from ui_styles.history.boot import extend_bootinfo
from ui_styles.history.history import category, get_recent

PREFIX = "history-test-"


class TestHistory(FrappeTestCase):
	def setUp(self):
		super().setUp()
		doc = frappe.get_single("History Settings")
		doc.enabled = 0
		doc.max_entries = 10
		doc.save()
		frappe.db.delete("Route History", {"user": frappe.session.user, "route": ("like", f"%{PREFIX}%")})

	def tearDown(self):
		frappe.db.delete("Route History", {"user": frappe.session.user, "route": ("like", f"%{PREFIX}%")})
		doc = frappe.get_single("History Settings")
		doc.enabled = 0
		doc.max_entries = 10
		doc.save()
		super().tearDown()

	def test_disabled_throws(self):
		self.assertRaises(frappe.PermissionError, get_recent)

	def test_boot_off_when_disabled(self):
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertNotIn("history", bootinfo)

	def test_boot_sends_max_entries(self):
		self._enable(7)
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.history, {"max_entries": 7})

	def test_get_recent_returns_latest_unique_routes(self):
		self._enable(10)
		_insert_route(f"{PREFIX}alpha")
		_insert_route(f"{PREFIX}beta")
		_insert_route(f"{PREFIX}alpha")
		routes = [item["route"] for item in get_recent(10) if item["route"].startswith(PREFIX)]
		self.assertEqual(routes[:2], [f"{PREFIX}alpha", f"{PREFIX}beta"])

	def test_repeats_do_not_hide_older_pages(self):
		self._enable(10)
		_insert_route(f"{PREFIX}gamma")
		for _ in range(20):
			_insert_route(f"{PREFIX}beta")
			_insert_route(f"{PREFIX}alpha")
		routes = [item["route"] for item in get_recent(10) if item["route"].startswith(PREFIX)]
		self.assertEqual(routes[:3], [f"{PREFIX}alpha", f"{PREFIX}beta", f"{PREFIX}gamma"])

	def test_skips_current_route_before_limit(self):
		self._enable(1)
		older = f"Workspaces/{PREFIX}Home"
		current = f"List/{PREFIX}Item/List"
		_insert_route(older)
		_insert_route(current)
		routes = [item["route"] for item in get_recent(1, current_route=current)]
		self.assertEqual(routes, [older])

	def test_skips_hidden_group_before_limit(self):
		self._enable(1)
		workspace = f"Workspaces/{PREFIX}Home"
		listing = f"List/{PREFIX}Customer/List"
		_insert_route(workspace)
		_insert_route(listing)
		routes = [item["route"] for item in get_recent(1, hidden_groups=["lists"])]
		self.assertEqual(routes, [workspace])

	def test_document_named_like_its_doctype_is_not_settings(self):
		self.assertEqual(category("Form/Item/Item"), "documents")
		singles = frappe.get_all("DocType", filters={"issingle": 1}, pluck="name")
		single = next(name for name in singles if not name.lower().endswith("settings"))
		self.assertEqual(category(f"Form/{single}/{single}"), "settings")

	def test_max_entries_caps_client_limit(self):
		self._enable(2)
		_insert_route(f"{PREFIX}one")
		_insert_route(f"{PREFIX}two")
		_insert_route(f"{PREFIX}three")
		routes = [item["route"] for item in get_recent(50) if item["route"].startswith(PREFIX)]
		self.assertEqual(routes, [f"{PREFIX}three", f"{PREFIX}two"])

	def test_max_entries_out_of_range(self):
		doc = frappe.get_single("History Settings")
		doc.enabled = 1
		doc.max_entries = 51
		self.assertRaises(frappe.ValidationError, doc.save)

	def _enable(self, max_entries):
		doc = frappe.get_single("History Settings")
		doc.enabled = 1
		doc.max_entries = max_entries
		doc.save()


def _insert_route(route: str) -> None:
	frappe.get_doc(
		{
			"doctype": "Route History",
			"route": route,
			"user": frappe.session.user,
		}
	).insert(ignore_permissions=True)
