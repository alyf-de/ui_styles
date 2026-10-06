# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from ui_styles.list_tooltip.boot import extend_bootinfo


class TestListTooltipSettings(FrappeTestCase):
	def setUp(self):
		doc = frappe.get_single("List Tooltip Settings")
		doc.enabled = 0
		doc.set("configurations", [])
		doc.save()

	def tearDown(self):
		self.setUp()

	def save_settings(self, enabled=1, **row):
		doc = frappe.get_single("List Tooltip Settings")
		doc.enabled = enabled
		doc.append("configurations", {"reference_doctype": "ToDo", **row})
		doc.save()

	def test_boot_off_by_default(self):
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertNotIn("list_tooltip", bootinfo)

	def test_boot_off_when_master_toggle_off(self):
		self.save_settings(enabled=0, header_fields="status")
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertNotIn("list_tooltip", bootinfo)

	def test_boot_splits_fields_and_skips_disabled_rows(self):
		doc = frappe.get_single("List Tooltip Settings")
		doc.enabled = 1
		doc.append(
			"configurations",
			{"reference_doctype": "ToDo", "header_fields": "status, priority", "body_fields": "description"},
		)
		doc.append("configurations", {"reference_doctype": "Note", "enabled": 0, "header_fields": "title"})
		doc.save()

		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(
			bootinfo.list_tooltip["by_doctype"],
			{
				"ToDo": {
					"header_fields": ["status", "priority"],
					"body_fields": ["description"],
					"body_max_lines": 20,
				}
			},
		)

	def test_first_row_per_doctype_wins(self):
		doc = frappe.get_single("List Tooltip Settings")
		doc.enabled = 1
		doc.append("configurations", {"reference_doctype": "ToDo", "header_fields": "status"})
		doc.append("configurations", {"reference_doctype": "ToDo", "header_fields": "priority"})
		doc.save()

		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_tooltip["by_doctype"]["ToDo"]["header_fields"], ["status"])

	def test_std_field_accepted(self):
		self.save_settings(header_fields="owner, modified")

	def test_unknown_field_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self.save_settings(header_fields="status, no_such_field")

	def test_blank_doctype_row_gets_mandatory_error(self):
		doc = frappe.get_single("List Tooltip Settings")
		doc.enabled = 1
		doc.append("configurations", {"header_fields": "status"})
		with self.assertRaises(frappe.MandatoryError):
			doc.save()

	def test_non_column_standard_fields_rejected(self):
		for fieldname in ("doctype", "parent"):
			with self.assertRaises(frappe.ValidationError):
				self.save_settings(header_fields=fieldname)

	def test_body_max_lines_must_be_positive(self):
		with self.assertRaises(frappe.ValidationError):
			self.save_settings(header_fields="status", body_max_lines=0)

	def test_table_field_rejected(self):
		with self.assertRaises(frappe.ValidationError):
			self.save_settings(body_fields="roles", reference_doctype="User")
