# List Tooltip - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **List Tooltip**. Operator docs: `docs/en|de/ui-styles/list-tooltip/`. Human README: `list_tooltip/README.md`.

## What it is

Opt-in tooltip preview in Desk list views. Per DocType, a System Manager lists *Header Fields* (label / value rows) and *Body Fields* (one plain-text block, first non-empty field wins). Hovering an info icon in a row shows them.

- Package: `ui_styles.list_tooltip`
- Settings: **List Tooltip Settings** (Single; *Enabled* defaults to `0`)
- Child: **List Tooltip Configuration** (table `configurations` on settings)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** Nothing changes until *Enabled* is on and at least one enabled row exists. No seed rows on install.
2. **Display-only.** Never write business data. The tooltip only renders values the list query already returned (list permissions apply).
3. **No Frappe core edits.** Behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.**

## Code map

| Path | Role |
|------|------|
| `list_tooltip/boot.py` | `extend_bootinfo` - `frappe.boot.list_tooltip.by_doctype`; `split_fields` helper |
| `list_tooltip/doctype/list_tooltip_settings/` | Settings Single; `validate` rejects unknown, Table, layout and virtual fieldnames |
| `list_tooltip/doctype/list_tooltip_configuration/` | Per-DocType child (`reference_doctype`, `enabled`, `header_fields`, `body_fields`, `body_max_lines`) |
| `public/list_tooltip/list_tooltip.js` | Patches `frappe.views.ListView.prototype` (`set_fields`, `render_list`) |
| `public/list_tooltip/list_tooltip.css` | `.list-tooltip-btn`, `.list-tooltip-popover` |
| `docs/en|de/ui-styles/list-tooltip/` | Compendium |

Whitelist: none. Bootinfo drives client behaviour; it is only set when enabled and at least one row is enabled. First enabled row per DocType wins.

## Client contract

- The prototype is patched instead of `frappe.listview_settings[doctype]` because a DocType's own list JS can replace that object after load.
- `set_fields` appends configured fields to a per-list copy of `settings.add_fields`; `render_list` adds the icon after `.select-like` in each `.list-subject`, matching rows to `listview.data` by index.
- Header values go through `frappe.format`, then are reduced to text and escaped. Body text is HTML-stripped, escaped and cut at *Body Max Lines*.
- JS namespace: `ui_styles.list_tooltip`.

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
