# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class ListScrollSettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		dense_list_layout: DF.Check
		floating_list_paging: DF.Check
		sticky_list_header: DF.Check
	# end: auto-generated types

	def on_update(self):
		frappe.clear_cache()
		frappe.msgprint(
			_("Reload the Desk (hard refresh) to apply List Scroll Settings changes."),
			indicator="blue",
			alert=True,
		)
