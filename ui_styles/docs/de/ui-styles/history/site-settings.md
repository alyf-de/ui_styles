---
title: Site settings
order: 20
roles:
  - System Manager
---

# Seiteneinstellungen

Öffnen Sie **Verlauf Einstellungen** über den Arbeitsbereich **UI Styles** (System-Manager).

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *Aktiviert* | `enabled` | Hauptschalter. Ist er aus, zeigt die Navigationsleiste kein Verlauf-Symbol. Standard nach Installation: aus. |
| *Max. Einträge* | `max_entries` | Wie viele verschiedene zuletzt besuchte Seiten das Menü zeigt. Standard: `10`. 50 ist das Maximum, wenn kein Filter gesetzt ist. |

Das Menü ist schreibgeschützt. Es legt keine **Route History**-Zeilen an und löscht keine. Es listet nur Seiten des angemeldeten Benutzers.

Beim Speichern von **Verlauf Einstellungen** wird der Cache geleert. Desk hart neu laden, um Änderungen anzuwenden.
