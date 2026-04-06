#!/usr/bin/env bash
set -euo pipefail

APPIMAGE="/home/vboxuser/Downloads/BrowserOS.AppImage"
PROFILE_DIR="/home/vboxuser/web_clone/.browseros-profile"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/browseros.log"
URL="${1:-https://chatgpt.com/}"

mkdir -p "$PROFILE_DIR" "$LOG_DIR"

if ps -eo args= | grep -F -- "$APPIMAGE --no-sandbox --user-data-dir=$PROFILE_DIR" | grep -Fv "grep -F" >/dev/null 2>&1; then
  echo "BrowserOS already running with profile: $PROFILE_DIR"
  exit 0
fi

export DISPLAY="${DISPLAY:-:0.0}"

setsid -f "$APPIMAGE" \
  --no-sandbox \
  "--user-data-dir=$PROFILE_DIR" \
  "$URL" \
  >>"$LOG_FILE" 2>&1

echo "BrowserOS launched with profile: $PROFILE_DIR"
