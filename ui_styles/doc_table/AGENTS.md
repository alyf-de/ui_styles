# Doc Table - agent brief

Read the app brief [`../../AGENTS.md`](../../AGENTS.md) for module isolation and shared-file markers. Read this before changing **Doc Table**. Operator docs: `docs/en|de/ui-styles/doc-table/`. Human README: `doc_table/README.md`.

## What it is

Custom Frappe **fieldtype** `Doc Table` (`ui_styles`) that shows a **read-only** Desk grid of related **real** DocTypes on a parent form (not child tables, Singles, or virtual DocTypes). Same idea as **Table**, but *Options* points at a normal DocType and rows come from `frappe.get_list`.

- Package: `ui_styles.doc_table`
- Control: `frappe.ui.form.ControlDocTable`
- App: `ui_styles`

## Hard constraints

1. **Do not edit Frappe core.** Stay in `ui_styles` only. Form Builder preview must be app-side (`form_builder_preview.js`), never patch `Field.vue` / core Form Builder permanently.
2. **Display-only - never modify or save data.** Doc Table is a pure presentation layer: it reads related docs and renders a grid. Do not write to parent or target documents, child tables, or custom fields at runtime. No save hooks, no client `frm.set_value`, no server-side inserts/updates/deletes triggered by the control. Configuration (Options, Filters, Property Setters) is fine; user-facing behaviour must stay read-only.
3. Fields are **display-only** via `no_value_fields` / `display_fieldtypes`. **Do not set `is_virtual`** - it forces Read and hides empty fields (unlike HTML).
4. Python Options changes need **bench restart** (or web worker reload). `bench build` only refreshes JS/CSS.
5. ASCII hyphens only in Python strings/docs (`-`, not en/em dash).
6. **No raw SQL.** Do not use `frappe.db.sql` or string-built queries. Prefer Frappe Query Builder (`frappe.qb`). For permission-aware list/count, use `frappe.get_list` (not a raw `DatabaseQuery` + `frappe.db.sql` subquery wrap).

## Options format (`parse.py`)

Newline-separated, **always keyworded**, any order:

| Line | Meaning |
|------|---------|
| `doctype: Sales Invoice` | Target DocType (**required**) |
| `link: customer` | Explicit Link fieldname on target → parent |
| `link: none` | No parent Link filter; only field *Filters* (`link_filters`) |
| `columns: name, posting_date` | Columns |
| `order_by: posting_date desc` | Same syntax as `frappe.get_list` / `order_by` (default `modified desc`) |
| `page_size: 20` | Rows per Load More fetch when `pagination` is `none` (default 20) |
| `page_size_max: 100` | Ceiling for `page_size` (default 100, hard max 500) |
| `visible_rows: 5` | Grid viewport height; also prev/next step size when `pagination: pages` (default 5, max 50) |
| `pagination: none` | Load More + scroll (default when omitted) |
| `pagination: pages` | Prev/next icons; each page fetches/steps by `visible_rows` |

Omit `link:` → auto-detect only when **exactly one** Link on target has *Options* = parent DocType.  
Multiple candidates → must set `link: fieldname` (validated on save and at query time).  
`link: none` without Filters → all readable docs of that type (often looks "wrong" on Customer forms).

No bare lines (DocType / fieldname / CSV alone). NamedTuple: `DocTableOptions(doctype, link_fieldname, columns, skip_parent_link, order_by, page_size, page_size_max, visible_rows, pagination)`.

## Code map

| Path | Role |
|------|------|
| `doc_table/parse.py` | Options parse, link resolve, column/`order_by` validate |
| `doc_table/api.py` | `get_doc_table_data` + DocType/Custom Field/Customize Form validate hooks |
| `doc_table/register.py` | Patch `no_value_fields` / `display_fieldtypes`; Property Setters for fieldtype options + *Filters* `depends_on` |
| `doc_table/install.py` / `uninstall.py` | Lifecycle |
| `doc_table/test_doc_table.py` | Parse unit tests |
| `public/doc_table/doc_table.js` | `ControlDocTable` (DataTable, paging, toolbar, footer) |
| `public/doc_table/doc_table.css` | form-grid shell + header/scrollbar alignment |
| `public/doc_table/form_builder_preview.js` | Registers `DocTableControl` as DataControl + dummy preview + Filters btn |
| `docs/en|de/ui-styles/doc-table/` | Compendium |
| `hooks.py` | `app_include_*`, validate hooks, `register()` import |
| `patches.txt` | migrate bump calling install |
| `modules.txt` | Module **Doc Table** |

Whitelist: `ui_styles.doc_table.api.get_doc_table_data` (`GET` + `@frappe.read_only()`).  
Args: `parent_doctype`, `parent_name`, `fieldname` (required); optional `limit` (ignored for sizing - Options decide via `page_size` or `visible_rows`), `start`, `extra_filters` (resolved `eval:` values only).  
*Options* / static *Filters* are loaded from the parent field meta - not from the caller.  
Returns: `doctype`, `title_field`, `link_fields`, `columns`, `rows`, `limit`, `start`, `has_more`, `total`, `page_size`, `page_size_max`, `visible_rows`, `pagination`.

## Permissions

- Parent: read on parent doc; Doc Table field must exist and its *permlevel* must be readable.
- Target: read + `get_list(..., ignore_permissions=False)` (user perms, if_owner, share, permission_query).
- Field permlevels: DatabaseQuery strips unreadable SELECT fields (headers may still list them empty).
- Parent field visibility: client `get_field_display_status`; server enforces permlevel on the Doc Table field.

## UI decisions (do not regress)

- Shell: `form-grid-container` > `form-grid` (reuse Desk border/radius). Strip DataTable outer cell borders so they do **not** double the form-grid frame (left/top/right/bottom).
- Header look: match `.grid-heading-row` (`--subtle-fg`, 32px, padding `6px 8px`, `--text-sm` / `--gray-600`). Do **not** add Bootstrap `row` class onto DataTable rows (breaks layout).
- Scrollbar: width = form-grid `innerWidth` (content box). Do not extend `+1px` into the border unless explicitly requested again.
- Refresh: **no flicker** - keep grid; use DataTable `refresh()`; Load More (`pagination: none`) uses `appendRows`; `pagination: pages` replaces rows. Never `$grid.empty()` before fetch when a table is already shown.
- Footer: `none` → `Showing {0} of {1}` + Load More; `pages` → `Showing {0}-{1} of {2}` + prev/next icons (`frappe.utils.icon` left/right). Status `padding-left: 9px` (1px border + 8px cell pad).
- Toolbar icons: Add → Refresh → Open List.
- Columns: do **not** auto-prepend `name` / ID. Include ID only when listed in Options (or when no columns resolve). Row open link: on `name` when present; otherwise on the first column (and on `title_field` when ID is shown). Client row objects must keep API `name` (and currency helpers) even when those columns are hidden.
- Defaults: `page_size` 20 (Load More batch), `visible_rows` 5 (viewport + pages step), `pagination` none. Override via Options.
- `pagination: pages`: if the last page has fewer than `visible_rows` rows, pad with empty placeholder rows so the body height does not collapse.
- Form Builder: DataControl (not TableControl - TableControl calls `getdoctype` with multi-line Options and breaks). No global `get_meta` / `frappe.call` patches; no MutationObserver.

## Filters

Same JSON *Filters* as **Link** (`link_filters`). Client resolves `eval:` and sends values in `extra_filters`. Server rebuilds filters from the field's configured *Filters* and accepts client values only for `eval:` rows. Property Setter extends *Filters* `depends_on` so the button shows for Doc Table.

## Registration gotchas

- **DocField** is Meta special - Property Setters on its fieldtype options are ignored. Desk JS pushes into `frappe.model.all_fieldtypes`.
- Property Setters only for **Custom Field** / **Customize Form Field**. Create only when missing; never overwrite or claim a pre-existing setter (`module` must be **Doc Table**). Uninstall only touches setters we own.
- **Foreign Property Setter limitation:** when **Custom Field** or **Customize Form Field** already has a `fieldtype` / `options` Property Setter we did not create, install/migrate skips adding "Doc Table" rather than clobbering site customizations. **DocType** and **Customize Form** Form Builder are unaffected (Desk JS). Operators must add "Doc Table" to the foreign setter manually or remove it and re-run migrate. Same rule for *Filters* `depends_on`. See Compendium troubleshooting section.
- **`no_value_fields` / `display_fieldtypes` patch (no Frappe hook):** Frappe exposes no hook to register a custom display-only fieldtype. The tuples live in `frappe.model.__init__`; many core modules import them at load time. `register.py` extends those tuples in-process and rebinds stale imports in listed Frappe modules. Semgrep `frappe-monkey-patching-not-allowed` is suppressed on `_patch_python_fieldtype_lists` with `# nosemgrep` - intentional until upstream adds hooks (e.g. `additional_no_value_fields`). Do not switch to `is_virtual` instead.

## Deploy

```bash
bench --site <site> migrate
bench build --app ui_styles
bench --site <site> clear-cache
# restart web workers after Python changes
```

Hard-refresh Desk after build.
