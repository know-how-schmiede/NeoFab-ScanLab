# Featureliste Viewer

Status: `[ ]` offen, `[X]` integriert
Sortierung: zuerst aktueller Stand, danach offene Themen

## 1) Bereits integriert

- [X] Sample-Model-Erkennung aus `sample_models/`
- [X] Upload-Button + Drag-and-Drop fuer lokale STL/GLB/GLTF/OBJ/PLY/3MF Dateien
- [X] GLB/GLTF-Unterstuetzung fuer Web-Modelle
- [X] OBJ- und PLY-Import fuer Mesh-Dateien
- [X] Robuster 3MF-Import inkl. Projektdateien mit ausgelagerten `3D/Objects/*.model`
- [X] Statuszeile mit 3MF-spezifischen Fehlermeldungen
- [X] Anzeige von Modellinfos (Dateigroesse, Bounding Box, Dreiecksanzahl)
- [X] Bounding Box ein/aus schaltbar
- [X] Dimensionen der Bounding Box anzeigen
- [X] Persistenz der Bounding-Box-Dimensionen beim Modellwechsel
- [X] Screenshot-Export als PNG aus aktueller Kameraposition
- [X] Bounding-Box-Dimensionen im PNG-Export mit ausgeben
- [X] Achsen-Helfer (AxisHelper) als ein/aus Schalter
- [X] Grid-Schalter
- [X] Wireframe/Solid-Umschalter fuer schnelle Geometriepruefung
- [X] Flat-/Smooth-Shading-Umschalter
- [X] Lichtprofile (Studio, Technical, High Contrast) als Presets
- [X] Viewer-Groessen-Presets (Compact, Standard, Large)
- [X] Farb-Presets, Custom Color und Reset
- [X] Color-Auswahl als Favorit speichern
- [X] Color-Favoriten loeschen
- [X] Persistenz der Color-Favoriten via localStorage
- [X] "Home"-Icon fuer Reset auf Standard-Ansicht
- [X] Auto-Rotation
- [X] Face Selection fuer Modellflaechen
- [X] Objekt auf ausgewaehlter Flaeche auf Grundebene ablegen
- [X] Bounding Box an Weltachsen ausrichten
- [X] Tooltip-Anzeige fuer Buttons im Viewer
- [X] Ausklappbares Controls-Dock rechts
- [X] Ausklappbares Models-Dock links
- [X] Persistenz der Dock-Zustaende via localStorage

## 2) Hohe Prioritaet, offen

- [ ] Ladeindikator mit Prozentanzeige beim Modellimport
- [ ] Viewer-Shortcuts (Reset, Rotation, Grid) ueber Tastatur
- [ ] Einheiten- und Skalierungsoptionen (mm/cm/m) pro Modell
- [ ] Allgemeinere strukturierte Fehlermeldungen fuer alle Dateiformate
- [ ] Clipping-Plane (Schnittansicht) fuer Innenansicht
- [ ] Fit-to-Selection fuer einzelne Objekte bei Mehrmodell-Szenen

## 3) Mittlere Prioritaet, offen

- [ ] Multi-File-Szene: mehrere Modelle gleichzeitig laden und ein/ausblenden
- [ ] Messwerkzeug fuer Distanz zwischen zwei Punkten
- [ ] Marker/Annotationen direkt im Modell speichern
- [ ] Kamera-Presets (Front/Top/Left/Isometric) inkl. benutzerdefinierter Speicherplaetze
- [ ] Export/Import der Viewer-Sitzung (JSON mit Kamera + Sichtbarkeit + Farben)
- [ ] FBX-Import
- [ ] Erweiterte Material- und Eigenschaften-Unterstuetzung fuer komplexe 3MF-Dateien

## 4) Strategische Features, hoher Aufwand

- [ ] Vergleichsansicht Scan vs. CAD mit Synchronkamera
- [ ] Abweichungsanalyse (Heatmap) zwischen zwei Meshes
- [ ] Serverseitige Mesh-Optimierung (Decimation, Repair) als Pipeline
- [ ] Streaming/LOD fuer sehr grosse Modelle
- [ ] Freigabe-Link mit Rollen (nur ansehen / kommentieren / bearbeiten)