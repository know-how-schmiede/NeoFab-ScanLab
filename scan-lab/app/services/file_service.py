"""File service functions for model discovery and file handling."""

from pathlib import Path
from typing import Iterable, List

SUPPORTED_MODEL_EXTENSIONS = {".glb", ".gltf", ".obj", ".stl"}


def list_available_models(models_dir: Path) -> List[str]:
    """Return model filenames available for preview in the viewer."""
    if not models_dir.exists():
        return []

    files: Iterable[Path] = (entry for entry in models_dir.iterdir() if entry.is_file())
    return sorted(
        file_path.name
        for file_path in files
        if file_path.suffix.lower() in SUPPORTED_MODEL_EXTENSIONS
    )
