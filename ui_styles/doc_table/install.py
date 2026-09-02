# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from ui_styles.doc_table.register import ensure_fieldtype_options, register


def after_install() -> None:
	register()
	ensure_fieldtype_options()
