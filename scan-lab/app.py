"""Entry point for running scan-lab locally."""

from wsgi import app


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)