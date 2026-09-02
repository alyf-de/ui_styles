# Desk Background - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **Desk Background**. Operator docs: `docs/en|de/ui-styles/desk-background/`. Human README: `desk_background/README.md`.

## What it is

Opt-in Desk background tint with curated colour presets. Site-wide defaults on **Desk Background Settings**; optional personal *Desk Colour* on **User** when allowed.

- Package: `ui_styles.desk_background`
- Settings: **Desk Background Settings** (Single, default **disabled**)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** `enabled` defaults to off. Installing the app must not change Desk colours until a System Manager enables the feature and picks a non-**Standard** preset.
2. **Display-only.** Never create, update, or delete business data at runtime except install configuration (Custom Fields, settings Single) and explicit reset actions on **Desk Background Settings**.
3. **No Frappe core edits.** All behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.** Use Query Builder (`frappe.qb`) for bulk User field clears.

## Code map

| Path | Role |
|------|------|
| `desk_background/presets.py` | Colour tokens, contrast helpers (tests) |
| `desk_background/boot.py` | `extend_bootinfo`, preset resolution |
| `desk_background/user.py` | **User** validate hook |
| `desk_background/install.py` / `uninstall.py` | Custom Fields on **User** |
| `desk_background/doctype/desk_background_settings/` | Settings Single |
| `desk_background/user_form.js` | Show/hide personal colour fields |
| `public/desk_background/desk_background.js` | Apply CSS variables from boot tokens |
| `desk_background/test_*.py` | Preset contrast + resolution unit tests |
| `docs/en|de/ui-styles/desk-background/` | Compendium |

Whitelist: none. Bootinfo drives client behaviour.

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
