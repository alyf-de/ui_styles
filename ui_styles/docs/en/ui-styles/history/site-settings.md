---
title: Site settings
order: 20
roles:
  - System Manager
---

# Site settings

Open **History Settings** from the **UI Styles** workspace (System Manager).

| Field | fieldname | Purpose |
| --- | --- | --- |
| *Enabled* | `enabled` | Master switch. When off, the navbar has no History button. Default after install: off. |
| *Max Entries* | `max_entries` | How many distinct recent pages the menu shows. Default: `10`. 50 is the maximum when no filter is set. |

The menu is read-only. It does not add or remove **Route History** rows. Only the signed-in user's pages are listed.

Saving **History Settings** clears cache. Hard-refresh Desk to apply changes.
