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

## 0.3.11 (2026-03-08)
- Viewer: Fehlende Tooltips (`title`) fuer Viewer-Buttons ergaenzt (Model-Buttons, Upload, Farbaktionen).
- Tooltip fuer die Drag-and-Drop-Ladeflaeche hinzugefuegt.
- Projektversion auf `0.3.11` erhoeht.

## 0.3.10 (2026-03-08)
- Viewer: Modellinfo-Overlay links oben integriert (Dateigroesse, Bounding Box, Dreiecksanzahl).
- Viewer: Toolbar-Toggle zum Ein-/Ausblenden der Modellinfos hinzugefuegt.
- Modell-Dateigroesse wird fuer Sample-Modelle aus dem Backend und fuer lokale Uploads aus der Datei uebernommen.
- Projektversion auf `0.3.10` erhoeht.

## 0.3.9 (2026-03-08)
- Viewer: Color-Favoriten werden im Browser via `localStorage` persistent gespeichert.
- Viewer: Favoriten koennen ueber den neuen Button "Remove favorite" entfernt werden.
- Viewer: Favoriten koennen alternativ per Rechtsklick auf den Preset-Farbpunkt geloescht werden.
- Projektversion auf `0.3.9` erhoeht.

## 0.3.8 (2026-03-08)
- Viewer: Button "Add favorite" bei "Custom color" hinzugefuegt.
- Aktuelle Farbe aus dem Color-Input kann als neues Preset in die Farbpalette abgelegt werden.
- Doppelte Favoritenfarben werden erkannt und nicht erneut angelegt.
- Projektversion auf `0.3.8` erhoeht.

## 0.3.7 (2026-03-08)
- Viewer: Wireframe/Solid Umschalter als Toolbar-Toggle hinzugefuegt.
- Wireframe-Modus wirkt auf STL- und GLB-Meshes und bleibt beim Modellwechsel aktiv.
- Projektversion auf `0.3.7` erhoeht.

## 0.3.6 (2026-03-08)
- Viewer: Icon fuer "Ansicht zuruecksetzen" auf ein Home-Symbol umgestellt.
- Projektversion auf `0.3.6` erhoeht.

## 0.3.5 (2026-03-08)
- Viewer: Upload-Button fuer lokale STL/GLB-Dateien integriert.
- Viewer: Drag-and-Drop-Zone fuer lokale STL/GLB-Dateien hinzugefuegt.
- GLB-Support via lokal eingebundenem `GLTFLoader` (three.js r165) umgesetzt.

## 0.3.4 (2026-03-08)
- Viewer: Achsen-Helfer (`AxesHelper`) in die Szene integriert.
- Toolbar um ein Icon zum Ein-/Ausblenden der Achsen erweitert.
- Toggle-Status fuer den Achsen-Schalter mit `aria-pressed` umgesetzt.

## 0.3.3 (2026-03-07)
- Viewer: Icon zum Ein-/Ausblenden des Gitters in der Toolbar hinzugefuegt.
- Gitter-Icon als Toggle-Button mit `aria-pressed` umgesetzt.
- Sichtbarkeit des `GridHelper` wird direkt im Viewer dynamisch geschaltet.

## 0.3.2 (2026-03-07)
- Viewer: Toggle-Icon fuer automatische Rotation um den Ursprung hinzugefuegt (Rotation ein/aus).
- Toggle-Status visuell hervorgehoben und per `aria-pressed` als Schalter umgesetzt.
- Bestehendes Reset-Ansicht-Icon mit Rotations-Icon in gemeinsamer Toolbar gruppiert.

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
