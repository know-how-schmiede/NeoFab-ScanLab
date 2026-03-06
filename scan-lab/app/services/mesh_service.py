"""Mesh-related helpers for future 3D processing features."""

from pathlib import Path
from typing import Dict


def build_mesh_metadata(model_file: Path) -> Dict[str, str]:
    """Return lightweight metadata for a model file."""
    return {
        "name": model_file.name,
        "suffix": model_file.suffix.lower(),
        "source": str(model_file),
    }
