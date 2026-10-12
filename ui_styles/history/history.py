# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Max

from ui_styles.history.boot import get_max_entries

# Distinct routes sent to the menu, which filters them and keeps Max Entries.
SCAN_LIMIT = 200


@frappe.whitelist(methods=["GET"])
@frappe.read_only()
def get_recent() -> list[dict]:
	if not get_max_entries():
		frappe.throw(_("History is not enabled."), frappe.PermissionError)
	if frappe.session.user == "Guest":
		return []

	history = frappe.qb.DocType("Route History")
	latest = Max(history.creation)
	rows = (
		frappe.qb.from_(history)
		.select(history.route, latest.as_("creation"))
		.where(history.user == frappe.session.user)
		.groupby(history.route)
		.orderby(latest, order=frappe.qb.desc)
		.limit(SCAN_LIMIT)
		.run(as_dict=True)
	)
	return [
		{"route": row.route.strip(), "creation": str(row.creation) if row.creation else None}
		for row in rows
		if row.route and row.route.strip()
	]
