---
title: Doc Table
order: 1
roles:
  - System Manager
---

# Doc Table

**Doc Table** ist ein eigener Feldtyp, der auf einem Formular eine schreibgeschützte Tabelle verwandter Dokumente zeigt. Anders als beim *Feldtyp* "Table" muss *Optionen* ein normales **DocType** sein - keine Untertabelle, kein Single und kein virtueller DocType.

## Wann nutzen

Nutzen Sie **Doc Table**, wenn Sie Dokumente sehen wollen, die auf den aktuellen Datensatz verlinken (z. B. **Ausgangsrechnung**-Belege zu einem **Kunde**), ohne sie in eine Untertabelle zu kopieren.

Für bearbeitbare Positionszeilen am übergeordneten Beleg bleibt *Feldtyp* "Table" mit Untertabellen-DocType richtig.

## Einrichtung

1. Öffnen Sie **Formular anpassen** für das übergeordnete DocType (oder das DocType im Entwicklermodus).
2. Fügen Sie ein Feld hinzu.
3. Setzen Sie *Feldtyp* auf "Doc Table".
4. Setzen Sie *Optionen* (Schlüsselwort-Zeilen, beliebige Reihenfolge):

```text
doctype: Sales Invoice
link: customer
columns: name, posting_date, grand_total, status
order_by: posting_date desc
page_size: 20
page_size_max: 100
visible_rows: 5
pagination: none
```

- `doctype:` - verwandtes **DocType** (pflicht).
- `link:` - Verknüpfungs-*Feldname* auf diesem DocType zum übergeordneten Beleg (optional). Fehlt die Zeile, nutzt das Feld das einzige passende Verknüpfungsfeld. Gibt es mehrere Verknüpfungen zum übergeordneten DocType, muss `link:` gesetzt werden. Mit `link: none` entfällt die Verknüpfung zum Übergeordneten; nur Feld-*Filter* gelten.
- `columns:` - kommagetrennte *Feldnamen*. Fehlt sie, gelten die Listenspalten des verwandten DocTypes.
- `order_by:` - wie Frappe `get_list` / `order_by`. Standard ist `modified desc`.
- `page_size:` - Zeilen pro *Mehr laden*-Abruf bei `pagination: none` (Standard 20). Darf `page_size_max` nicht überschreiten.
- `page_size_max:` - Obergrenze für `page_size` (Standard 100, hartes Maximum 500).
- `visible_rows:` - sichtbare Zeilen im Tabellenkörper; bei `pagination: pages` auch die Schrittweite für Vorwärts/Zurück (Standard 5).
- `pagination:` - `none` (Standard, wenn weggelassen) behält *Mehr laden* und Scrollen; `pages` nutzt Vorwärts-/Zurück-Symbole und ersetzt Zeilen in Schritten von `visible_rows`.

Beispiel ohne Verknüpfung zum Übergeordneten (nur über *Filter*):

```text
doctype: ToDo
link: none
columns: status, description
order_by: modified desc
```

Beispiel mit Seitenblattierung:

```text
doctype: Sales Invoice
link: customer
page_size: 20
visible_rows: 5
pagination: pages
```

5. Optional: *Filter* setzen (wie bei **Verknüpfung**-Feldern), um die Zeilen weiter einzuschränken. Bei `link: none` sind *Filter* die einzige Zeileneinschränkung.
6. Speichern und das Formular neu laden.

Im Formular-Generator von **DocType** / **Formular anpassen** zeigt **Doc Table** eine Tabellenvorschau mit Beschriftung und Aktionen (Hinzufügen, Filter, Duplizieren, Entfernen).

## Feldtyp fehlt in der Liste

Bei Installation oder Migration fügt **UI Styles** "Doc Table" per Property Setter zur *Feldtyp*-Auswahl auf **Custom Field** und **Customize Form Field** hinzu.

Existiert auf der Site bereits ein **Property Setter** für `fieldtype` / `options` auf einem dieser DocTypes (von einer anderen App oder manuell), überschreibt **UI Styles** ihn nicht. Fehlt "Doc Table" in der Optionsliste dieses Setters, erscheint der Typ in diesen Auswahlfeldern nicht.

**Was weiter funktioniert:** Der Formular-Generator von **DocType** und **Formular anpassen** lädt Feldtypen aus Desk-JS - "Doc Table" erscheint dort auch, wenn der Property Setter übersprungen wurde.

**Manuelle Behebung:**

1. Öffnen Sie die **Property Setter**-Liste und suchen Sie `Custom Field-fieldtype-options` oder `Customize Form Field-fieldtype-options`.
2. Tragen Sie in *Value* `Doc Table` in einer eigenen Zeile ein.
3. Speichern und Cache leeren.

Ist der fremde Setter obsolet, löschen Sie ihn und führen Sie `bench --site <site> migrate` aus, damit **UI Styles** einen eigenen Setter anlegen kann.

Dieselbe Regel gilt für die *Filter*-Schaltfläche auf **Custom Field** (`link_filters` `depends_on`): ein bestehender fremder Property Setter bleibt unverändert.

## Im Formular

Nach dem Speichern des übergeordneten Belegs lädt das Feld passende Zeilen. Bei `pagination: none` oder fehlender Angabe laden Batches von `page_size` (Standard 20) über *Mehr laden*; die Tabelle zeigt etwa `visible_rows` (Standard 5) und scrollt unter einem festen Spaltenkopf. Bei `pagination: pages` holt jeder Vorwärts-/Zurück-Schritt `visible_rows` Zeilen und ersetzt die Tabelle. Symbolschaltflächen rechts neben dem Feldlabel (Hinzufügen, Aktualisieren, Liste öffnen) erlauben:

- ein verwandtes Dokument mit vorausgefüllter Verknüpfung anzulegen
- die Tabelle zu aktualisieren (setzt bei `pages` auf die erste Seite zurück)
- die Liste mit demselben Verknüpfungs- und *Filter*-Satz zu öffnen
- eine Zeile zu öffnen (Verknüpfung auf *ID*, falls gelistet, sonst auf der ersten Spalte; bei sichtbarer *ID* auch auf dem Titelfeld)
- *Mehr laden* oder Vorwärts/Zurück, je nach `pagination`

## Wer sieht diese Seite

System-Manager richten **Doc Table**-Felder ein. Wer das übergeordnete Formular öffnen darf, sieht die Tabelle, sofern er auch Leserecht auf dem verwandten DocType hat.
