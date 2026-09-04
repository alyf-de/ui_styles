---
title: Site settings
order: 20
roles:
  - System Manager
---

# Seiteneinstellungen

Öffnen Sie **Listen-Scroll Einstellungen** über den Arbeitsbereich **UI Styles** (System-Manager).

## Standardeinstellungen

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *Dichte Listenansicht* | `dense_list_layout` | Hauptschalter für Listen ohne DocType-Überschreibung. Kompakte Spalten mit gemeinsamer horizontaler Scrollleiste in der Listen-Kopfzeile. Standard nach Installation: aus. |
| *Fixierte Listen-Kopfzeile* | `sticky_list_header` | Spalten-Kopfzeile unter dem Seitenkopf beim Scrollen sichtbar halten. Nur sichtbar, wenn die dichte Listenansicht an ist. Standard: aus. |
| *Schwebende Listen-Paginierung* | `floating_list_paging` | Paginierungsleiste am unteren Fensterrand fixieren, sodass sie über den Zeilen schwebt. Nur sichtbar, wenn die dichte Listenansicht an ist. Standard: aus. |
| *Fixierte Spalten* | `sticky_columns` | Anzahl führender Listenspalten, die beim horizontalen Scrollen fest bleiben (Betreff / ID ist meist die erste Spalte). Standard: `0`. |

## DocType-Überschreibungen

Die Tabelle *DocType-Überschreibungen* (`doctype_overrides`) verwendet das Kind-DocType **List Scroll DocType Setting**. Hat ein **DocType** hier eine Zeile, ersetzt diese Zeile die Standardeinstellungen für dessen Listenansicht vollständig (dichte Ansicht, fixierte Kopfzeile, schwebende Paginierung und fixierte Spalten). DocTypes ohne Zeile behalten die Standardeinstellungen.

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *DocType* | `reference_doctype` | Listenansicht, für die diese Zeile gilt. Jedes **DocType** darf nur einmal vorkommen. |
| *Dichte Listenansicht* | `dense_list_layout` | Dichte Listenansicht für dieses **DocType** ein- oder ausschalten. |
| *Fixierte Listen-Kopfzeile* | `sticky_list_header` | Fixierte Kopfzeile für diese Liste, wenn die dichte Ansicht an ist. |
| *Schwebende Listen-Paginierung* | `floating_list_paging` | Schwebende Paginierung für diese Liste, wenn die dichte Ansicht an ist. |
| *Fixierte Spalten* | `sticky_columns` | Führende feste Spalten für diese Liste, wenn die dichte Ansicht an ist. |

## Verhalten bei aktiver dichter Listenansicht

Listen halten Spalten in Inhaltsbreite, zeigen bei Überlauf eine dünne Scrollleiste unter den Kopf-Beschriftungen und synchronisieren horizontales Verschieben von Kopf und Zeilen. Mit fixierter Kopfzeile bleibt die Spalten-Kopfzeile unter dem Seitenkopf. Mit schwebender Paginierung bleibt die Paginierungsleiste am natürlichen unteren Abstand über der Liste. Bei *Fixierte Spalten* größer als `0` bleiben die ersten N sichtbaren Spalten stehen, während spätere Spalten verschoben werden.

Beim Speichern von **Listen-Scroll Einstellungen** wird der Cache geleert. Desk hart neu laden, um Änderungen anzuwenden.
