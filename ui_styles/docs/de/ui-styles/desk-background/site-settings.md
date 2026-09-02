---
title: Seiteneinstellungen
order: 20
roles:
  - System Manager
---

# Seiteneinstellungen

**Schreibtisch-Hintergrund Einstellungen** über den Arbeitsbereich **UI Styles** öffnen (System-Manager).

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *Desk-Hintergrund aktivieren* | `enabled` | Hauptschalter. Standard nach Installation: aus. |
| *Seitenfarbvoreinstellung* | `site_color_preset` | Seitenweite Farbe. **Standard** entfernt den Tint. Standard bei Aktivierung: **Standard**. |
| *Farbstärke* | `site_color_intensity` | **Sanft** oder **Kräftig**. Standard: **Sanft**. Ausgeblendet bei Preset **Standard**. |
| *Benutzern erlauben, eine eigene Farbe zu wählen* | `allow_user_color` | Wenn aktiv, kann jeder Nutzer *Schreibtisch-Farbe* und *Schreibtisch-Farbstärke* auf dem **Nutzer** setzen. Standard: aus. |
| *Alle Benutzerauswahlen beim Zurücksetzen löschen* | `clear_user_choices_on_reset` | Mit *Auf Standard zurücksetzen* alle persönlichen Farben auf **Nutzer** löschen. |

## Voreinstellungen

Zwanzig kuratierte Farben plus **Standard**. Jede Farbe hat **Sanft** und **Kräftig**. Jede Fläche und Navbar erfüllt mindestens **4,5:1** Textkontrast (WCAG AA).

Kategorien nach Farbton: Neutraltöne (Fast Weiß, Warmes Grau, Kühles Grau, Nebel), warmes Beige und Gelb (Sand, Weizen, Creme, Butter), Orange (Pfirsich, Aprikose), Rot / Rosa (Hellrot, Zartrosa, Rosenquarz), Grün (Minze, Salbei, Meerschaum), Blau (Himmel, Blaugrau), Violett (Lavendel, Flieder).

**Hellrot** + **Sanft** entspricht dem weichen Rot früherer eigenständiger App-Versionen (z. B. im TOLLER-Testsystem).

## Auf Standard zurücksetzen

*Auf Standard zurücksetzen* setzt die Seitenvoreinstellung auf **Standard** (Frappe-Standardfarben). Optional zuerst *Alle Benutzerauswahlen beim Zurücksetzen löschen* aktivieren.

Speichern von **Schreibtisch-Hintergrund Einstellungen** (oder *Auf Standard zurücksetzen*) leert den Cache und lädt den Schreibtisch neu, wie die Aktion *Cache leeren und neu laden*.

Siehe auch: [Persönliche Schreibtisch-Farbe](/app/docs/de/ui-styles/desk-background/user-settings).
