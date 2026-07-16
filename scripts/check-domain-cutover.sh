#!/usr/bin/env bash
set -uo pipefail

mode=${1:-}
domain="aloha-yt.xyz"
www_domain="www.aloha-yt.xyz"
vercel_url="https://aloha-clone.vercel.app"
failures=0

usage() {
  cat <<'EOF'
Usage: bash scripts/check-domain-cutover.sh baseline|canary|production|diagnose

  baseline    DNS 변경 전 Vercel 배포 확인
  canary      www.aloha-yt.xyz가 Vercel/TLS로 정상 연결됐는지 확인
  production  apex 전환, www redirect, sitemap/SEO 전체 확인
  diagnose    DNS·CAA·ACME·TLS·HTTP 원본 정보를 출력
EOF
}

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; failures=$((failures + 1)); }

require_command() {
  command -v "$1" >/dev/null 2>&1 || { printf '필수 명령이 없습니다: %s\n' "$1" >&2; exit 2; }
}

for command in curl dig openssl; do require_command "$command"; done

http_code() {
  local code
  code=$(curl -sS -o /dev/null --max-time 20 -w '%{http_code}' "$1" 2>/dev/null || true)
  printf '%s' "${code:-000}"
}

headers() {
  curl -sSI --max-time 20 "$1" 2>/dev/null || true
}

has_vercel_header() {
  headers "$1" | tr -d '\r' | grep -Eqi '^x-vercel-id:'
}

tls_certificate() {
  local host=$1
  openssl s_client -connect "$host:443" -servername "$host" </dev/null 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null
}

check_200() {
  local url=$1
  local code
  code=$(http_code "$url")
  [[ "$code" == 200 ]] && pass "$url → 200" || fail "$url → $code (200 필요)"
}

case "$mode" in
  baseline)
    printf 'DNS 변경 전 Vercel Production 검사\n'
    check_200 "$vercel_url/"
    check_200 "$vercel_url/feed.xml"
    check_200 "$vercel_url/sitemap.xml"
    has_vercel_header "$vercel_url/" && pass 'Vercel 응답 헤더 확인' || fail 'x-vercel-id 헤더 없음'
    project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
    (cd "$project_root" && npm run audit:seo -- "$vercel_url" "https://$domain") || fail 'SEO audit 실패'
    ;;
  canary)
    printf 'www canary DNS/TLS 검사\n'
    cname=$(dig +short CNAME "$www_domain" @1.1.1.1 | tail -n 1)
    a_record=$(dig +short A "$www_domain" @1.1.1.1 | paste -sd, -)
    if [[ -n "$cname" ]]; then
      pass "$www_domain CNAME=$cname"
    elif [[ -n "$a_record" ]]; then
      pass "$www_domain A=$a_record"
    else
      fail "$www_domain A/CNAME 없음"
    fi
    if tls_certificate "$www_domain"; then pass "$www_domain TLS 인증서 확인"; else fail "$www_domain TLS 인증서 실패"; fi
    check_200 "https://$www_domain/"
    has_vercel_header "https://$www_domain/" && pass 'www가 Vercel 응답' || fail 'www x-vercel-id 헤더 없음'
    ;;
  production)
    printf 'apex Production DNS/TLS/SEO 검사\n'
    a_record=$(dig +short A "$domain" @1.1.1.1 | paste -sd, -)
    [[ -n "$a_record" && "$a_record" != "3.37.189.12" ]] && pass "$domain A=$a_record" || fail "$domain이 여전히 Lightsail A=$a_record"
    if tls_certificate "$domain"; then pass "$domain TLS 인증서 확인"; else fail "$domain TLS 인증서 실패"; fi
    check_200 "https://$domain/"
    has_vercel_header "https://$domain/" && pass 'apex가 Vercel 응답' || fail 'apex x-vercel-id 헤더 없음'
    www_code=$(http_code "https://$www_domain/")
    [[ "$www_code" == 301 || "$www_code" == 308 ]] && pass "www redirect → $www_code" || fail "www → $www_code (301/308 필요)"
    check_200 "https://$domain/feed.xml"
    check_200 "https://$domain/sitemap.xml"
    project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
    (cd "$project_root" && npm run audit:seo -- "https://$domain") || fail '운영 도메인 SEO audit 실패'
    ;;
  diagnose)
    printf '=== DNS ===\n'
    for name in "$domain" "$www_domain"; do
      printf '\n[%s]\n' "$name"
      dig +noall +answer "$name" A
      dig +noall +answer "$name" AAAA
      dig +noall +answer "$name" CNAME
      dig +noall +answer "$name" CAA
    done
    printf '\n[_acme-challenge]\n'
    dig +noall +answer "_acme-challenge.$domain" TXT
    dig +noall +answer "_acme-challenge.$domain" CNAME
    printf '\n=== TLS ===\n'
    tls_certificate "$domain" || true
    tls_certificate "$www_domain" || true
    printf '\n=== HTTP ===\n'
    for url in "http://$domain/" "https://$domain/" "https://$www_domain/"; do
      printf '\n[%s]\n' "$url"
      headers "$url" | sed -n '1,20p'
    done
    printf '\n진단 출력 완료. 위 값을 런북의 예상 상태와 비교하세요.\n'
    exit 0
    ;;
  *) usage; exit 2 ;;
esac

if (( failures > 0 )); then
  printf '\n총 %d개 검사 실패. 다음 단계로 진행하지 마세요.\n' "$failures" >&2
  exit 1
fi
printf '\n모든 검사 통과.\n'
