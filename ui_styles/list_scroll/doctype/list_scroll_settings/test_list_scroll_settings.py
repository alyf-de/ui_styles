# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from ui_styles.list_scroll.boot import extend_bootinfo


class TestListScrollSettings(FrappeTestCase):
	def setUp(self):
		frappe.db.set_single_value("List Scroll Settings", "dense_list_layout", 0)
		frappe.db.set_single_value("List Scroll Settings", "sticky_list_header", 0)
		frappe.db.set_single_value("List Scroll Settings", "floating_list_paging", 0)

	def tearDown(self):
		self.setUp()

	def test_boot_defaults_off(self):
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["dense_list_layout"], 0)
		self.assertEqual(bootinfo.list_scroll["sticky_list_header"], 0)
		self.assertEqual(bootinfo.list_scroll["floating_list_paging"], 0)

	def test_boot_sticky_and_floating_require_dense(self):
		frappe.db.set_single_value("List Scroll Settings", "dense_list_layout", 0)
		frappe.db.set_single_value("List Scroll Settings", "sticky_list_header", 1)
		frappe.db.set_single_value("List Scroll Settings", "floating_list_paging", 1)
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["dense_list_layout"], 0)
		self.assertEqual(bootinfo.list_scroll["sticky_list_header"], 0)
		self.assertEqual(bootinfo.list_scroll["floating_list_paging"], 0)

	def test_boot_flags_when_dense_on(self):
		frappe.db.set_single_value("List Scroll Settings", "dense_list_layout", 1)
		frappe.db.set_single_value("List Scroll Settings", "sticky_list_header", 1)
		frappe.db.set_single_value("List Scroll Settings", "floating_list_paging", 1)
		bootinfo = frappe._dict()
		extend_bootinfo(bootinfo)
		self.assertEqual(bootinfo.list_scroll["dense_list_layout"], 1)
		self.assertEqual(bootinfo.list_scroll["sticky_list_header"], 1)
		self.assertEqual(bootinfo.list_scroll["floating_list_paging"], 1)
