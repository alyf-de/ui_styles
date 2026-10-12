# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from ui_styles.history.boot import extend_bootinfo
from ui_styles.history.history import get_recent

PREFIX = "history-test-"


class TestHistory(FrappeTestCase):
	def setUp(self):
		super().setUp()
		doc = frappe.get_single("History Settings")
		doc.enabled = 0
		doc.max_entries = 10
		doc.save()
		frappe.db.delete("Route History", {"user": frappe.session.user, "route": ("like", f"{PREFIX}%")})

	def tearDown(self):
		frappe.db.delete("Route History", {"user": frappe.session.user, "route": ("like", f"{PREFIX}%")})
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
		routes = _test_routes()
		self.assertEqual(routes, [f"{PREFIX}alpha", f"{PREFIX}beta"])

	def test_repeats_do_not_hide_older_pages(self):
		self._enable(10)
		_insert_route(f"{PREFIX}gamma")
		for _ in range(20):
			_insert_route(f"{PREFIX}beta")
			_insert_route(f"{PREFIX}alpha")
		routes = _test_routes()
		self.assertEqual(routes, [f"{PREFIX}alpha", f"{PREFIX}beta", f"{PREFIX}gamma"])

	def test_returns_more_than_max_entries_for_menu_filters(self):
		self._enable(1)
		_insert_route(f"{PREFIX}one")
		_insert_route(f"{PREFIX}two")
		_insert_route(f"{PREFIX}three")
		routes = _test_routes()
		self.assertEqual(routes, [f"{PREFIX}three", f"{PREFIX}two", f"{PREFIX}one"])

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


def _test_routes() -> list[str]:
	return [item["route"] for item in get_recent() if item["route"].startswith(PREFIX)]


def _insert_route(route: str) -> None:
	frappe.get_doc(
		{
			"doctype": "Route History",
			"route": route,
			"user": frappe.session.user,
		}
	).insert(ignore_permissions=True)
