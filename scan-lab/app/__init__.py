"""Flask application factory for the scan-lab demo project."""

import os
from typing import Optional

from flask import Flask

from config import config_by_name
from version import __version__
from .extensions import init_extensions
from .routes import main_bp


def create_app(config_name: Optional[str] = None) -> Flask:
    """Create and configure a Flask application instance."""
    app = Flask(__name__, instance_relative_config=True)

    selected_config = config_name or os.getenv("FLASK_CONFIG", "development")
    config_class = config_by_name.get(selected_config, config_by_name["default"])
    app.config.from_object(config_class)
    config_class.init_app(app)

    init_extensions(app)
    app.register_blueprint(main_bp)

    @app.context_processor
    def inject_app_version():
        """Expose project version in all templates."""
        return {"app_version": __version__}

    return app
