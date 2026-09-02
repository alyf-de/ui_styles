# List Scroll

Opt-in dense Desk list layout with a shared horizontal scrollbar in the list header. System Managers enable it on **List Scroll Settings** (UI Styles workspace).

See `docs/en/ui-styles/list-scroll/` for operator guides.

## Development

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```
