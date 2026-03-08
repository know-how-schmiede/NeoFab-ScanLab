# Featureliste Viewer

Status: `[ ]` offen, `[x]` integriert
Sortierung: von oben nach unten nach Prioritaet und Umsetzbarkeit

## 1) Hohe Prioritaet, schnell umsetzbar

- [X] Upload-Button + Drag-and-Drop fuer lokale STL/GLB Dateien
- [ ] Ladeindikator mit Prozentanzeige beim Modellimport
- [ ] Anzeige von Modellinfos (Dateigroesse, Bounding Box, Dreiecksanzahl)
- [X] Achsen-Helfer (AxisHelper) als ein/aus Schalter
- [X] Wireframe/Solid Umschalter fuer schnelle Geometriepruefung
- [ ] Screenshot-Export als PNG aus aktueller Kameraposition
- [ ] Viewer-Shortcuts (Reset, Rotation, Grid) ueber Tastatur
- [ ] Persistenz der letzten Viewer-Einstellungen (localStorage)
- [ ] Color-Auswahl als Favorit speichern
- [X] "Home"-Icon für Standart-Ansicht zurücksetzen

## 2) Hohe Prioritaet, mittlere Umsetzbarkeit

- [ ] Unterstuetzung fuer GLB/GLTF inklusive Material-Handling
- [ ] Einheiten- und Skalierungsoptionen (mm/cm/m) pro Modell
- [ ] Multi-File Szene: mehrere Modelle gleichzeitig laden und ein/ausblenden
- [ ] Strukturierte Fehlermeldungen (Dateiformat, Parse-Fehler, fehlende Datei)
- [ ] Clipping-Plane (Schnittansicht) fuer Innenansicht
- [ ] Fit-to-Selection fuer einzelne Objekte bei Mehrmodell-Szenen

## 3) Mittlere Prioritaet, mittlere bis hohe Umsetzbarkeit

- [ ] Messwerkzeug fuer Distanz zwischen zwei Punkten
- [ ] Marker/Annotationen direkt im Modell speichern
- [ ] Kamera-Presets (Front/Top/Left/Isometric) inkl. benutzerdefinierter Speicherplaetze
- [ ] Lichtprofile (Studio, Technical, High Contrast) als Presets
- [ ] Export/Import der Viewer-Sitzung (JSON mit Kamera + Sichtbarkeit + Farben)

## 4) Strategische Features, hoher Aufwand

- [ ] Vergleichsansicht Scan vs. CAD mit Synchronkamera
- [ ] Abweichungsanalyse (Heatmap) zwischen zwei Meshes
- [ ] Serverseitige Mesh-Optimierung (Decimation, Repair) als Pipeline
- [ ] Streaming/LOD fuer sehr grosse Modelle
- [ ] Freigabe-Link mit Rollen (nur ansehen / kommentieren / bearbeiten)
