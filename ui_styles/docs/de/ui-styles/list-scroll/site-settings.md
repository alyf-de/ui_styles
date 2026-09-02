---
title: Site settings
order: 20
roles:
  - System Manager
---

# Seiteneinstellungen

Öffnen Sie **Listen-Scroll Einstellungen** über den Arbeitsbereich **UI Styles** (System-Manager).

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *Dichte Listenansicht* | `dense_list_layout` | Hauptschalter. Kompakte Spalten mit gemeinsamer horizontaler Scrollleiste in der Listen-Kopfzeile. Standard nach Installation: aus. |
| *Fixierte Listen-Kopfzeile* | `sticky_list_header` | Spalten-Kopfzeile unter dem Seitenkopf beim Scrollen sichtbar halten. Nur sichtbar, wenn die dichte Listenansicht an ist. Standard: aus. |
| *Schwebende Listen-Paginierung* | `floating_list_paging` | Paginierungsleiste am unteren Fensterrand fixieren, sodass sie über den Zeilen schwebt. Nur sichtbar, wenn die dichte Listenansicht an ist. Standard: aus. |

## Verhalten bei aktiver dichter Listenansicht

Listen halten Spalten in Inhaltsbreite, zeigen bei Überlauf eine dünne Scrollleiste unter den Kopf-Beschriftungen und synchronisieren horizontales Verschieben von Kopf und Zeilen. Mit fixierter Kopfzeile bleibt die Spalten-Kopfzeile unter dem Seitenkopf. Mit schwebender Paginierung bleibt die Paginierungsleiste am natürlichen unteren Abstand über der Liste.

Beim Speichern von **Listen-Scroll Einstellungen** wird der Cache geleert. Desk hart neu laden, um Änderungen anzuwenden.
