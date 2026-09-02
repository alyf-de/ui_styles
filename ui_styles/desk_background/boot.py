# Copyright (c) 2026, ALYF GmbH and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.utils import cint

from ui_styles.desk_background.presets import (
	DEFAULT_INTENSITY,
	DEFAULT_PRESET,
	STANDARD,
	get_intensity_tokens,
	normalize_intensity,
)

SETTINGS_DOCTYPE = "Desk Background Settings"


def get_site_settings() -> dict:
	if not frappe.db.exists("DocType", SETTINGS_DOCTYPE):
		return _default_settings()

	return frappe.get_single(SETTINGS_DOCTYPE).as_dict()


def _default_settings() -> dict:
	return {
		"enabled": 0,
		"site_color_preset": DEFAULT_PRESET,
		"site_color_intensity": DEFAULT_INTENSITY,
		"allow_user_color": 0,
	}


def feature_enabled(settings: dict | None = None) -> bool:
	settings = settings or get_site_settings()
	return bool(cint(settings.get("enabled")))


def allow_user_color_enabled(settings: dict | None = None) -> bool:
	settings = settings or get_site_settings()
	return feature_enabled(settings) and bool(cint(settings.get("allow_user_color")))


def resolve_preset_from_settings(
	site_preset: str | None,
	allow_user_color: bool | int,
	user_preset: str | None,
) -> str | None:
	site_preset = site_preset or DEFAULT_PRESET

	if cint(allow_user_color) and user_preset:
		return user_preset

	if site_preset == STANDARD:
		return None

	return site_preset


def resolve_intensity_from_settings(
	site_intensity: str | None,
	allow_user_color: bool | int,
	user_intensity: str | None,
) -> str:
	if cint(allow_user_color) and user_intensity:
		return normalize_intensity(user_intensity)
	return normalize_intensity(site_intensity)


def resolve_preset(user: str | None = None) -> str | None:
	settings = get_site_settings()
	if not feature_enabled(settings):
		return None

	site_preset = settings.get("site_color_preset") or DEFAULT_PRESET
	user_preset = None

	if user and allow_user_color_enabled(settings):
		user_preset = frappe.db.get_value("User", user, "desk_color_preset")

	return resolve_preset_from_settings(site_preset, settings.get("allow_user_color"), user_preset)


def resolve_intensity(user: str | None = None) -> str:
	settings = get_site_settings()
	site_intensity = settings.get("site_color_intensity") or DEFAULT_INTENSITY
	user_intensity = None

	if user and allow_user_color_enabled(settings):
		user_intensity = frappe.db.get_value("User", user, "desk_color_intensity")

	return resolve_intensity_from_settings(site_intensity, settings.get("allow_user_color"), user_intensity)


def extend_bootinfo(bootinfo):
	user = frappe.session.user
	if user == "Guest":
		return

	settings = get_site_settings()
	enabled = feature_enabled(settings)
	user_preset = ""
	user_intensity = ""
	if allow_user_color_enabled(settings):
		row = (
			frappe.db.get_value(
				"User",
				user,
				["desk_color_preset", "desk_color_intensity"],
				as_dict=True,
			)
			or {}
		)
		user_preset = row.get("desk_color_preset") or ""
		user_intensity = row.get("desk_color_intensity") or ""

	effective_preset = resolve_preset(user) if enabled else None
	effective_intensity = resolve_intensity(user) if enabled else DEFAULT_INTENSITY
	tokens = get_intensity_tokens(effective_preset, effective_intensity) if enabled else None
	bootinfo.desk_background = {
		"enabled": cint(enabled),
		"effective_preset": effective_preset,
		"effective_intensity": effective_intensity,
		"tokens": tokens,
		"allow_user_color": cint(settings.get("allow_user_color")) if enabled else 0,
		"site_preset": settings.get("site_color_preset") or DEFAULT_PRESET,
		"site_intensity": normalize_intensity(settings.get("site_color_intensity")),
		"user_preset": user_preset,
		"user_intensity": user_intensity,
	}
