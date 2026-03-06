# scan-lab

`scan-lab` is a standalone Flask demo project for browser-based visualization of 3D scan data.
It uses a modular layout (routes, services, templates, static assets) so modules can later be transferred into larger Flask systems.

## Tech Stack

- Backend: Python + Flask
- Frontend: HTML, CSS, JavaScript
- 3D frontend prep: Placeholder structure for three.js integration

## Quick Start (Windows PowerShell)

```powershell
cd .\scan-lab\
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python .\app.py
```

Open: `http://127.0.0.1:5000`

## Current Scope

- Home page at `/`
- Viewer page at `/viewer`
- Base template with navigation
- Service layer prepared (`file_service`, `mesh_service`)
- Data and model folders with placeholders for future assets

## Planned Expansion

- Integrate real three.js rendering flow (scene, camera, renderer, controls)
- Add model loading from static and/or managed storage
- Add upload and processing workflow for scan assets
- Add database-backed model metadata and project entities
