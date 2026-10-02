# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model import no_value_fields
from frappe.model.document import Document

from ui_styles.list_tooltip.boot import split_fields

# Standard columns that the list query returns and the client can label.
STANDARD_FIELDS = ("name", "owner", "creation", "modified", "modified_by", "docstatus", "idx")


class ListTooltipSettings(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from ui_styles.list_tooltip.doctype.list_tooltip_configuration.list_tooltip_configuration import (
			ListTooltipConfiguration,
		)

		configurations: DF.Table[ListTooltipConfiguration]
		enabled: DF.Check
	# end: auto-generated types

	def validate(self):
		for row in self.configurations:
			# Rows without a DocType are caught by the mandatory check after validate.
			if not row.reference_doctype:
				continue

			if row.body_max_lines is not None and row.body_max_lines < 1:
				frappe.throw(
					_("Row #{0}: Body Max Lines must be at least 1.").format(row.idx),
					title=_("Invalid Value"),
				)

			meta = frappe.get_meta(row.reference_doctype)
			for fieldname in split_fields(row.header_fields) + split_fields(row.body_fields):
				self.validate_fieldname(row, meta, fieldname)

	def validate_fieldname(self, row, meta, fieldname):
		if fieldname in STANDARD_FIELDS:
			return

		df = meta.get_field(fieldname)
		if not df or df.fieldtype in no_value_fields or df.is_virtual:
			frappe.throw(
				_("Row #{0}: {1} is not a field of {2} that can be shown in a list.").format(
					row.idx, frappe.bold(fieldname), frappe.bold(row.reference_doctype)
				),
				title=_("Invalid Field"),
			)

	def on_update(self):
		frappe.clear_cache()
		frappe.msgprint(
			_("Reload the Desk (hard refresh) to apply List Tooltip Settings changes."),
			indicator="blue",
			alert=True,
		)
