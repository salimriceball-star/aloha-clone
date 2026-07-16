#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
runtime_dir="$project_root/.local/vercel-cli-runtime"
node_bin="$runtime_dir/node_modules/node/bin/node"
vercel_bin="$runtime_dir/node_modules/vercel/dist/index.js"

if [[ ! -x "$node_bin" || ! -f "$vercel_bin" ]]; then
  printf '전용 Node 20 + Vercel CLI를 .local에 한 번만 설치합니다.\n' >&2
  mkdir -p "$runtime_dir"
  npm_config_loglevel=error MAX_TREE_RSS_MB=1200 MIN_AVAILABLE_MB=700 \
    "$project_root/scripts/run-guarded.sh" npm install \
      --prefix "$runtime_dir" --no-save --no-package-lock node@20 vercel@latest
fi

exec "$node_bin" "$vercel_bin" "$@"
