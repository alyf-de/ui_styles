# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import ui_styles.desk_background.install
import ui_styles.doc_table.install


def after_install():
	# doc_table:
	ui_styles.doc_table.install.after_install()
	# desk_background:
	ui_styles.desk_background.install.after_install()
