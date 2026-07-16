#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root"
umask 077

if ! command -v pg_dump >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
  cat >&2 <<'EOF'
PostgreSQL client가 없습니다. Ubuntu 24.04에서 아래 두 줄을 먼저 실행하세요.

  sudo apt-get update
  sudo apt-get install -y postgresql-client-16

설치 후 npm run backup:supabase를 다시 실행하세요.
EOF
  exit 2
fi

database_url=${SUPABASE_BACKUP_DATABASE_URL:-}
if [[ -z "$database_url" ]]; then
  read -r -s -p 'Supabase direct 또는 session pooler(:5432) URI를 붙여넣으세요: ' database_url
  printf '\n'
fi

if [[ "$database_url" != postgres://* && "$database_url" != postgresql://* ]]; then
  printf '오류: postgres:// 또는 postgresql:// URI가 아닙니다.\n' >&2
  exit 1
fi
if [[ "$database_url" == *:6543/* ]]; then
  printf '오류: transaction pooler :6543 대신 direct/session pooler :5432 URI를 사용하세요.\n' >&2
  exit 1
fi

timestamp=$(date +%Y%m%d-%H%M%S)
backup_dir="$HOME/aloha-backups/$timestamp"
mkdir -p "$backup_dir"

server_version=$(PGDATABASE="$database_url" PGCONNECT_TIMEOUT=10 psql -Atqc 'show server_version_num' 2>/dev/null || true)
if [[ ! "$server_version" =~ ^[0-9]+$ ]]; then
  printf '오류: DB 연결 또는 server version 확인에 실패했습니다. URI와 네트워크를 확인하세요.\n' >&2
  exit 1
fi
server_major=$((server_version / 10000))
client_major=$(pg_dump --version | sed -E 's/.* ([0-9]+).*/\1/')
if (( client_major < server_major )); then
  printf '오류: pg_dump %s가 서버 PostgreSQL %s보다 오래됐습니다. 같거나 최신 client를 설치하세요.\n' "$client_major" "$server_major" >&2
  exit 1
fi
printf 'PostgreSQL server=%s, pg_dump=%s 호환 확인\n' "$server_major" "$client_major"

run_dump() {
  PGDATABASE="$database_url" PGCONNECT_TIMEOUT=15 MAX_TREE_RSS_MB=1400 MIN_AVAILABLE_MB=700 \
    "$project_root/scripts/run-guarded.sh" pg_dump "$@"
}

printf '1/3 public schema를 백업합니다.\n'
run_dump --schema=public --schema-only --no-owner --no-privileges -f "$backup_dir/schema.sql"
printf '2/3 public data를 백업합니다.\n'
run_dump --schema=public --data-only --no-owner --no-privileges -f "$backup_dir/data.sql"
unset database_url

for file in schema.sql data.sql; do
  if [[ ! -s "$backup_dir/$file" ]]; then
    printf '오류: %s가 비어 있습니다. 백업을 신뢰하지 말고 원인을 확인하세요.\n' "$backup_dir/$file" >&2
    exit 1
  fi
done

printf '3/3 checksum을 생성합니다.\n'
(cd "$backup_dir" && sha256sum schema.sql data.sql > SHA256SUMS && sha256sum -c SHA256SUMS)

printf '\n백업 완료: %s\n' "$backup_dir"
printf '이 폴더를 암호화된 외부 저장소에 복사하세요. Git에는 추가하지 마세요.\n'
