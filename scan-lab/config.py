"""Configuration objects for the scan-lab Flask app."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class BaseConfig:
    """Base configuration shared by all environments."""

    SECRET_KEY = os.getenv("SECRET_KEY", "scan-lab-dev-key")
    TEMPLATES_AUTO_RELOAD = True

    DATA_DIR = BASE_DIR / "data"
    SAMPLE_MODELS_DIR = BASE_DIR / "sample_models"

    @staticmethod
    def init_app(app):
        """Hook for environment-specific initialization."""
        _ = app


class DevelopmentConfig(BaseConfig):
    """Local development configuration."""

    DEBUG = True


class ProductionConfig(BaseConfig):
    """Production configuration used by the systemd service."""

    DEBUG = False
    TEMPLATES_AUTO_RELOAD = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}