#!/usr/bin/env bash
#
# Interactive installer for NeoFab-ScanLab on Debian 13 (LXC/VM/Server).
# - Installs required packages
# - Clones or updates the GitHub repository
# - Creates a virtualenv and installs Python deps
# - Runs a local smoke test
# - Optionally starts the Flask dev server in this terminal

set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run this script as root (e.g. sudo ./scripts/setupNeoFabScanLab.sh)." >&2
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

prompt APP_USER "System user to run NeoFab-ScanLab" "neofab"
prompt APP_HOME "Install directory" "/home/${APP_USER}/projects/neofab-scanlab"
prompt REPO_URL "Git repository URL" "https://github.com/know-how-schmiede/NeoFab-ScanLab.git"
prompt GIT_BRANCH "Git branch (leave empty for default/current)" ""
prompt FLASK_CONFIG "Flask config for test run" "development"
prompt FLASK_HOST "Flask host for test run" "0.0.0.0"
prompt FLASK_PORT "Flask port for test run" "8080"

VENV_DIR="$APP_HOME/.venv"
WORK_DIR="$APP_HOME/scan-lab"
SMOKE_TEST_PY="from wsgi import app; client = app.test_client(); checks = {'/': client.get('/').status_code, '/viewer': client.get('/viewer').status_code}; print(' '.join([f'{path}={status}' for path, status in checks.items()])); import sys; sys.exit(0 if all(status == 200 for status in checks.values()) else 1)"

echo "==> Installing base packages..."
apt update -y
apt install -y --no-install-recommends ca-certificates sudo git python3 python3-venv python3-pip

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  echo "==> Creating system user $APP_USER ..."
  useradd -m -s /bin/bash "$APP_USER"
fi

echo "==> Preparing directory $APP_HOME ..."
install -d -o "$APP_USER" -g "$APP_USER" "$APP_HOME"

if [[ ! -d "$APP_HOME/.git" ]]; then
  echo "==> Cloning repository..."
  run_as_app_user "git clone \"$REPO_URL\" \"$APP_HOME\""
else
  echo "==> Updating repository metadata..."
  run_as_app_user "cd \"$APP_HOME\" && git fetch --all --prune"
fi

if [[ -n "$GIT_BRANCH" ]]; then
  echo "==> Checking out branch $GIT_BRANCH ..."
  run_as_app_user "cd \"$APP_HOME\" && git checkout \"$GIT_BRANCH\" && git pull --ff-only origin \"$GIT_BRANCH\""
else
  echo "==> Pulling latest changes for the current branch ..."
  run_as_app_user "cd \"$APP_HOME\" && git pull --ff-only"
fi

if [[ ! -f "$WORK_DIR/wsgi.py" ]]; then
  echo "Could not find $WORK_DIR/wsgi.py after checkout. Check your install path and repository URL." >&2
  exit 1
fi

chown -R "$APP_USER:$APP_USER" "$APP_HOME"

echo "==> Creating virtualenv..."
run_as_app_user "python3 -m venv \"$VENV_DIR\""

echo "==> Installing Python dependencies..."
run_as_app_user "source \"$VENV_DIR/bin/activate\" && pip install --upgrade pip setuptools wheel && pip install -r \"$WORK_DIR/requirements.txt\""

echo "==> Running application smoke test..."
run_as_app_user "cd \"$WORK_DIR\" && export FLASK_CONFIG=\"$FLASK_CONFIG\" && \"$VENV_DIR/bin/python\" -c \"$SMOKE_TEST_PY\""

cat <<EOF

====================================================
NeoFab-ScanLab installation complete (terminal test setup)
----------------------------------------------------
- System user:          $APP_USER
- App directory:        $APP_HOME
- Working dir:          $WORK_DIR
- Virtualenv:           $VENV_DIR
- Flask config:         $FLASK_CONFIG
- Test server host:     $FLASK_HOST
- Test server port:     $FLASK_PORT
----------------------------------------------------
To start the test server in this terminal:
sudo -u $APP_USER bash -lc 'cd "$WORK_DIR" && source "$VENV_DIR/bin/activate" && FLASK_CONFIG=$FLASK_CONFIG flask --app wsgi run --host=$FLASK_HOST --port=$FLASK_PORT'

After you have verified the app in the browser, continue with:
sudo ./scripts/setupNeoFabScanLabService.sh
====================================================
EOF

read -r -p "Start the Flask dev server now? (y/N): " START_NOW || true
if [[ "$START_NOW" =~ ^[Yy] ]]; then
  echo "Starting server (Ctrl+C to stop)..."
  exec sudo -H -u "$APP_USER" bash -lc "cd \"$WORK_DIR\" && source \"$VENV_DIR/bin/activate\" && FLASK_CONFIG=\"$FLASK_CONFIG\" flask --app wsgi run --host=\"$FLASK_HOST\" --port=\"$FLASK_PORT\""
fi

echo "Done. You can start the server later using the command above."