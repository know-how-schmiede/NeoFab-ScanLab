"""HTTP routes for the scan-lab demo application."""

from pathlib import Path

from flask import Blueprint, abort, current_app, render_template, send_from_directory, url_for

from .services.file_service import SUPPORTED_MODEL_EXTENSIONS, list_available_models

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Render project overview page."""
    return render_template("index.html")


@main_bp.route("/viewer")
def viewer():
    """Render 3D viewer page."""
    models_dir = Path(current_app.config["SAMPLE_MODELS_DIR"])
    models = list_available_models(models_dir)
    model_entries = [
        {"name": model_name, "url": url_for("main.sample_model", filename=model_name)}
        for model_name in models
    ]
    return render_template("viewer.html", models=model_entries)


@main_bp.route("/sample-models/<path:filename>")
def sample_model(filename):
    """Serve sample model files from the project sample_models folder."""
    if Path(filename).suffix.lower() not in SUPPORTED_MODEL_EXTENSIONS:
        abort(404)

    models_dir = Path(current_app.config["SAMPLE_MODELS_DIR"]).resolve()
    candidate = (models_dir / filename).resolve()

    if not candidate.is_file():
        abort(404)

    # Prevent path traversal by requiring the resolved file to stay in sample_models.
    try:
        candidate.relative_to(models_dir)
    except ValueError:
        abort(404)

    return send_from_directory(str(models_dir), filename)
