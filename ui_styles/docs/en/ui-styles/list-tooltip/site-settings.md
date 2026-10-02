---
title: Site settings
order: 20
roles:
  - System Manager
---

# Site settings

Open **List Tooltip Settings** from the **UI Styles** workspace (System Manager).

## Enabled

| Field | fieldname | Purpose |
| --- | --- | --- |
| *Enabled* | `enabled` | Master switch. When off, no list shows a tooltip, whatever the table contains. Default after install: off. |

## Configurations

Table *Configurations* (`configurations`) uses child **List Tooltip Configuration**. Add one row per **DocType**. If a **DocType** appears more than once, the first enabled row is used.

| Field | fieldname | Purpose |
| --- | --- | --- |
| *DocType* | `reference_doctype` | List view that gets the tooltip. |
| *Enabled* | `enabled` | Turn a single row on or off without deleting it. Default: on. |
| *Header Fields* | `header_fields` | Comma-separated fieldnames, e.g. `status, priority`. Shown as label / value rows. Values are formatted like in the list (dates, currency, Link and so on); empty values show a dash. |
| *Body Fields* | `body_fields` | Comma-separated fieldnames, e.g. `text_content, content`. The first field with content is shown below the header as plain text (HTML is stripped). |
| *Body Max Lines* | `body_max_lines` | Longer body text is cut after this many lines and ends with an ellipsis. Default: `20`. |

Fieldnames are checked when you save. Standard fields such as `owner` or `modified` are allowed. Unknown fieldnames, Table fields, layout fields (Section Break and similar) and virtual fields are rejected.

## Behaviour

An info icon appears after the checkbox in the first column of each row of a configured list. Hovering it shows the tooltip next to the icon; moving the pointer away hides it. The tooltip is read-only and only shows values the list already loaded, so list permissions apply. The configured fields are added to the list query automatically.

Saving **List Tooltip Settings** clears cache. Hard-refresh Desk to apply changes.
