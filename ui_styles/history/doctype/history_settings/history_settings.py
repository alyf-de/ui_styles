# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint

from ui_styles.history.boot import MAX_ENTRIES_LIMIT


class HistorySettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		enabled: DF.Check
		max_entries: DF.Int
	# end: auto-generated types

	def validate(self):
		count = cint(self.max_entries)
		if count < 1 or count > MAX_ENTRIES_LIMIT:
			frappe.throw(
				_("Max Entries must be between 1 and {0}.").format(MAX_ENTRIES_LIMIT),
				title=_("Invalid Value"),
			)

	def on_update(self):
		frappe.clear_cache()
		frappe.msgprint(
			_("Reload the Desk (hard refresh) to apply History Settings changes."),
			indicator="blue",
			alert=True,
		)
