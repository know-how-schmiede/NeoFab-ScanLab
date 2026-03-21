#!/usr/bin/env bash
#
# Update NeoFab-ScanLab when running as a systemd service (Gunicorn).
# - Pulls latest code from GitHub
# - Updates Python dependencies
# - Runs a smoke test
# - Restarts the service

set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run this script as root (e.g. sudo ./scripts/updateNeoFabScanLabService.sh)." >&2
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

prompt APP_USER "System user running NeoFab-ScanLab" "neofab"
prompt APP_HOME "Install directory" "/home/${APP_USER}/projects/neofab-scanlab"
prompt SERVICE_NAME "systemd service name" "neofab-scanlab"
prompt GIT_REMOTE "Git remote" "origin"
prompt GIT_BRANCH "Git branch (leave empty for current branch)" ""
prompt FLASK_CONFIG "Flask config" "production"

VENV_DIR="$APP_HOME/.venv"
WORK_DIR="$APP_HOME/scan-lab"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
SMOKE_TEST_PY="from wsgi import app; client = app.test_client(); checks = {'/': client.get('/').status_code, '/viewer': client.get('/viewer').status_code}; print(' '.join([f'{path}={status}' for path, status in checks.items()])); import sys; sys.exit(0 if all(status == 200 for status in checks.values()) else 1)"

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

if [[ ! -f "$SERVICE_PATH" ]]; then
  echo "Service unit $SERVICE_PATH does not exist. Please run setupNeoFabScanLabService.sh first." >&2
  exit 1
fi

echo "==> Checking repository state..."
if ! run_as_app_user "cd \"$APP_HOME\" && test -z \"\$(git status --porcelain)\""; then
  echo "Local changes detected in $APP_HOME. Commit or discard them before updating." >&2
  exit 1
fi

if [[ -z "$GIT_BRANCH" ]]; then
  GIT_BRANCH="$(run_as_app_user "cd \"$APP_HOME\" && git branch --show-current")"
fi

if [[ -z "$GIT_BRANCH" ]]; then
  echo "Could not determine the current Git branch in $APP_HOME." >&2
  exit 1
fi

echo "==> Updating repository from $GIT_REMOTE/$GIT_BRANCH ..."
run_as_app_user "cd \"$APP_HOME\" && git fetch --prune \"$GIT_REMOTE\" \"$GIT_BRANCH\" && git checkout \"$GIT_BRANCH\" && git pull --ff-only \"$GIT_REMOTE\" \"$GIT_BRANCH\""

echo "==> Installing Python dependencies ..."
run_as_app_user "source \"$VENV_DIR/bin/activate\" && pip install --upgrade pip setuptools wheel && pip install -r \"$WORK_DIR/requirements.txt\" && pip install --upgrade gunicorn"

echo "==> Running application smoke test..."
run_as_app_user "cd \"$WORK_DIR\" && export FLASK_CONFIG=\"$FLASK_CONFIG\" && \"$VENV_DIR/bin/python\" -c \"$SMOKE_TEST_PY\""

echo "==> Restarting service $SERVICE_NAME ..."
systemctl daemon-reload
if systemctl is-active "$SERVICE_NAME" --quiet; then
  systemctl restart "$SERVICE_NAME"
else
  systemctl start "$SERVICE_NAME"
fi
systemctl is-active --quiet "$SERVICE_NAME"

cat <<EOF

====================================================
NeoFab-ScanLab service update completed
----------------------------------------------------
- Service name:   $SERVICE_NAME
- User/Group:     $APP_USER
- Working dir:    $WORK_DIR
- Virtualenv:     $VENV_DIR
- Git remote:     $GIT_REMOTE
- Branch:         $GIT_BRANCH
- Systemd unit:   $SERVICE_PATH
----------------------------------------------------
Useful commands:
  systemctl status $SERVICE_NAME
  journalctl -u $SERVICE_NAME -f
  systemctl restart $SERVICE_NAME
====================================================
EOF