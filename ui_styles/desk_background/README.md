# Desk Background

Opt-in Desk background tint for test/staging vs production. System Managers enable it on **Desk Background Settings** (UI Styles workspace).

See `docs/en/ui-styles/desk-background/` for operator guides.

## Development

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
```

Run tests:

```bash
bench --site <site> run-tests --app ui_styles --module ui_styles.desk_background
```
