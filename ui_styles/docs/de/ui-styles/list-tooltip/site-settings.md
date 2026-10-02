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
| *Aktiviert* | `enabled` | Hauptschalter. Ist er aus, zeigt keine Liste einen Tooltip, egal was in der Tabelle steht. Standard nach Installation: aus. |

## Konfigurationen

Die Tabelle *Konfigurationen* (`configurations`) verwendet das Kind-DocType **Listen-Tooltip Konfiguration**. Legen Sie pro **DocType** eine Zeile an. Kommt ein **DocType** mehrfach vor, wird die erste aktivierte Zeile verwendet.

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *DocType* | `reference_doctype` | Listenansicht, die den Tooltip erhält. |
| *Aktiviert* | `enabled` | Einzelne Zeile ein- oder ausschalten, ohne sie zu löschen. Standard: an. |
| *Kopfzeilenfelder* | `header_fields` | Kommagetrennte Feldnamen, z. B. `status, priority`. Werden als Zeilen aus Bezeichnung und Wert angezeigt. Werte werden wie in der Liste formatiert (Datum, Währung, Link usw.); leere Werte zeigen einen Strich. |
| *Textfelder* | `body_fields` | Kommagetrennte Feldnamen, z. B. `text_content, content`. Das erste Feld mit Inhalt wird unter der Kopfzeile als reiner Text angezeigt (HTML wird entfernt). |
| *Max. Textzeilen* | `body_max_lines` | Längerer Text wird nach dieser Zeilenzahl abgeschnitten und endet mit einem Auslassungszeichen. Standard: `20`. |

Feldnamen werden beim Speichern geprüft. Standardfelder wie `owner` oder `modified` sind erlaubt. Unbekannte Feldnamen, Tabellenfelder, Layoutfelder (Abschnittswechsel und ähnliche) und virtuelle Felder werden abgelehnt.

## Verhalten

In jeder Zeile einer konfigurierten Liste erscheint ein Info-Symbol nach dem Kontrollkästchen in der ersten Spalte. Beim Überfahren wird der Tooltip neben dem Symbol angezeigt; er verschwindet, sobald der Mauszeiger das Symbol verlässt. Der Tooltip ist schreibgeschützt und zeigt nur Werte, die die Liste bereits geladen hat, daher gelten die Listenberechtigungen. Die konfigurierten Felder werden automatisch zur Listenabfrage hinzugefügt.

Beim Speichern von **Listen-Tooltip Einstellungen** wird der Cache geleert. Desk hart neu laden, um Änderungen anzuwenden.
