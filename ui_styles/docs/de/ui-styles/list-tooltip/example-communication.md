---
title: "Example: Communication"
order: 30
roles:
  - System Manager
---

# Beispiel: Kommunikation

Eine E-Mail-artige Vorschau für die Liste **Kommunikation**: Absender, Empfänger und Status in der Kopfzeile, die Nachricht im Text.

Schalten Sie in **Listen-Tooltip Einstellungen** *Aktiviert* ein und fügen Sie der Tabelle *Konfigurationen* eine Zeile hinzu:

| Feld | Wert |
| --- | --- |
| *DocType* | "Communication" |
| *Kopfzeilenfelder* | `sender_full_name, recipients, sent_or_received, status, reference_doctype, reference_name` |
| *Textfelder* | `text_content, content` |
| *Max. Textzeilen* | `20` |

`text_content` ist die Nur-Text-Fassung, die Frappe für jede Nachricht pflegt; `content` ist die HTML-Fassung und wird verwendet, wenn `text_content` leer ist. Speichern, Desk hart neu laden, die Liste **Kommunikation** öffnen und das Info-Symbol überfahren.
