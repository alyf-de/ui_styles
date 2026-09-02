# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

"""Doc Table: form fieldtype that lists related documents of a real DocType."""

FIELDTYPE = "Doc Table"

# DocTypes whose fieldtype Select options must include FIELDTYPE.
# Note: DocField is a Meta.special_doctypes entry - Property Setters on it are
# ignored. Form Builder uses frappe.model.all_fieldtypes (patched in JS) instead.
FIELDTYPE_OPTION_DOCTYPES = (
	"Custom Field",
	"Customize Form Field",
)
