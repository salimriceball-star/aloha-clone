#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 2
fi

MAX_TREE_RSS_MB="${MAX_TREE_RSS_MB:-1400}"
MIN_AVAILABLE_MB="${MIN_AVAILABLE_MB:-700}"
POLL_INTERVAL_SEC="${POLL_INTERVAL_SEC:-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
LOG_FILE="$LOG_DIR/guard-$STAMP.log"

mkdir -p "$LOG_DIR"

get_descendants() {
  local pid="$1"
  echo "$pid"
  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  if [ -n "$children" ]; then
    while IFS= read -r child; do
      [ -n "$child" ] && get_descendants "$child"
    done <<< "$children"
  fi
}

tree_rss_kb() {
  local root_pid="$1"
  local pids
  pids="$(get_descendants "$root_pid" | tr '\n' ' ')"
  if [ -z "${pids// }" ]; then
    echo 0
    return
  fi
  ps -o rss= -p $pids 2>/dev/null | awk '{sum += $1} END {print sum + 0}'
}

available_mb() {
  awk '/MemAvailable:/ {printf "%d", $2 / 1024}' /proc/meminfo
}

kill_tree() {
  local root_pid="$1"
  local pids
  pids="$(get_descendants "$root_pid" | tac | tr '\n' ' ')"
  [ -n "${pids// }" ] || return 0
  kill -TERM $pids 2>/dev/null || true
  sleep 3
  kill -KILL $pids 2>/dev/null || true
}

echo "[$(date '+%F %T')] starting guarded command: $*" | tee -a "$LOG_FILE"
echo "[$(date '+%F %T')] thresholds: max_tree_rss_mb=$MAX_TREE_RSS_MB min_available_mb=$MIN_AVAILABLE_MB poll_interval_sec=$POLL_INTERVAL_SEC" | tee -a "$LOG_FILE"

"$@" &
child_pid="$!"

echo "[$(date '+%F %T')] child_pid=$child_pid" | tee -a "$LOG_FILE"

while kill -0 "$child_pid" 2>/dev/null; do
  current_rss_mb="$(( $(tree_rss_kb "$child_pid") / 1024 ))"
  current_available_mb="$(available_mb)"
  echo "[$(date '+%F %T')] rss_mb=$current_rss_mb available_mb=$current_available_mb" >> "$LOG_FILE"

  if [ "$current_rss_mb" -gt "$MAX_TREE_RSS_MB" ]; then
    echo "[$(date '+%F %T')] limit exceeded: rss_mb=$current_rss_mb > $MAX_TREE_RSS_MB" | tee -a "$LOG_FILE"
    kill_tree "$child_pid"
    exit 124
  fi

  if [ "$current_available_mb" -lt "$MIN_AVAILABLE_MB" ]; then
    echo "[$(date '+%F %T')] low memory: available_mb=$current_available_mb < $MIN_AVAILABLE_MB" | tee -a "$LOG_FILE"
    kill_tree "$child_pid"
    exit 125
  fi

  sleep "$POLL_INTERVAL_SEC"
done

set +e
wait "$child_pid"
status="$?"
set -e
echo "[$(date '+%F %T')] child_exit_status=$status" | tee -a "$LOG_FILE"
exit "$status"
