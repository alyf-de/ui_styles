---
title: Doc Table
order: 1
roles:
  - System Manager
---

# Doc Table

**Doc Table** is a custom field type that shows a read-only grid of related documents on a form. Unlike *Field Type* "Table", *Options* must be a normal **DocType** - not a child table, Single, or virtual DocType.

## When to use it

Use **Doc Table** when you want to browse documents that link back to the current record (for example **Sales Invoice** rows for a **Customer**) without copying them into a child table.

For editable line items that belong to the parent, keep using *Field Type* "Table" with a child DocType.

## Setup

1. Open **Customize Form** for the parent DocType (or edit the DocType in developer mode).
2. Add a field.
3. Set *Field Type* to "Doc Table".
4. Set *Options* (keyworded lines, any order):

```text
doctype: Sales Invoice
link: customer
columns: name, posting_date, grand_total, status
order_by: posting_date desc
page_size: 20
page_size_max: 100
visible_rows: 5
pagination: none
```

- `doctype:` - related **DocType** (required).
- `link:` - Link *fieldname* on that DocType pointing at the parent (optional). If omitted, the field uses the single matching Link field. If several Links point at the parent, set `link:` explicitly. Use `link: none` to skip parent linking and filter only with field *Filters*.
- `columns:` - comma-separated *fieldnames*. If omitted, list-view fields of the related DocType are used.
- `order_by:` - same syntax as Frappe `get_list` / `order_by`. Default is `modified desc`.
- `page_size:` - rows per *Load More* fetch when `pagination` is `none` (default 20). Must not exceed `page_size_max`.
- `page_size_max:` - ceiling for `page_size` (default 100, hard maximum 500).
- `visible_rows:` - how many rows the grid body shows; with `pagination: pages`, also the prev/next step size (default 5).
- `pagination:` - `none` (default when omitted) keeps *Load More* and scrolling; `pages` uses previous/next icons and replaces rows in steps of `visible_rows`.

Example without a parent Link (filter only via *Filters*):

```text
doctype: ToDo
link: none
columns: status, description
order_by: modified desc
```

Example with page navigation:

```text
doctype: Sales Invoice
link: customer
page_size: 20
visible_rows: 5
pagination: pages
```

5. Optionally set *Filters* (same JSON *Filters* as on **Link** fields) to further restrict rows. With `link: none`, *Filters* are the only row restriction.
6. Save and reload the form.

In **DocType** / **Customize Form** Form Builder, **Doc Table** shows a table preview with the field label and actions (add, filters, duplicate, remove).

## Field type missing from the list

During install or migrate, **UI Styles** adds "Doc Table" to the *Field Type* Select on **Custom Field** and **Customize Form Field** using a Property Setter.

If your site already has a **Property Setter** on `fieldtype` / `options` for one of those DocTypes (from another app or a manual change), **UI Styles** will not overwrite it. When that setter's option list omits "Doc Table", the type will not appear in those Select fields.

**What still works:** **DocType** and **Customize Form** Form Builder load field types from Desk JS, so "Doc Table" appears there even when the Property Setter was skipped.

**Manual fix:**

1. Open the **Property Setter** list and find `Custom Field-fieldtype-options` or `Customize Form Field-fieldtype-options`.
2. Edit *Value* and add `Doc Table` on its own line.
3. Save and clear cache.

If the foreign setter is obsolete, delete it and run `bench --site <site> migrate` so **UI Styles** can create its own setter.

The same rule applies to the *Filters* button on **Custom Field** (`link_filters` `depends_on`): a pre-existing foreign Property Setter is left unchanged.

## On the form

After the parent document is saved, the field loads matching rows. With `pagination` `none` or omitted, rows load in batches of `page_size` (default 20) via *Load More*; the grid shows about `visible_rows` (default 5) and scrolls under a fixed column header. With `pagination: pages`, each previous/next step fetches `visible_rows` rows and replaces the grid. Icon buttons on the right of the field label (Add, Refresh, Open List) let you:

- Add a related document with the Link field prefilled
- Refresh the grid (resets to the first page when using `pages`)
- Open List with the same Link and *Filters*
- Open a row (link on *ID* when listed, otherwise on the first column; also on the title field when *ID* is shown)
- *Load More* or previous/next, depending on `pagination`

## Who can see this page

System Managers configure **Doc Table** fields. Everyone who can open the parent form sees the grid if they also have read permission on the related DocType.
