# scan-lab Versionen

## Versionierungsregeln
- Schema: `MAJOR.MINOR.PATCH` (SemVer-orientiert).
- `PATCH`: Bugfixes, kleine Stabilitaetsverbesserungen, keine funktionalen Brueche.
- `MINOR`: neue Features oder sichtbare Erweiterungen, abwaertskompatibel.
- `MAJOR`: inkompatible Aenderungen an Verhalten, APIs oder Projektstruktur.
- Die aktuell gueltige Version steht zentral in `scan-lab/version.py`.
- Jeder Release-Eintrag in dieser Datei enthaelt Datum und Stichpunkte.

## Release-Checkliste
- Version in `scan-lab/version.py` erhoehen.
- Neuen Abschnitt oben in `scan-lab/Doku/version.md` anlegen.
- Aenderungen als kurze Stichpunkte dokumentieren (fokus auf Verhalten/Funktion).
- App kurz pruefen (`/` und `/viewer` erreichbar, Viewer laedt Modelle).
- Optional: `python -m compileall app.py config.py version.py app` ausfuehren.

## 0.3.1 (2026-03-07)
- Viewer: Icon zum Zuruecksetzen auf die Standardansicht integriert.
- Kamera-Reset auf gespeicherte Default-Ansicht des geladenen Modells umgesetzt.

## 0.3.0 (2026-03-07)
- Viewer um interaktive Modell-Farbsteuerung erweitert (Color-Picker, Presets, Reset).
- Ausgewaehlte Modellfarbe bleibt beim Laden anderer Modelle im Viewer erhalten.
- Styles fuer neue Farb-Controls inkl. mobiler Darstellung ergaenzt.

## 0.2.0 (2026-03-06)
- Anzeige der Projektversion aus zentraler `version.py` in der Weboberflaeche integriert.
- `sample_models`-Dateien werden im Viewer gelistet und als STL gerendert.
- three.js, OrbitControls und STLLoader lokal eingebunden (ohne CDN-Abhaengigkeit).
- Route zum sicheren Ausliefern von Beispielmodellen unter `/sample-models/<filename>` hinzugefuegt.

## 0.1.0 (2026-03-06)
- Initiales Flask-Demo-Projekt `scan-lab` mit Application Factory erstellt.
- Struktur mit Modulen, Templates, Services, Static und Datenordnern aufgebaut.
- Startseite `/` und Viewer-Seite `/viewer` implementiert.
