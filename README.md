# NeoFab-ScanLab
A Flask-based web viewer for 3D scan and mesh data using three.js. The project started as a lightweight GLB/GLTF prototype and has evolved into an interactive browser viewer for scan meshes, CAD exports, and slicer-oriented 3D files.

![Scan-Lab Dialog and Viewer](/images/24-03-2026_12-07-55.jpg)

## Project Goals

The purpose of this repository is to explore and prototype:

- Displaying 3D scan and mesh data directly in the browser
- Using three.js as a lightweight viewer and inspection layer
- Serving models via Python + Flask
- Preparing scan meshes for web visualization
- Evaluating performance for larger scan datasets
- Building a technical foundation for later NeoFab Maker integration

## Current Viewer Capabilities

### Model Loading

- Automatic discovery and loading of sample models from `sample_models/`
- Local upload and drag-and-drop for `STL`, `GLB`, `glTF`, `OBJ`, `PLY`, and `3MF`
- Robust 3MF import, including project-style packages with external `3D/Objects/*.model` files
- Status line feedback for loading, format issues, and 3MF-specific parse errors

### Inspection and Positioning

- Automatic camera framing and reset-to-default view
- Model info overlay with file size, bounding box, and triangle count
- Bounding box display with optional dimension labels
- PNG screenshot export, including visible bounding-box dimensions
- Face selection, "place model on selected face", and bounding-box axis alignment
- Grid, axes, wireframe, model info, auto-rotation, and smooth/flat shading toggles

### Appearance and Layout

- Custom model color, preset colors, reset, and favorite colors stored in `localStorage`
- Lighting presets: `Studio`, `Technical`, and `High Contrast`
- Viewer size presets: `Compact`, `Standard`, and `Large`
- Right-side slide-out controls dock for color, lighting, and viewer size
- Left-side slide-out models dock for sample-model selection

## Supported 3D Formats

| Format | Status | Notes |
| --- | --- | --- |
| `GLB` | Supported | Recommended single-file format for browser viewing |
| `glTF` | Supported | Works best as a self-contained asset set; `GLB` remains the most robust local-upload option |
| `STL` | Supported | Standard triangle-mesh import |
| `OBJ` | Supported | Standard mesh import |
| `PLY` | Supported | Mesh PLY with faces; point-only clouds are currently not supported |
| `3MF` | Supported | Mesh 3MF and project-style multi-part packages; loaded with flat shading by default |

Formats not yet covered in the current viewer: `FBX`.

## Roadmap / Open Topics

- Load progress indicator with percentage feedback
- Keyboard shortcuts for common viewer actions
- Units and scaling options per model
- Multi-model scene handling
- Clipping plane / sectional view
- Measurement and annotation tools
- Session export/import
- Scan-vs-CAD comparison workflows

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

## Debian 13 / Proxmox LXC Deployment

Deployment helpers for a Debian-13 LXC container on Proxmox are included in [`scripts/`](./scripts):

- `scripts/setupNeoFabScanLab.sh`
- `scripts/setupNeoFabScanLabService.sh`
- `scripts/updateNeoFabScanLabService.sh`

Recommended order inside the container:

1. Run `setupNeoFabScanLab.sh` as `root`
2. Test the app in the browser
3. Run `setupNeoFabScanLabService.sh` as `root`
4. Use `updateNeoFabScanLabService.sh` for future updates from GitHub