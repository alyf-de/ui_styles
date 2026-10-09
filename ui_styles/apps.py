import frappe


def has_app_permission() -> bool:
	"""Only System Managers can change the settings this app offers."""
	return "System Manager" in frappe.get_roles()
