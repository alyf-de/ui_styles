# List Scroll

Opt-in dense Desk list layout with a shared horizontal scrollbar in the list header. Optional sticky header, floating paging, and sticky front columns. Site Defaults plus per-DocType overrides on **List Scroll Settings** (UI Styles workspace).

See `docs/en/ui-styles/list-scroll/` for operator guides.

## Development

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```
