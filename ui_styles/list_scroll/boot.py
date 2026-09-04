# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.utils import cint

SETTINGS_DOCTYPE = "List Scroll Settings"


def _flag(value, default: int = 0) -> int:
	if value is None or value == "":
		return default
	return cint(value)


def _settings_dict(
	*,
	dense_list_layout: int,
	sticky_list_header: int,
	floating_list_paging: int,
	sticky_columns: int,
) -> dict:
	dense = _flag(dense_list_layout, default=0)
	if not dense:
		return {
			"dense_list_layout": 0,
			"sticky_list_header": 0,
			"floating_list_paging": 0,
			"sticky_columns": 0,
		}
	return {
		"dense_list_layout": 1,
		"sticky_list_header": _flag(sticky_list_header, default=0),
		"floating_list_paging": _flag(floating_list_paging, default=0),
		"sticky_columns": max(0, _flag(sticky_columns, default=0)),
	}


def _load_defaults() -> dict:
	if not frappe.db.exists("DocType", SETTINGS_DOCTYPE):
		return _settings_dict(
			dense_list_layout=0,
			sticky_list_header=0,
			floating_list_paging=0,
			sticky_columns=0,
		)
	return _settings_dict(
		dense_list_layout=frappe.db.get_single_value(SETTINGS_DOCTYPE, "dense_list_layout"),
		sticky_list_header=frappe.db.get_single_value(SETTINGS_DOCTYPE, "sticky_list_header"),
		floating_list_paging=frappe.db.get_single_value(SETTINGS_DOCTYPE, "floating_list_paging"),
		sticky_columns=frappe.db.get_single_value(SETTINGS_DOCTYPE, "sticky_columns"),
	)


def _load_overrides() -> dict[str, dict]:
	if not frappe.db.exists("DocType", "List Scroll DocType Setting"):
		return {}
	rows = frappe.get_all(
		"List Scroll DocType Setting",
		filters={"parent": SETTINGS_DOCTYPE, "parenttype": SETTINGS_DOCTYPE},
		fields=[
			"reference_doctype",
			"dense_list_layout",
			"sticky_list_header",
			"floating_list_paging",
			"sticky_columns",
		],
		order_by="idx asc",
	)
	by_doctype = {}
	for row in rows:
		doctype = row.reference_doctype
		if not doctype or doctype in by_doctype:
			continue
		by_doctype[doctype] = _settings_dict(
			dense_list_layout=row.dense_list_layout,
			sticky_list_header=row.sticky_list_header,
			floating_list_paging=row.floating_list_paging,
			sticky_columns=row.sticky_columns,
		)
	return by_doctype


def extend_bootinfo(bootinfo):
	defaults = _load_defaults()
	by_doctype = _load_overrides()
	any_dense = bool(defaults["dense_list_layout"]) or any(
		cfg["dense_list_layout"] for cfg in by_doctype.values()
	)
	bootinfo.list_scroll = {
		"defaults": defaults,
		"by_doctype": by_doctype,
		# Client load gate: run list_scroll JS when any dense config is on.
		"any_dense": 1 if any_dense else 0,
	}
