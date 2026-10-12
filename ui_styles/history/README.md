# History

Opt-in clock menu in the Desk navbar. It shows the current user's recently visited Desk pages. Configure it on **History Settings** (UI Styles workspace).

See `docs/en/ui-styles/history/` for the operator guide.

## Development

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```
