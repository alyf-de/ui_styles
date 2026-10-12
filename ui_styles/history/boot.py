# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import cint

SETTINGS_DOCTYPE = "History Settings"
DEFAULT_MAX_ENTRIES = 10
MAX_ENTRIES_LIMIT = 50


def clamp_max_entries(value) -> int:
	count = cint(value) or DEFAULT_MAX_ENTRIES
	return min(max(count, 1), MAX_ENTRIES_LIMIT)


def get_max_entries() -> int:
	"""Return the configured menu size, or 0 when History is off or not installed."""
	if not frappe.db.exists("DocType", SETTINGS_DOCTYPE):
		return 0
	if not cint(frappe.db.get_single_value(SETTINGS_DOCTYPE, "enabled")):
		return 0
	return clamp_max_entries(frappe.db.get_single_value(SETTINGS_DOCTYPE, "max_entries"))


def extend_bootinfo(bootinfo):
	if frappe.session.user == "Guest":
		return

	max_entries = get_max_entries()
	if not max_entries:
		return

	bootinfo.history = {"max_entries": max_entries}
