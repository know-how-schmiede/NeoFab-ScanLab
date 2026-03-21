"""WSGI entry point for development and production servers."""

import os

from app import create_app

app = create_app(os.getenv("FLASK_CONFIG", "development"))
application = app