# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

from typing import NamedTuple

import frappe
from frappe import _

from ui_styles.doc_table import FIELDTYPE

DEFAULT_ORDER_BY = "modified desc"
DEFAULT_PAGE_SIZE = 20
DEFAULT_PAGE_SIZE_MAX = 100
HARD_MAX_PAGE_LENGTH = 500
DEFAULT_VISIBLE_ROWS = 5
MAX_VISIBLE_ROWS = 50
DEFAULT_PAGINATION = "none"
_PAGINATION_MODES = frozenset({"pages", "none"})
_ORDER_DIRECTIONS = frozenset({"asc", "desc"})
_STANDARD_ORDER_FIELDS = frozenset(
	{
		"name",
		"creation",
		"modified",
		"modified_by",
		"owner",
		"idx",
		"docstatus",
	}
)
_KNOWN_DIRECTIVES = frozenset(
	{"doctype", "link", "columns", "order_by", "page_size", "page_size_max", "visible_rows", "pagination"}
)


class DocTableOptions(NamedTuple):
	doctype: str
	link_fieldname: str | None
	columns: tuple[str, ...] | None
	skip_parent_link: bool = False
	order_by: str | None = None
	page_size: int | None = None
	page_size_max: int | None = None
	visible_rows: int | None = None
	pagination: str | None = None


def parse_options(options: str | None) -> DocTableOptions:
	"""Parse *Options* for a **Doc Table** field.

	Format (newline-separated, any order)::

	        doctype: Sales Invoice
	        link: customer
	        columns: name, posting_date, grand_total, status
	        order_by: posting_date desc
	        page_size: 20
	        page_size_max: 100
	        visible_rows: 5
	        pagination: pages

	- ``doctype:`` (required) - target DocType
	- ``link:`` (optional) - Link fieldname on the target, or ``none`` to skip
	  parent linking and rely only on field *Filters*. When omitted, Link
	  fields that point at the parent DocType are detected automatically.
	- ``columns:`` (optional) - comma-separated fieldnames
	- ``order_by:`` (optional) - same syntax as ``frappe.get_list`` / ``order_by``.
	  Default is ``modified desc``.
	- ``page_size:`` (optional) - rows per Load More fetch when ``pagination`` is
	  ``none`` (default 20)
	- ``page_size_max:`` (optional) - ceiling for page_size (default 100, hard max 500)
	- ``visible_rows:`` (optional) - grid viewport height; also the page step size
	  when ``pagination: pages`` (default 5)
	- ``pagination:`` (optional) - ``pages`` for prev/next (steps of ``visible_rows``),
	  or ``none`` for Load More + scroll (default when omitted)
	"""
	lines = [line.strip() for line in (options or "").splitlines() if line.strip()]
	if not lines:
		frappe.throw(_("Doc Table fields require Options with doctype: DocType Name"))

	doctype = None
	link_fieldname = None
	columns = None
	skip_parent_link = False
	order_by = None
	page_size = None
	page_size_max = None
	visible_rows = None
	pagination = None
	seen_link = False

	for line in lines:
		key, value = _split_directive(line)
		key_norm = key.lower().replace(" ", "_")

		if key_norm not in _KNOWN_DIRECTIVES:
			frappe.throw(_("Doc Table Options: unknown directive {0}").format(frappe.bold(key)))

		if key_norm == "doctype":
			if doctype is not None:
				frappe.throw(_("Doc Table Options: only one doctype line is allowed"))
			if not value:
				frappe.throw(_("Doc Table doctype line must set a DocType name"))
			doctype = value
			continue

		if key_norm == "link":
			if seen_link:
				frappe.throw(_("Doc Table Options: only one link line is allowed"))
			seen_link = True
			if not value:
				frappe.throw(_("Doc Table link line must set a fieldname or none"))
			if value.lower() == "none":
				skip_parent_link = True
			else:
				link_fieldname = value
			continue

		if key_norm == "columns":
			if columns is not None:
				frappe.throw(_("Doc Table Options: only one columns line is allowed"))
			columns = _parse_columns_value(value)
			continue

		if key_norm == "order_by":
			if order_by is not None:
				frappe.throw(_("Doc Table Options: only one order_by line is allowed"))
			order_by = _parse_order_by_value(value)
			continue

		if key_norm == "page_size":
			if page_size is not None:
				frappe.throw(_("Doc Table Options: only one page_size line is allowed"))
			page_size = _parse_positive_int(value, "page_size", HARD_MAX_PAGE_LENGTH)
			continue

		if key_norm == "page_size_max":
			if page_size_max is not None:
				frappe.throw(_("Doc Table Options: only one page_size_max line is allowed"))
			page_size_max = _parse_positive_int(value, "page_size_max", HARD_MAX_PAGE_LENGTH)
			continue

		if key_norm == "visible_rows":
			if visible_rows is not None:
				frappe.throw(_("Doc Table Options: only one visible_rows line is allowed"))
			visible_rows = _parse_positive_int(value, "visible_rows", MAX_VISIBLE_ROWS)
			continue

		if key_norm == "pagination":
			if pagination is not None:
				frappe.throw(_("Doc Table Options: only one pagination line is allowed"))
			pagination = _parse_pagination_value(value)
			continue

	if not doctype:
		frappe.throw(_("Doc Table fields require Options with doctype: DocType Name"))

	effective_page_size = page_size if page_size is not None else DEFAULT_PAGE_SIZE
	effective_page_size_max = page_size_max if page_size_max is not None else DEFAULT_PAGE_SIZE_MAX
	if effective_page_size > effective_page_size_max:
		frappe.throw(
			_("Doc Table page_size ({0}) cannot be greater than page_size_max ({1})").format(
				frappe.bold(str(effective_page_size)),
				frappe.bold(str(effective_page_size_max)),
			)
		)

	return DocTableOptions(
		doctype=doctype,
		link_fieldname=link_fieldname,
		columns=columns,
		skip_parent_link=skip_parent_link,
		order_by=order_by,
		page_size=page_size,
		page_size_max=page_size_max,
		visible_rows=visible_rows,
		pagination=pagination,
	)


def _split_directive(line: str) -> tuple[str, str]:
	if ":" not in line:
		frappe.throw(_("Doc Table Options lines must use key: value (got {0})").format(frappe.bold(line)))
	key, value = line.split(":", 1)
	return key.strip(), value.strip()


def _parse_order_by_value(value: str) -> str:
	if not value:
		frappe.throw(_("Doc Table order_by line must list at least one field"))
	# Normalize so get_list receives a clean clause (validate later against meta).
	clauses = []
	for part in value.split(","):
		part = part.strip()
		if not part:
			continue
		tokens = part.split()
		if len(tokens) == 1:
			clauses.append(tokens[0])
		elif len(tokens) == 2 and tokens[1].lower() in _ORDER_DIRECTIONS:
			clauses.append(f"{tokens[0]} {tokens[1].lower()}")
		else:
			frappe.throw(_("Invalid Doc Table order_by clause: {0}").format(frappe.bold(part)))
	if not clauses:
		frappe.throw(_("Doc Table order_by line must list at least one field"))
	return ", ".join(clauses)


def _parse_columns_value(value: str) -> tuple[str, ...]:
	fieldnames = [part.strip() for part in value.split(",") if part.strip()]
	if not fieldnames:
		frappe.throw(_("Doc Table columns line must list at least one fieldname"))
	return tuple(fieldnames)


def _parse_positive_int(value: str, label: str, max_value: int) -> int:
	if not value:
		frappe.throw(_("Doc Table {0} line must set a positive integer").format(label))
	try:
		parsed = int(value)
	except ValueError:
		frappe.throw(
			_("Doc Table {0} must be a positive integer (got {1})").format(label, frappe.bold(value))
		)
	if parsed < 1:
		frappe.throw(_("Doc Table {0} must be at least 1").format(label))
	if parsed > max_value:
		frappe.throw(_("Doc Table {0} cannot be greater than {1}").format(label, frappe.bold(str(max_value))))
	return parsed


def _parse_pagination_value(value: str) -> str:
	if not value:
		frappe.throw(_("Doc Table pagination line must be pages or none"))
	normalized = value.lower().replace(" ", "_")
	if normalized not in _PAGINATION_MODES:
		frappe.throw(_("Doc Table pagination must be pages or none (got {0})").format(frappe.bold(value)))
	return normalized


def resolve_page_settings(parsed: DocTableOptions) -> tuple[int, int, int, str]:
	"""Return page_size, page_size_max, visible_rows, pagination with defaults applied."""
	page_size_max = min(
		parsed.page_size_max if parsed.page_size_max is not None else DEFAULT_PAGE_SIZE_MAX,
		HARD_MAX_PAGE_LENGTH,
	)
	page_size = parsed.page_size if parsed.page_size is not None else DEFAULT_PAGE_SIZE
	page_size = min(page_size, page_size_max)
	visible_rows = parsed.visible_rows if parsed.visible_rows is not None else DEFAULT_VISIBLE_ROWS
	pagination = parsed.pagination if parsed.pagination is not None else DEFAULT_PAGINATION
	return page_size, page_size_max, visible_rows, pagination


def resolve_fetch_limit(page_size: int, visible_rows: int, pagination: str) -> int:
	"""Rows to fetch: ``visible_rows`` for pages mode, else ``page_size`` (Load More)."""
	if pagination == "pages":
		return visible_rows
	return page_size


def resolve_link_fields(
	target_doctype: str,
	parent_doctype: str,
	link_fieldname: str | None = None,
	skip_parent_link: bool = False,
) -> list[str]:
	"""Return Link fieldnames on *target_doctype* that filter by *parent_doctype*.

	Returns an empty list when *skip_parent_link* is set (``link: none`` in Options).
	At most one Link field is returned: omit ``link:`` only when exactly one
	candidate exists; otherwise set ``link: fieldname`` explicitly.
	"""
	if skip_parent_link:
		return []

	meta = frappe.get_meta(target_doctype)

	if link_fieldname:
		df = meta.get_field(link_fieldname)
		if not df:
			frappe.throw(
				_("Field {0} not found on {1}").format(
					frappe.bold(link_fieldname), frappe.bold(target_doctype)
				)
			)
		if df.fieldtype != "Link":
			frappe.throw(
				_("Field {0} on {1} must be a Link field").format(
					frappe.bold(link_fieldname), frappe.bold(target_doctype)
				)
			)
		if df.options != parent_doctype:
			frappe.throw(
				_("Field {0} on {1} must be a Link to {2}").format(
					frappe.bold(link_fieldname),
					frappe.bold(target_doctype),
					frappe.bold(parent_doctype),
				)
			)
		return [link_fieldname]

	link_fields = find_parent_link_fields(target_doctype, parent_doctype)
	if not link_fields:
		frappe.throw(
			_(
				"No Link field on {0} pointing to {1}. "
				"Set link: fieldname in Options, or use link: none with field Filters."
			).format(frappe.bold(target_doctype), frappe.bold(parent_doctype))
		)
	if len(link_fields) > 1:
		frappe.throw(
			_(
				"Multiple Link fields on {0} point to {1} ({2}). "
				"Set link: fieldname in Options to choose one."
			).format(
				frappe.bold(target_doctype),
				frappe.bold(parent_doctype),
				frappe.bold(", ".join(link_fields)),
			)
		)
	return link_fields


def find_parent_link_fields(target_doctype: str, parent_doctype: str) -> list[str]:
	"""Return Link fieldnames on *target_doctype* whose *Options* is *parent_doctype*."""
	meta = frappe.get_meta(target_doctype)
	return [df.fieldname for df in meta.fields if df.fieldtype == "Link" and df.options == parent_doctype]


def resolve_order_by(meta, order_by: str | None) -> str:
	"""Return a validated ``order_by`` clause for ``frappe.get_list``."""
	if not order_by:
		return DEFAULT_ORDER_BY

	for part in order_by.split(","):
		tokens = part.strip().split()
		fieldname = tokens[0]
		if fieldname in _STANDARD_ORDER_FIELDS:
			continue
		df = meta.get_field(fieldname)
		if not df:
			frappe.throw(
				_("order_by field {0} is not a field of {1}").format(
					frappe.bold(fieldname), frappe.bold(meta.name)
				)
			)
		if df.fieldtype in frappe.model.no_value_fields:
			frappe.throw(
				_("order_by field {0} on {1} is not a value field").format(
					frappe.bold(fieldname), frappe.bold(meta.name)
				)
			)
	return order_by


def resolve_columns(meta, column_fieldnames: tuple[str, ...] | None, title_field: str) -> list[str]:
	"""Return display column fieldnames.

	``name`` is included only when listed in Options (or as a last-resort
	fallback when no columns resolve). The client puts the row open link on
	``name`` when present, otherwise on the first column.
	"""
	if column_fieldnames:
		return validate_columns(meta, column_fieldnames)
	return _list_view_fields(meta, title_field)


def validate_columns(meta, column_fieldnames: tuple[str, ...]) -> list[str]:
	valid = []
	for fieldname in column_fieldnames:
		if fieldname == "name":
			valid.append(fieldname)
			continue
		df = meta.get_field(fieldname)
		if not df:
			frappe.throw(
				_("Column {0} is not a field of {1}").format(frappe.bold(fieldname), frappe.bold(meta.name))
			)
		if df.fieldtype in frappe.model.no_value_fields:
			frappe.throw(
				_("Column {0} on {1} is not a value field").format(
					frappe.bold(fieldname), frappe.bold(meta.name)
				)
			)
		valid.append(fieldname)
	return valid


def _list_view_fields(meta, title_field: str) -> list[str]:
	fields = []
	for df in meta.fields:
		if not df.in_list_view:
			continue
		if df.fieldname in ("name", "naming_series"):
			continue
		if df.fieldtype in frappe.model.no_value_fields:
			continue
		fields.append(df.fieldname)
		if len(fields) >= 5:
			break

	if title_field and title_field != "name" and title_field not in fields:
		fields.insert(0, title_field)

	return fields


def validate_doc_table_field(df, parent_doctype: str | None = None) -> None:
	"""Validate a DocField / Custom Field styled row for **Doc Table**."""
	if getattr(df, "fieldtype", None) != FIELDTYPE:
		return

	# Display-only via no_value_fields registration - do not set is_virtual.
	# is_virtual forces Read status and Frappe hides empty Read fields (unlike HTML).
	if hasattr(df, "reqd"):
		df.reqd = 0
	if hasattr(df, "is_virtual") and df.is_virtual:
		df.is_virtual = 0

	parsed = parse_options(getattr(df, "options", None))
	if not frappe.db.exists("DocType", parsed.doctype):
		frappe.throw(_("Options DocType {0} does not exist").format(frappe.bold(parsed.doctype)))

	target_meta = frappe.get_meta(parsed.doctype)
	if target_meta.istable:
		frappe.throw(
			_(
				"Doc Table Options must be a real DocType, not a child table ({0}). "
				"Use fieldtype Table for child tables."
			).format(frappe.bold(parsed.doctype))
		)
	if target_meta.issingle:
		frappe.throw(
			_("Doc Table Options cannot be a Single DocType ({0}).").format(frappe.bold(parsed.doctype))
		)
	if getattr(target_meta, "is_virtual", 0):
		frappe.throw(
			_("Doc Table Options cannot be a virtual DocType ({0}).").format(frappe.bold(parsed.doctype))
		)

	if parsed.columns:
		validate_columns(target_meta, parsed.columns)

	if parsed.order_by:
		resolve_order_by(target_meta, parsed.order_by)

	if parent_doctype and not frappe.flags.in_install:
		# Explicit link: fail early when wrong. Auto-detect: fail early when
		# ambiguous (multiple candidates). Zero candidates still deferred to
		# render so Customize Form can save before both DocTypes exist in sync.
		if parsed.skip_parent_link:
			return
		if parsed.link_fieldname:
			resolve_link_fields(
				parsed.doctype,
				parent_doctype,
				parsed.link_fieldname,
				skip_parent_link=False,
			)
			return

		candidates = find_parent_link_fields(parsed.doctype, parent_doctype)
		if len(candidates) > 1:
			frappe.throw(
				_(
					"Multiple Link fields on {0} point to {1} ({2}). "
					"Set link: fieldname in Options to choose one."
				).format(
					frappe.bold(parsed.doctype),
					frappe.bold(parent_doctype),
					frappe.bold(", ".join(candidates)),
				)
			)
