# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import ui_styles.desk_background.uninstall
import ui_styles.doc_table.uninstall


def before_uninstall():
	# doc_table:
	ui_styles.doc_table.uninstall.before_uninstall()
	# desk_background:
	ui_styles.desk_background.uninstall.before_uninstall()
