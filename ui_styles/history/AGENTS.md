# History - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **History**. Operator docs: `docs/en|de/ui-styles/history/`. Human README: `history/README.md`.

## What it is

Opt-in clock menu in the Desk navbar. It lists the current user's recently visited Desk pages from Frappe **Route History** and the current browser session.

- Package: `ui_styles.history`
- Settings: **History Settings** (Single; *Enabled* defaults to `0`)
- App: `ui_styles`

## Hard constraints

1. **Opt-in only.** No button until *Enabled* is on. *Max Entries* defaults to `10`.
2. **Display-only.** Never insert, update, or delete **Route History**. The menu only reads the signed-in user's rows.
3. **No Frappe core edits.** Behaviour stays in this module.
4. ASCII hyphens only in Python strings/docs.
5. **No raw SQL.**

## Code map

| Path | Role |
|------|------|
| `history/boot.py` | `extend_bootinfo` - `frappe.boot.history.max_entries` when enabled |
| `history/history.py` | Read-only GET `get_recent`; latest 200 distinct routes for the menu |
| `history/doctype/history_settings/` | Settings Single; `validate` keeps *Max Entries* between 1 and 50 |
| `public/history/history.js` | Navbar clock menu; namespace `ui_styles.history` |
| `public/history/history.css` | `.history-menu-root` and the dropdown |
| `docs/en|de/ui-styles/history/` | Compendium |

`get_recent` reads **Route History** with the query builder, limited to `user = session user`, because **Route History** grants read only to System Manager. It groups by route so repeat visits do not crowd out older pages.

`history.js` owns the filter groups. It drops the current page and hidden groups from that window, then keeps *Max Entries*. Filter changes repaint without another request.

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
