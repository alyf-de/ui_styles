# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.utils import cint

SETTINGS_DOCTYPE = "List Scroll Settings"


def _flag(fieldname: str, default: int = 0) -> int:
	if not frappe.db.exists("DocType", SETTINGS_DOCTYPE):
		return default
	value = frappe.db.get_single_value(SETTINGS_DOCTYPE, fieldname)
	if value is None or value == "":
		return default
	return cint(value)


def extend_bootinfo(bootinfo):
	dense = _flag("dense_list_layout", default=0)
	bootinfo.list_scroll = {
		"dense_list_layout": dense,
		"sticky_list_header": _flag("sticky_list_header", default=0) if dense else 0,
		"floating_list_paging": _flag("floating_list_paging", default=0) if dense else 0,
	}
