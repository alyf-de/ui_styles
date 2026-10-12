---
title: Site settings
order: 20
roles:
  - System Manager
---

# Seiteneinstellungen

Öffnen Sie **Listen-Tooltip Einstellungen** über den Arbeitsbereich **UI Styles** (System-Manager).

## Aktiviert

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *Aktiviert* | `enabled` | Hauptschalter. Ist er aus, zeigt keine Liste einen Feld-Tooltip oder eine Kommentarvorschau, egal welche anderen Optionen gesetzt sind. Standard nach Installation: aus. |
| *Kommentarvorschau* | `comment_preview` | Wenn an (und *Aktiviert* an ist), zeigt das Überfahren der Kommentaranzahl in jeder Liste den neuesten **Kommentar** oder die neueste **Kommunikation** zu dieser Zeile. Standard: aus. |

## Konfigurationen

Die Tabelle *Konfigurationen* (`configurations`) verwendet das Kind-DocType **Listen-Tooltip Konfiguration**. Legen Sie pro **DocType** eine Zeile an. Kommt ein **DocType** mehrfach vor, wird die erste aktivierte Zeile verwendet.

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *DocType* | `reference_doctype` | Listenansicht, die den Feld-Tooltip erhält. |
| *Aktiviert* | `enabled` | Einzelne Zeile ein- oder ausschalten, ohne sie zu löschen. Standard: an. |
| *Kopfzeilenfelder* | `header_fields` | Kommagetrennte Feldnamen, z. B. `status, priority`. Werden als Zeilen aus Bezeichnung und Wert angezeigt. Werte werden wie in der Liste formatiert (Datum, Währung, Link usw.); leere Werte zeigen einen Strich. |
| *Textfelder* | `body_fields` | Kommagetrennte Feldnamen, z. B. `text_content, content`. Das erste Feld mit Inhalt wird unter der Kopfzeile als reiner Text angezeigt (HTML wird entfernt). |
| *Max. Textzeilen* | `body_max_lines` | Längerer Text wird nach dieser Zeilenzahl abgeschnitten und endet mit einem Auslassungszeichen. Standard: `20`. |

Feldnamen werden beim Speichern geprüft. Standardfelder wie `owner` oder `modified` sind erlaubt. Unbekannte Feldnamen, Tabellenfelder, Layoutfelder (Abschnittswechsel und ähnliche) und virtuelle Felder werden abgelehnt.

## Verhalten

**Feld-Tooltip:** In jeder Zeile einer konfigurierten Liste erscheint ein Info-Symbol nach dem Kontrollkästchen in der ersten Spalte. Beim Überfahren werden die konfigurierten Felder des Dokuments angezeigt. Die Werte kommen aus der Listenabfrage, daher gelten die Listenberechtigungen.

**Kommentarvorschau:** Beim Überfahren der Kommentaranzahl wird der neueste Benutzer-**Kommentar** (`comment_type` "Comment") oder die neueste **Kommunikation** (`communication_type` "Communication") zur Zeile geladen. Leserecht auf das Listendokument ist erforderlich; das Popover nutzt dieselbe Layout-Familie wie der Feld-Tooltip.

Beim Speichern von **Listen-Tooltip Einstellungen** wird der Cache geleert. Desk hart neu laden, um Änderungen anzuwenden.
