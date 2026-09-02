# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from ui_styles.desk_background.presets import get_intensity_options, get_user_select_options

USER_CUSTOM_FIELD = "desk_color_preset"
USER_INTENSITY_FIELD = "desk_color_intensity"


def after_install():
	create_custom_fields(get_custom_fields())


def get_custom_fields():
	return {
		"User": [
			{
				"fieldname": USER_CUSTOM_FIELD,
				"label": _("Desk Colour"),
				"fieldtype": "Select",
				"insert_after": "desk_theme",
				"hidden": 1,
				"options": get_user_select_options(),
				"description": _("Leave empty to use the site default from Desk Background Settings."),
			},
			{
				"fieldname": USER_INTENSITY_FIELD,
				"label": _("Desk Colour Strength"),
				"fieldtype": "Select",
				"insert_after": USER_CUSTOM_FIELD,
				"hidden": 1,
				"options": get_intensity_options(include_empty=True),
				"description": _(
					"Tint is softer, Strong is more vivid. Leave empty to use the site default."
				),
			},
		]
	}
