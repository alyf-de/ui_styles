# List Tooltip - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **List Tooltip**. Operator docs: `docs/en|de/ui-styles/list-tooltip/`. Human README: `list_tooltip/README.md`.

## What it is

Opt-in tooltip preview in Desk list views:

1. Per DocType field tooltip: *Header Fields* (label / value rows) and *Body Fields* (one plain-text block, first non-empty field wins). Hovering an info icon in a row shows them.
2. Optional *Comment Preview*: hovering the list comment count shows the latest **Comment** or **Communication** for that row (server fetch, read-only).

- Package: `ui_styles.list_tooltip`
- Settings: **List Tooltip Settings** (Single; *Enabled* defaults to `0`; *Comment Preview* defaults to `0`)
- Child: **List Tooltip Configuration** (table `configurations` on settings)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** Nothing changes until *Enabled* is on and either at least one enabled configuration row exists or *Comment Preview* is on. No seed rows on install.
2. **Display-only.** Never write business data. Field tooltips only render values the list query already returned. Comment preview only reads **Comment** / **Communication** after a read check on the list document.
3. **No Frappe core edits.** Behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.**

## Code map

| Path | Role |
|------|------|
| `list_tooltip/boot.py` | `extend_bootinfo` - `frappe.boot.list_tooltip` (`by_doctype`, `comment_preview`); `split_fields` helper |
| `list_tooltip/api.py` | Whitelisted `get_last_thread_preview` for comment-count hover |
| `list_tooltip/doctype/list_tooltip_settings/` | Settings Single; `validate` rejects unknown, Table, layout and virtual fieldnames |
| `list_tooltip/doctype/list_tooltip_configuration/` | Per-DocType child (`reference_doctype`, `enabled`, `header_fields`, `body_fields`, `body_max_lines`) |
| `public/list_tooltip/list_tooltip.js` | Field tooltips (patches `ListView.prototype`) + optional comment-count hover |
| `public/list_tooltip/list_tooltip.css` | `.list-tooltip-btn`, `.list-tooltip-popover`, thread variant |
| `docs/en|de/ui-styles/list-tooltip/` | Compendium |

Whitelist: `ui_styles.list_tooltip.api.get_last_thread_preview`. Bootinfo drives client behaviour; it is only set when enabled and (`by_doctype` non-empty or `comment_preview`). First enabled configuration row per DocType wins.

## Client contract

- The prototype is patched instead of `frappe.listview_settings[doctype]` because a DocType's own list JS can replace that object after load.
- `set_fields` appends configured fields to a per-list copy of `settings.add_fields`; `render_list` adds the icon after `.select-like` in each `.list-subject`, matching rows to `listview.data` by index.
- Header values go through `frappe.format`, then are reduced to text and escaped. Body text is HTML-stripped, escaped and cut at *Body Max Lines*.
- Comment preview reuses the same popover element with class `list-tooltip-popover--thread` for meta / body layout.
- JS namespace: `ui_styles.list_tooltip`.

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
