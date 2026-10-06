---
title: "Example: Communication"
order: 30
roles:
  - System Manager
---

# Example: Communication

An email-style preview for the **Communication** list: sender, recipients and status in the header, the message in the body.

On **List Tooltip Settings**, turn on *Enabled* and add one row to *Configurations*:

| Field | Value |
| --- | --- |
| *DocType* | "Communication" |
| *Header Fields* | `sender_full_name, recipients, sent_or_received, status, reference_doctype, reference_name` |
| *Body Fields* | `text_content, content` |
| *Body Max Lines* | `20` |

`text_content` is the plain-text version Frappe keeps for each message; `content` is the HTML version and is used when `text_content` is empty. Save, hard-refresh Desk, open the **Communication** list and hover the info icon.
