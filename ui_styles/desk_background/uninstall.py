# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe

from ui_styles.desk_background.install import USER_CUSTOM_FIELD, USER_INTENSITY_FIELD


def before_uninstall() -> None:
	for fieldname in (USER_CUSTOM_FIELD, USER_INTENSITY_FIELD):
		name = frappe.db.get_value("Custom Field", {"dt": "User", "fieldname": fieldname})
		if name:
			frappe.delete_doc("Custom Field", name, ignore_permissions=True, force=True)
