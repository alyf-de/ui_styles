# List Tooltip

Opt-in hover preview for Desk list views. An info icon in the first column of a row shows a tooltip with configured fields of that document, so users can read a summary without opening it. Configure the DocTypes on **List Tooltip Settings** (UI Styles workspace).

See `docs/en/ui-styles/list-tooltip/` for operator guides.

## Development

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```
