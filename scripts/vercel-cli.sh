#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
runtime_dir="$project_root/.local/vercel-cli-runtime"
node_bin="$runtime_dir/node_modules/node/bin/node"
vercel_bin="$runtime_dir/node_modules/vercel/dist/index.js"

needs_install=false
if [[ ! -x "$node_bin" || ! -f "$vercel_bin" ]]; then
  needs_install=true
else
  node_major=$("$node_bin" --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)
  if [[ "$node_major" != "24" ]]; then
    needs_install=true
  fi
fi

if [[ "$needs_install" == true ]]; then
  printf '전용 Node 24 + Vercel CLI를 .local에 설치하거나 갱신합니다.\n' >&2
  mkdir -p "$runtime_dir"
  npm_config_loglevel=error MAX_TREE_RSS_MB=1200 MIN_AVAILABLE_MB=700 \
    "$project_root/scripts/run-guarded.sh" npm install \
      --prefix "$runtime_dir" --no-save --no-package-lock node@24 vercel@latest
fi

exec "$node_bin" "$vercel_bin" "$@"
