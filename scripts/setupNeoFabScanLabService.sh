#!/usr/bin/env bash
#
# Configure NeoFab-ScanLab as a systemd service (Gunicorn).
# Assumes setupNeoFabScanLab.sh was run and the app was already tested.

set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run this script as root (e.g. sudo ./scripts/setupNeoFabScanLabService.sh)." >&2
  exit 1
fi

prompt() {
  local var="$1" label="$2" default="$3" value
  read -r -p "$label [$default]: " value || true
  printf -v "$var" "%s" "${value:-$default}"
}

run_as_app_user() {
  sudo -H -u "$APP_USER" bash -lc "$*"
}

APP_USER="neofab"
APP_HOME="/home/${APP_USER}/projects/neofab-scanlab"
SERVICE_NAME="neofab-scanlab"

prompt APP_USER "System user running NeoFab-ScanLab" "$APP_USER"
prompt APP_HOME "Install directory" "$APP_HOME"
prompt FLASK_CONFIG "Flask config" "production"
prompt LISTEN_HOST "Gunicorn bind host" "0.0.0.0"
prompt LISTEN_PORT "Gunicorn bind port" "8080"
prompt GUNICORN_WORKERS "Gunicorn workers" "2"
prompt SERVICE_NAME "systemd service name" "$SERVICE_NAME"

ENV_FILE="/etc/default/${SERVICE_NAME}"
EXISTING_SECRET_KEY=""
if [[ -f "$ENV_FILE" ]]; then
  EXISTING_SECRET_KEY="$(grep -E '^SECRET_KEY=' "$ENV_FILE" | head -n 1 | cut -d= -f2- || true)"
fi
prompt SECRET_KEY "Secret key (leave empty to auto-generate)" "$EXISTING_SECRET_KEY"

VENV_DIR="$APP_HOME/.venv"
WORK_DIR="$APP_HOME/scan-lab"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
SMOKE_TEST_PY="from wsgi import app; client = app.test_client(); checks = {'/': client.get('/').status_code, '/viewer': client.get('/viewer').status_code, '/static/vendor/three/build/three.module.js': client.get('/static/vendor/three/build/three.module.js').status_code}; print(' '.join([f'{path}={status}' for path, status in checks.items()])); import sys; sys.exit(0 if all(status == 200 for status in checks.values()) else 1)"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl is not available in this container. Check the Debian 13 LXC setup." >&2
  exit 1
fi

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Virtualenv not found at $VENV_DIR. Please run setupNeoFabScanLab.sh first." >&2
  exit 1
fi

if [[ ! -f "$WORK_DIR/wsgi.py" ]]; then
  echo "Could not find wsgi.py in $WORK_DIR. Check your install path." >&2
  exit 1
fi

echo "==> Running application smoke test before service setup..."
run_as_app_user "cd \"$WORK_DIR\" && export FLASK_CONFIG=\"$FLASK_CONFIG\" && \"$VENV_DIR/bin/python\" -c \"$SMOKE_TEST_PY\""

if [[ -z "$SECRET_KEY" ]]; then
  SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
fi

echo "==> Installing gunicorn inside the virtualenv..."
run_as_app_user "source \"$VENV_DIR/bin/activate\" && pip install --upgrade pip setuptools wheel gunicorn"

if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
fi

echo "==> Writing environment file to $ENV_FILE ..."
cat > "$ENV_FILE" <<EOF
FLASK_CONFIG=${FLASK_CONFIG}
SECRET_KEY=${SECRET_KEY}
EOF
chmod 640 "$ENV_FILE"

if [[ -f "$SERVICE_PATH" ]]; then
  cp "$SERVICE_PATH" "${SERVICE_PATH}.bak.$(date +%Y%m%d%H%M%S)"
fi

echo "==> Writing systemd unit to $SERVICE_PATH ..."
cat > "$SERVICE_PATH" <<EOF
[Unit]
Description=NeoFab-ScanLab (Gunicorn)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${WORK_DIR}
EnvironmentFile=${ENV_FILE}
Environment="PYTHONUNBUFFERED=1"
ExecStart=${VENV_DIR}/bin/gunicorn --workers ${GUNICORN_WORKERS} --bind ${LISTEN_HOST}:${LISTEN_PORT} --access-logfile - --error-logfile - wsgi:app
Restart=on-failure
RestartSec=5
UMask=027

[Install]
WantedBy=multi-user.target
EOF

echo "==> Reloading systemd..."
systemctl daemon-reload

read -r -p "Enable and start service now? (Y/n): " START_NOW || true
if [[ ! "$START_NOW" =~ ^[Nn] ]]; then
  systemctl enable --now "$SERVICE_NAME"
  systemctl is-active --quiet "$SERVICE_NAME"
fi

cat <<EOF

====================================================
NeoFab-ScanLab service setup completed
----------------------------------------------------
- Service name:       $SERVICE_NAME
- User/Group:         $APP_USER
- Working dir:        $WORK_DIR
- Virtualenv:         $VENV_DIR
- Bind address:       $LISTEN_HOST:$LISTEN_PORT
- Flask config:       $FLASK_CONFIG
- Environment file:   $ENV_FILE
- Systemd unit:       $SERVICE_PATH
----------------------------------------------------
Useful commands:
  systemctl status $SERVICE_NAME
  journalctl -u $SERVICE_NAME -f
  systemctl restart $SERVICE_NAME
====================================================
EOF