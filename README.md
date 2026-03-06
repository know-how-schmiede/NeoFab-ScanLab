# NeoFab-ScanLab
A simple Flask-based web viewer for 3D scan data using three.js.  This project demonstrates how 3D scan meshes (e.g. from Revopoint scanners) can be displayed interactively inside a web browser.
The viewer supports modern web-friendly formats such as GLB / GLTF and is intended as an experimental prototype before integrating the functionality into the NeoFab Maker platform.

## Project Goals

The purpose of this repository is to explore and prototype:

- Displaying 3D scan data in the browser
- Using three.js as a lightweight viewer
- Serving models via Python + Flask
- Preparing scan meshes for web visualization
- Evaluating performance for large scan datasets

This demo project will later serve as the technical foundation for a NeoFab plugin.

## Features (Planned)

Current and upcoming features:

### Viewer

- Interactive 3D viewer (three.js)
- Mouse navigation (rotate / zoom / pan)
- Automatic camera positioning
- Scene lighting
- Grid and axis helper
- Responsive viewer layout

### File Handling

- Serve local GLB models
- Load models dynamically via Flask routes
- Support for large meshes (scan datasets)

### Future Features

- File upload
- Mesh preview generation
- Mesh decimation / optimization
- Scan metadata display
- Thumbnail generation
- Model comparison (scan vs CAD)

## Technology Stack

### Backend

- Python
- Flask

### Frontend

- three.js
- WebGL

### Mesh Processing (planned)

- trimesh
- MeshLab / Blender pipeline

## Supported 3D Formats

Recommended format for web visualization:

Format	Purpose
GLB	Primary web format
GLTF	Alternative web format
STL	Import only
PLY	Scan data
OBJ	Import possible

For best performance, models should be converted to GLB and optionally simplified before viewing.