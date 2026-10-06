# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe

SETTINGS_DOCTYPE = "List Tooltip Settings"
CONFIG_DOCTYPE = "List Tooltip Configuration"


def split_fields(value: str | None) -> list[str]:
	return [fieldname.strip() for fieldname in (value or "").split(",") if fieldname.strip()]


def extend_bootinfo(bootinfo):
	if not frappe.db.get_single_value(SETTINGS_DOCTYPE, "enabled"):
		return

	rows = frappe.get_all(
		CONFIG_DOCTYPE,
		filters={"parent": SETTINGS_DOCTYPE, "parenttype": SETTINGS_DOCTYPE, "enabled": 1},
		fields=["reference_doctype", "header_fields", "body_fields", "body_max_lines"],
		order_by="idx asc",
	)

	by_doctype = {}
	for row in rows:
		# First row per DocType wins.
		by_doctype.setdefault(
			row.reference_doctype,
			{
				"header_fields": split_fields(row.header_fields),
				"body_fields": split_fields(row.body_fields),
				"body_max_lines": row.body_max_lines or 20,
			},
		)

	if by_doctype:
		bootinfo.list_tooltip = {"by_doctype": by_doctype}
