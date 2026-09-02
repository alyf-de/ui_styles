# List Scroll - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **List Scroll**. Operator docs: `docs/en|de/ui-styles/list-scroll/`. Human README: `list_scroll/README.md`.

## What it is

Opt-in dense Desk list layout: content-sized columns and one shared horizontal scrollbar in the list header that pans all row column tracks. Optional sticky column header and floating paging bar.

- Package: `ui_styles.list_scroll`
- Settings: **List Scroll Settings** (Single; all checks default **off**)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** *Dense List Layout* defaults to off. Installing the app must not change list layout until a System Manager enables it.
2. **Display-only.** Never create, update, or delete business data at runtime except settings Single saves. Client JS may rearrange DOM for presentation only.
3. **No Frappe core edits.** All behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.** Prefer ORM / Query Builder if querying.

## Code map

| Path | Role |
|------|------|
| `list_scroll/boot.py` | `extend_bootinfo` - `frappe.boot.list_scroll.*` flags |
| `list_scroll/doctype/list_scroll_settings/` | Settings Single |
| `public/list_scroll/list_layout.css` | Styles gated by `html.list-layout-dense` (+ sticky / floating classes) |
| `public/list_scroll/list_scroll_sync.js` | Dense gate, measure / pan, observer; orchestrates sticky / floating via `ui_styles.list_scroll` |
| `public/list_scroll/sticky_header.js` | Sticky column header; early-return unless sticky is on |
| `public/list_scroll/floating_paging.js` | Floating paging bar; early-return unless floating is on |
| `docs/en|de/ui-styles/list-scroll/` | Compendium |

Whitelist: none. Bootinfo drives client behaviour. Sticky and floating boot flags are forced to 0 when dense is off.

Load order in `hooks.py`: `list_scroll_sync.js` → `sticky_header.js` → `floating_paging.js`.

## Client contract

- Boot: `frappe.boot.list_scroll.dense_list_layout` / `sticky_list_header` / `floating_list_paging` (latter two only when dense is on)
- DOM gate classes on `<html>`: `list-layout-dense`, `list-sticky-header`, `list-floating-paging`
- JS namespace: `ui_styles.list_scroll` (`with_dom_mutation`, optional sticky/floating methods)

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
