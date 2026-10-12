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
| *Enabled* | `enabled` | Master switch. When off, no list shows a field tooltip or comment preview, whatever the other options contain. Default after install: off. |
| *Comment Preview* | `comment_preview` | When on (and *Enabled* is on), hovering the comment count in any list shows the latest **Comment** or **Communication** for that row. Default: off. |

## Configurations

Table *Configurations* (`configurations`) uses child **List Tooltip Configuration**. Add one row per **DocType**. If a **DocType** appears more than once, the first enabled row is used.

| Field | fieldname | Purpose |
| --- | --- | --- |
| *DocType* | `reference_doctype` | List view that gets the field tooltip. |
| *Enabled* | `enabled` | Turn a single row on or off without deleting it. Default: on. |
| *Header Fields* | `header_fields` | Comma-separated fieldnames, e.g. `status, priority`. Shown as label / value rows. Values are formatted like in the list (dates, currency, Link and so on); empty values show a dash. |
| *Body Fields* | `body_fields` | Comma-separated fieldnames, e.g. `text_content, content`. The first field with content is shown below the header as plain text (HTML is stripped). |
| *Body Max Lines* | `body_max_lines` | Longer body text is cut after this many lines and ends with an ellipsis. Default: `20`. |

Fieldnames are checked when you save. Standard fields such as `owner` or `modified` are allowed. Unknown fieldnames, Table fields, layout fields (Section Break and similar) and virtual fields are rejected.

## Behaviour

**Field tooltip:** An info icon appears after the checkbox in the first column of each row of a configured list. Hovering it shows configured fields of that document. Values come from the list query, so list permissions apply.

**Comment preview:** Hovering the comment count fetches the latest user **Comment** (`comment_type` "Comment") or **Communication** (`communication_type` "Communication") linked to the row. Read permission on the list document is required; the popover uses the same layout family as the field tooltip.

Saving **List Tooltip Settings** clears cache. Hard-refresh Desk to apply changes.
