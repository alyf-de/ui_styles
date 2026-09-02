# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

"""Register **Doc Table** with Frappe model metadata and DocField Select options."""

from __future__ import annotations

import frappe
from frappe.custom.doctype.property_setter.property_setter import (
	delete_property_setter,
	make_property_setter,
)

from ui_styles.doc_table import FIELDTYPE, FIELDTYPE_OPTION_DOCTYPES

_REGISTERED = False

# Stock Custom Field *Filters* depends_on (quote style varies by Frappe version).
_STOCK_LINK_FILTERS_DEPENDS_ON = frozenset(
	{
		'eval:["Attachment Gallery", "Link"].includes(doc.fieldtype)',
		"eval:['Attachment Gallery', 'Link'].includes(doc.fieldtype)",
	}
)
_LINK_FILTERS_DEPENDS_ON = "eval:['Attachment Gallery', 'Link', 'Doc Table'].includes(doc.fieldtype)"


def register() -> None:
	"""Patch in-process fieldtype registries. Safe to call more than once."""
	global _REGISTERED
	if _REGISTERED:
		return

	_patch_python_fieldtype_lists()
	_REGISTERED = True


def _patch_python_fieldtype_lists() -> None:
	"""Extend Frappe fieldtype registries so **Doc Table** is display-only (no DB column).

	Frappe has no hook for ``additional_no_value_fields`` / ``additional_display_fieldtypes``.
	``no_value_fields`` and ``display_fieldtypes`` are hardcoded tuples in ``frappe.model``;
	core fieldtypes such as **Attachment Gallery** are added in core, not via hooks. Without
	this in-process patch, Frappe treats **Doc Table** as a value field in **DocType**
	validation, data import/export, version diff, and related paths. ``is_virtual`` is not
	used (forces Read and hides empty fields). Long-term fix: upstream Frappe hooks with
	lazy resolution so import-time bindings stay correct.
	"""
	import frappe.model as model  # nosemgrep: frappe-semgrep-rules.rules.frappe-monkey-patching-not-allowed

	def _extend_tuple(name: str) -> None:
		current = getattr(model, name)
		if FIELDTYPE in current:
			return
		setattr(model, name, (*tuple(current), FIELDTYPE))

	_extend_tuple("no_value_fields")
	_extend_tuple("display_fieldtypes")
	model.NO_VALUE_FIELDS = frozenset(model.no_value_fields)

	# Modules that imported the old tuple/frozenset by name keep a stale binding.
	_rebind_imported_fieldtype_lists()


def _rebind_imported_fieldtype_lists() -> (
	None
):  # nosemgrep: frappe-semgrep-rules.rules.frappe-monkey-patching-not-allowed
	"""Rebind modules that imported ``no_value_fields`` before ``register()`` ran."""
	import frappe.model as model

	targets = (
		"frappe.core.doctype.doctype.doctype",
		"frappe.model.meta",
		"frappe.model.base_document",
		"frappe.custom.doctype.customize_form.customize_form",
		"frappe.core.doctype.version.version",
		"frappe.core.doctype.data_import.exporter",
		"frappe.core.doctype.data_import.importer",
		"frappe.desk.link_preview",
		"frappe.website.doctype.web_form.web_form",
		"frappe.workflow.doctype.workflow.workflow",
		"frappe.core.doctype.system_settings.system_settings",
		"frappe.model.utils.rename_field",
		"frappe.types.exporter",
	)

	for module_path in targets:
		try:
			mod = frappe.get_module(module_path)
		except ImportError:
			continue

		if hasattr(mod, "no_value_fields"):
			mod.no_value_fields = model.no_value_fields
		if hasattr(mod, "NO_VALUE_FIELDS"):
			mod.NO_VALUE_FIELDS = model.NO_VALUE_FIELDS
		if hasattr(mod, "display_fieldtypes"):
			mod.display_fieldtypes = model.display_fieldtypes


def ensure_fieldtype_options() -> None:
	"""Append FIELDTYPE to Custom Field / Customize Form Field options."""
	_ensure_module_def()
	for doctype in FIELDTYPE_OPTION_DOCTYPES:
		_ensure_options_contain(doctype, "fieldtype", FIELDTYPE)
	_ensure_link_filters_depends_on()
	# Clean obsolete DocField Property Setter from earlier installs (no effect on meta).
	if frappe.db.exists("Property Setter", "DocField-fieldtype-options"):
		delete_property_setter("DocField", property="options", field_name="fieldtype")
		frappe.clear_cache(doctype="DocField")


def _ensure_link_filters_depends_on() -> None:
	"""Show *Filters* for **Doc Table** on Custom Field / Customize Form Field."""
	for doctype in FIELDTYPE_OPTION_DOCTYPES:
		meta = frappe.get_meta(doctype, cached=False)
		df = meta.get_field("link_filters")
		if not df:
			continue
		if df.depends_on == _LINK_FILTERS_DEPENDS_ON:
			continue
		# Do not clobber site-specific depends_on customizations.
		if df.depends_on and df.depends_on not in _STOCK_LINK_FILTERS_DEPENDS_ON:
			continue
		if not _may_write_property_setter(doctype, "link_filters", "depends_on"):
			continue
		_upsert_owned_property_setter(
			doctype,
			"link_filters",
			"depends_on",
			_LINK_FILTERS_DEPENDS_ON,
			"Data",
		)
		frappe.clear_cache(doctype=doctype)


def remove_fieldtype_options() -> None:
	"""Remove Doc Table from fieldtype options / *Filters* depends_on without wiping other customizations."""
	for doctype in FIELDTYPE_OPTION_DOCTYPES:
		_remove_option_value(doctype, "fieldtype", FIELDTYPE)
		_remove_link_filters_depends_on(doctype)
		frappe.clear_cache(doctype=doctype)


def _ensure_module_def() -> None:
	if frappe.db.exists("Module Def", "Doc Table"):
		if frappe.db.get_value("Module Def", "Doc Table", "app_name") != "ui_styles":
			frappe.db.set_value("Module Def", "Doc Table", "app_name", "ui_styles", update_modified=False)
		return
	frappe.get_doc(
		doctype="Module Def",
		module_name="Doc Table",
		app_name="ui_styles",
	).insert(ignore_permissions=True)


def _property_setter_name(doctype: str, fieldname: str, property: str) -> str:
	return f"{doctype}-{fieldname}-{property}"


def _is_owned_property_setter(ps_name: str) -> bool:
	"""True only when we created the setter (module Doc Table). Never claim foreign setters."""
	return frappe.db.get_value("Property Setter", ps_name, "module") == "Doc Table"


def _may_write_property_setter(doctype: str, fieldname: str, property: str) -> bool:
	"""Create when missing; update only setters we own. Skip pre-existing foreign ones."""
	ps_name = _property_setter_name(doctype, fieldname, property)
	if not frappe.db.exists("Property Setter", ps_name):
		return True
	return _is_owned_property_setter(ps_name)


def _ensure_options_contain(doctype: str, fieldname: str, value: str) -> None:
	meta = frappe.get_meta(doctype, cached=False)
	df = meta.get_field(fieldname)
	if not df:
		return

	options = (df.options or "").split("\n")
	if value in options:
		return

	if not _may_write_property_setter(doctype, fieldname, "options"):
		# Pre-existing site/other-app setter - do not overwrite or claim it.
		# DocType / Customize Form Form Builder still list Doc Table via Desk JS.
		frappe.logger("ui_styles.doc_table").warning(
			"Skipped adding %s to %s %s options: foreign Property Setter exists",
			value,
			doctype,
			fieldname,
		)
		return

	# Insert in alphabetical position among existing options.
	insert_at = len(options)
	for idx, opt in enumerate(options):
		if opt and opt.lower() > value.lower():
			insert_at = idx
			break
	options.insert(insert_at, value)
	new_options = "\n".join(options)

	_upsert_owned_property_setter(doctype, fieldname, "options", new_options, "Text")
	frappe.clear_cache(doctype=doctype)


def _upsert_owned_property_setter(
	doctype: str,
	fieldname: str,
	property: str,
	value: str,
	property_type: str,
) -> None:
	"""Create a Doc Table-owned Property Setter, or update one we already own.

	Callers must check `_may_write_property_setter` first so foreign setters are never claimed.
	"""
	ps_name = _property_setter_name(doctype, fieldname, property)
	if frappe.db.exists("Property Setter", ps_name):
		if not _is_owned_property_setter(ps_name):
			return
		frappe.db.set_value("Property Setter", ps_name, "value", value, update_modified=False)
		return

	make_property_setter(
		doctype,
		fieldname,
		property,
		value,
		property_type,
		validate_fields_for_doctype=False,
		is_system_generated=True,
	)
	if frappe.db.exists("Property Setter", ps_name) and frappe.db.exists("Module Def", "Doc Table"):
		frappe.db.set_value("Property Setter", ps_name, "module", "Doc Table", update_modified=False)


def _remove_option_value(doctype: str, fieldname: str, value: str) -> None:
	ps_name = _property_setter_name(doctype, fieldname, "options")
	if not frappe.db.exists("Property Setter", ps_name):
		return

	current = frappe.db.get_value("Property Setter", ps_name, ["value", "module"], as_dict=True)
	# Only change setters we created during install - never delete by value alone.
	if current.module != "Doc Table":
		return

	options = (current.value or "").split("\n")
	if value not in options:
		return

	remaining = [opt for opt in options if opt != value]
	new_value = "\n".join(remaining)
	stock_options = (
		frappe.db.get_value("DocField", {"parent": doctype, "fieldname": fieldname}, "options") or ""
	)

	if new_value == stock_options:
		frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
		return

	# Remaining options are site customizations - stop claiming the setter.
	frappe.db.set_value("Property Setter", ps_name, "value", new_value, update_modified=False)
	frappe.db.set_value("Property Setter", ps_name, "module", "", update_modified=False)


def _remove_link_filters_depends_on(doctype: str) -> None:
	ps_name = _property_setter_name(doctype, "link_filters", "depends_on")
	if not frappe.db.exists("Property Setter", ps_name):
		return

	current = frappe.db.get_value("Property Setter", ps_name, ["value", "module"], as_dict=True)
	# Ownership first: a foreign setter that happens to match our value must stay.
	if current.module != "Doc Table":
		return
	if current.value != _LINK_FILTERS_DEPENDS_ON:
		return

	frappe.delete_doc("Property Setter", ps_name, ignore_permissions=True, force=True)
