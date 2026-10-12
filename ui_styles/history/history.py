# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.query_builder.functions import Max
from frappe.utils import cint

from ui_styles.history.boot import get_max_entries

# Distinct routes read before the current page and hidden groups are skipped.
SCAN_LIMIT = 200


def _require_history() -> int:
	limit = get_max_entries()
	if not limit:
		frappe.throw(_("History is not enabled."), frappe.PermissionError)
	return limit


def category(route: str) -> str | None:
	"""Same groups as the menu checkboxes. None stays visible."""
	parts = [part for part in (route or "").split("/") if part]
	if not parts:
		return None
	kind = parts[0]
	doctype = parts[1] if len(parts) > 1 else ""
	is_settings = doctype.lower().endswith("settings")
	if kind in ("Workspaces", "dashboard"):
		return "workspaces"
	if kind == "query-report":
		return "reports"
	if kind == "List":
		return "settings" if is_settings else "lists"
	if kind == "Form":
		name = "/".join(parts[2:])
		if is_settings or not name or _is_single(doctype):
			return "settings"
		return "documents"
	if is_settings:
		return "settings"
	return None


def _is_single(doctype: str) -> bool:
	if not doctype:
		return False
	return bool(frappe.db.get_value("DocType", doctype, "issingle"))


def _hidden_groups(value) -> set[str]:
	if isinstance(value, str):
		value = frappe.parse_json(value)
	if not value:
		return set()
	return {group for group in value if group}


def _latest_routes() -> list[dict]:
	history = frappe.qb.DocType("Route History")
	latest = Max(history.creation)
	return (
		frappe.qb.from_(history)
		.select(history.route, latest.as_("creation"))
		.where(history.user == frappe.session.user)
		.groupby(history.route)
		.orderby(latest, order=frappe.qb.desc)
		.limit(SCAN_LIMIT)
		.run(as_dict=True)
	)


@frappe.whitelist()
def get_recent(
	limit: int | None = None,
	current_route: str | None = None,
	hidden_groups: str | list | None = None,
) -> list[dict]:
	cap = _require_history()
	if frappe.session.user == "Guest":
		return []

	limit = min(max(cint(limit) or cap, 1), cap)
	current = (current_route or "").strip().lstrip("/")
	hidden = _hidden_groups(hidden_groups)
	items = []
	for row in _latest_routes():
		route = (row.route or "").strip()
		if not route or route == current:
			continue
		group = category(route)
		if group and group in hidden:
			continue
		items.append({"route": route, "creation": str(row.creation) if row.creation else None})
		if len(items) >= limit:
			break
	return items
