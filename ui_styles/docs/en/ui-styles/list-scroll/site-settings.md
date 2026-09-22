---
title: Site settings
order: 20
roles:
  - System Manager
---

# Site settings

Open **List Scroll Settings** from the **UI Styles** workspace (System Manager).

## Defaults

| Field | fieldname | Purpose |
| --- | --- | --- |
| *Dense List Layout* | `dense_list_layout` | Master switch for lists that have no DocType override. Compact columns with a shared horizontal scrollbar in the list header. Default after install: off. |
| *Sticky List Header* | `sticky_list_header` | Keep the list column header visible just under the page head while scrolling. Only shown when dense layout is on. Default: off. |
| *Floating List Paging* | `floating_list_paging` | Pin the list paging bar to the bottom of the window so it floats over the rows. Only shown when dense layout is on. Default: off. |
| *Sticky Columns* | `sticky_columns` | Number of leading list columns that stay fixed while the rest scroll horizontally (subject / ID is usually the first column). Default: `0`. |

## DocType Overrides

Table *DocType Overrides* (`doctype_overrides`) uses child **List Scroll DocType Setting**. When a **DocType** has a row here, that row **fully replaces** the Defaults for its list view (dense, sticky header, floating paging, and sticky columns). DocTypes without a row keep the Defaults.

| Field | fieldname | Purpose |
| --- | --- | --- |
| *DocType* | `reference_doctype` | List view this row applies to. Each **DocType** may appear only once. |
| *Dense List Layout* | `dense_list_layout` | Enable or disable dense layout for this **DocType**. |
| *Sticky List Header* | `sticky_list_header` | Sticky header for this list when dense is on. |
| *Floating List Paging* | `floating_list_paging` | Floating paging for this list when dense is on. |
| *Sticky Columns* | `sticky_columns` | Leading fixed columns for this list when dense is on. |

## Behaviour when dense layout is on

Desk list views keep columns at content width, show a thin scrollbar under the header labels when columns overflow, and sync horizontal pan across header and rows. With sticky header enabled, the column header stays just under the page head (tracking its tuck/untuck). With floating paging enabled, the paging bar stays fixed over the list at the natural bottom inset. With sticky columns greater than `0`, the first N visible columns stay in place while later columns pan.

Saving **List Scroll Settings** clears cache. Hard-refresh Desk to apply changes.
