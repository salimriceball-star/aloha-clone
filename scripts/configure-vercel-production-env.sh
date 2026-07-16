#!/usr/bin/env bash
set -euo pipefail

project_name="aloha-clone"
site_url="https://aloha-yt.xyz"
deploy=false
dry_run=false

usage() {
  cat <<'EOF'
Usage: bash scripts/configure-vercel-production-env.sh [--deploy] [--dry-run]

  --deploy   환경변수 설정 후 Production 배포까지 실행
  --dry-run  Vercel을 변경하지 않고 로컬 입력 가능 여부만 확인
EOF
}

for arg in "$@"; do
  case "$arg" in
    --deploy) deploy=true ;;
    --dry-run) dry_run=true ;;
    -h|--help) usage; exit 0 ;;
    *) printf '알 수 없는 옵션: %s\n' "$arg" >&2; usage >&2; exit 2 ;;
  esac
done

project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root"

vercel_cli() {
  bash "$project_root/scripts/vercel-cli.sh" "$@"
}

read_env_value() {
  local key=$1
  shift
  local file line value
  for file in "$@"; do
    [[ -f "$file" ]] || continue
    while IFS= read -r line || [[ -n "$line" ]]; do
      line=${line%$'\r'}
      line=${line#export }
      [[ "$line" == "$key="* ]] || continue
      value=${line#*=}
      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value=${value:1:${#value}-2}
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value=${value:1:${#value}-2}
      fi
      printf '%s' "$value"
      return 0
    done < "$file"
  done
  return 1
}

read_local_or_derived_value() {
  local key=$1
  local value cloudinary_url parsed
  value=$(read_env_value "$key" "${local_files[@]}" || true)
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return 0
  fi
  case "$key" in
    SUPABASE_DATABASE_URL)
      value=$(read_env_value SUPABASE_DIRECT_URL "${local_files[@]}" || true)
      [[ -n "$value" ]] || return 1
      printf '%s' "$value"
      ;;
    CLOUDINARY_CLOUD_NAME|CLOUDINARY_API_KEY)
      cloudinary_url=$(read_env_value CLOUDINARY_URL "${local_files[@]}" || true)
      [[ -n "$cloudinary_url" ]] || return 1
      parsed=${cloudinary_url#cloudinary://}
      if [[ "$key" == CLOUDINARY_CLOUD_NAME ]]; then
        parsed=${parsed##*@}
        parsed=${parsed%%/*}
        parsed=${parsed%%\?*}
        printf '%s' "$parsed"
      else
        parsed=${parsed%@*}
        printf '%s' "${parsed%%:*}"
      fi
      ;;
    *) return 1 ;;
  esac
}

prompt_hidden() {
  local key=$1
  local value first second
  while true; do
    read -r -s -p "$key 값을 붙여넣으세요: " first
    printf '\n'
    read -r -s -p "$key 값을 한 번 더 붙여넣으세요: " second
    printf '\n'
    if [[ -n "$first" && "$first" == "$second" ]]; then
      value=$first
      break
    fi
    printf '값이 비어 있거나 서로 다릅니다. 다시 입력하세요.\n' >&2
  done
  printf '%s' "$value"
}

local_files=(.local/admin.env .local/supabase.env .local/cloudinary.env)

if $dry_run; then
  printf '[dry-run] 프로젝트: %s\n' "$project_name"
  printf '[dry-run] NEXT_PUBLIC_SITE_URL: %s\n' "$site_url"
  for key in ADMIN_PASSWORD ADMIN_SESSION_SECRET SUPABASE_DATABASE_URL CRON_SECRET CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY; do
    if read_local_or_derived_value "$key" >/dev/null; then
      printf '[dry-run] %-32s 로컬 파일에서 사용 가능\n' "$key"
    else
      printf '[dry-run] %-32s 원격에 없으면 숨김 입력/자동 생성 필요\n' "$key"
    fi
  done
  if read_env_value CLOUDINARY_API_SECRET "${local_files[@]}" >/dev/null || read_env_value CLOUDINARY_URL "${local_files[@]}" >/dev/null; then
    printf '[dry-run] %-32s 로컬 파일에서 사용 가능\n' 'Cloudinary secret/URL'
  else
    printf '[dry-run] %-32s 원격에 없으면 숨김 입력 필요\n' 'Cloudinary secret/URL'
  fi
  exit 0
fi

printf '1/5 Vercel 로그인 상태를 확인합니다. 브라우저 로그인이 뜨면 완료하세요.\n'
if ! vercel_cli whoami >/dev/null 2>&1; then
  vercel_cli login
  vercel_cli whoami >/dev/null
fi

if [[ ! -f .vercel/project.json ]]; then
  printf '2/5 이 폴더를 Vercel 프로젝트에 연결합니다. 팀과 %s 프로젝트를 선택하세요.\n' "$project_name"
  vercel_cli link
else
  printf '2/5 기존 .vercel 프로젝트 연결을 사용합니다.\n'
fi

if [[ -f .vercel/project.json ]] && ! grep -Eq '"projectName"[[:space:]]*:[[:space:]]*"aloha-clone"' .vercel/project.json; then
  printf '경고: 연결 파일에서 projectName=aloha-clone을 확인하지 못했습니다.\n' >&2
  printf 'cat .vercel/project.json으로 프로젝트를 확인한 뒤 다시 실행하세요.\n' >&2
  exit 1
fi

printf '3/5 현재 Production 환경변수 이름을 조회합니다. 값은 출력하지 않습니다.\n'
env_listing=$(NO_COLOR=1 vercel_cli env ls production 2>&1)

has_remote_env() {
  local key=$1
  grep -Eq "(^|[[:space:]])${key}([[:space:]]|$)" <<<"$env_listing"
}

put_env() {
  local key=$1
  local value=$2
  local sensitive=${3:-true}
  local args=(env add "$key" production --force)
  if [[ "$sensitive" == true ]]; then
    args+=(--sensitive)
  fi
  printf '%s' "$value" | vercel_cli "${args[@]}" >/dev/null
  printf '  설정 완료: %s\n' "$key"
}

keep_or_create() {
  local key=$1
  local generation=${2:-prompt}
  local value=""
  if has_remote_env "$key"; then
    printf '  기존 값 유지: %s\n' "$key"
    return 0
  fi
  value=$(read_local_or_derived_value "$key" || true)
  if [[ -n "$value" ]]; then
    printf '  로컬 비공개 파일의 값을 사용: %s\n' "$key"
  elif [[ "$generation" == session ]]; then
    value=$(openssl rand -base64 48 | tr -d '\r\n')
    printf '  새 무작위 값 생성: %s\n' "$key"
  elif [[ "$generation" == cron ]]; then
    value=$(openssl rand -hex 32 | tr -d '\r\n')
    printf '  새 무작위 값 생성: %s\n' "$key"
  else
    value=$(prompt_hidden "$key")
  fi
  put_env "$key" "$value" true
  unset value
}

printf '4/5 Production 환경변수를 설정합니다. 이미 있는 비밀값은 회전시키지 않습니다.\n'
put_env NEXT_PUBLIC_SITE_URL "$site_url" false
keep_or_create ADMIN_PASSWORD
keep_or_create ADMIN_SESSION_SECRET session
keep_or_create SUPABASE_DATABASE_URL
keep_or_create CRON_SECRET cron
keep_or_create CLOUDINARY_CLOUD_NAME
keep_or_create CLOUDINARY_API_KEY

if has_remote_env CLOUDINARY_API_SECRET || has_remote_env CLOUDINARY_URL; then
  printf '  기존 값 유지: CLOUDINARY_API_SECRET 또는 CLOUDINARY_URL\n'
else
  cloudinary_secret=$(read_env_value CLOUDINARY_API_SECRET "${local_files[@]}" || true)
  cloudinary_url=$(read_env_value CLOUDINARY_URL "${local_files[@]}" || true)
  if [[ -n "$cloudinary_secret" ]]; then
    put_env CLOUDINARY_API_SECRET "$cloudinary_secret" true
  elif [[ -n "$cloudinary_url" ]]; then
    put_env CLOUDINARY_URL "$cloudinary_url" true
  else
    cloudinary_secret=$(prompt_hidden CLOUDINARY_API_SECRET)
    put_env CLOUDINARY_API_SECRET "$cloudinary_secret" true
  fi
  unset cloudinary_secret cloudinary_url
fi

cloudinary_folder=$(read_env_value CLOUDINARY_FOLDER "${local_files[@]}" || true)
if [[ -n "$cloudinary_folder" ]] && ! has_remote_env CLOUDINARY_FOLDER; then
  put_env CLOUDINARY_FOLDER "$cloudinary_folder" false
fi
unset cloudinary_folder

printf '5/5 설정된 Production 변수 이름을 표시합니다.\n'
NO_COLOR=1 vercel_cli env ls production

if $deploy; then
  printf '새 환경변수를 적용한 Production 배포를 시작합니다.\n'
  vercel_cli deploy --prod --yes
else
  printf '\n환경변수는 기존 배포에 소급 적용되지 않습니다. 다음 명령으로 배포하세요:\n'
  printf '  npm run vercel:configure-env -- --deploy\n'
fi
