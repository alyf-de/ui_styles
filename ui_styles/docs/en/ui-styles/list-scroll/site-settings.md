---
title: Site settings
order: 20
roles:
  - System Manager
---

# Site settings

Open **List Scroll Settings** from the **UI Styles** workspace (System Manager).

| Field | fieldname | Purpose |
| --- | --- | --- |
| *Dense List Layout* | `dense_list_layout` | Master switch. Compact columns with a shared horizontal scrollbar in the list header. Default after install: off. |
| *Sticky List Header* | `sticky_list_header` | Keep the list column header visible just under the page head while scrolling. Only shown when dense layout is on. Default: off. |
| *Floating List Paging* | `floating_list_paging` | Pin the list paging bar to the bottom of the window so it floats over the rows. Only shown when dense layout is on. Default: off. |

## Behaviour when dense layout is on

Desk list views keep columns at content width, show a thin scrollbar under the header labels when columns overflow, and sync horizontal pan across header and rows. With sticky header enabled, the column header stays just under the page head (tracking its tuck/untuck). With floating paging enabled, the paging bar stays fixed over the list at the natural bottom inset.

Saving **List Scroll Settings** clears cache. Hard-refresh Desk to apply changes.
