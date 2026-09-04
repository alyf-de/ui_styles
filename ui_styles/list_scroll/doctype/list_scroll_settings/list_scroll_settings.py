# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class ListScrollSettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from ui_styles.list_scroll.doctype.list_scroll_doctype_setting.list_scroll_doctype_setting import (
			ListScrollDocTypeSetting,
		)

		dense_list_layout: DF.Check
		doctype_overrides: DF.Table[ListScrollDocTypeSetting]
		floating_list_paging: DF.Check
		sticky_columns: DF.Int
		sticky_list_header: DF.Check
	# end: auto-generated types

	def validate(self):
		self._normalize_flags(self)
		seen = set()
		for row in self.doctype_overrides or []:
			self._normalize_flags(row)
			if not row.reference_doctype:
				continue
			if row.reference_doctype in seen:
				frappe.throw(
					_("DocType {0} is listed more than once in DocType Overrides.").format(
						row.reference_doctype
					),
					title=_("Duplicate DocType"),
				)
			seen.add(row.reference_doctype)

	@staticmethod
	def _normalize_flags(row):
		sticky_columns = cint(row.sticky_columns)
		if sticky_columns < 0:
			frappe.throw(_("Sticky Columns cannot be negative."), title=_("Invalid Value"))
		row.sticky_columns = sticky_columns
		if not cint(row.dense_list_layout):
			row.sticky_list_header = 0
			row.floating_list_paging = 0
			row.sticky_columns = 0

	def on_update(self):
		frappe.clear_cache()
		frappe.msgprint(
			_("Reload the Desk (hard refresh) to apply List Scroll Settings changes."),
			indicator="blue",
			alert=True,
		)
