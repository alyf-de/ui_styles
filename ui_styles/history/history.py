# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint

from ui_styles.history.boot import get_max_entries


def _require_history() -> int:
	limit = get_max_entries()
	if not limit:
		frappe.throw(_("History is not enabled."), frappe.PermissionError)
	return limit


@frappe.whitelist()
def get_recent(limit: int | None = None) -> list[dict]:
	cap = _require_history()
	if frappe.session.user == "Guest":
		return []

	limit = min(max(cint(limit) or cap, 1), cap)
	# Route History grants read to System Manager only. get_all stays inside this user's rows.
	rows = frappe.get_all(
		"Route History",
		fields=["route", "creation"],
		filters={"user": frappe.session.user},
		order_by="creation desc",
		limit=limit * 4,
	)
	seen = set()
	items = []
	for row in rows:
		route = (row.route or "").strip()
		if not route or route in seen:
			continue
		seen.add(route)
		items.append({"route": route, "creation": str(row.creation) if row.creation else None})
		if len(items) >= limit:
			break
	return items
