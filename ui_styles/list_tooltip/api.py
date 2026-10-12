# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from typing import Any

import frappe


@frappe.whitelist()
def get_last_thread_preview(reference_doctype: str, reference_name: str) -> dict[str, Any]:
	"""Return the latest user Comment and Communication for a document (read-only)."""
	if not frappe.db.exists(reference_doctype, reference_name):
		return {"comment": None, "comm": None}

	doc = frappe.get_doc(reference_doctype, reference_name)
	if not doc.has_permission("read"):
		return {"comment": None, "comm": None}

	comment_rows = frappe.get_all(
		"Comment",
		fields=["content", "creation", "comment_type", "comment_by"],
		filters=[
			["reference_doctype", "=", reference_doctype],
			["reference_name", "=", reference_name],
			["comment_type", "=", "Comment"],
		],
		order_by="creation desc",
		limit_page_length=1,
	)
	communication_rows = frappe.get_all(
		"Communication",
		fields=[
			"content",
			"text_content",
			"subject",
			"creation",
			"communication_medium",
			"sender",
			"recipients",
		],
		filters=[
			["reference_doctype", "=", reference_doctype],
			["reference_name", "=", reference_name],
			["communication_type", "=", "Communication"],
		],
		order_by="creation desc",
		limit_page_length=1,
	)

	return {
		"comment": comment_rows[0] if comment_rows else None,
		"comm": communication_rows[0] if communication_rows else None,
	}
