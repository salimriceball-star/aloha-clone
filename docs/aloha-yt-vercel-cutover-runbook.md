# aloha-yt.xyz → Vercel 안전 전환 실행서

이 문서는 기존 Lightsail WordPress의 `aloha-yt.xyz`를 Vercel의 `aloha-clone` 프로젝트로 옮길 때 사용하는 순서형 체크리스트다. DNS 제공자가 표시하는 값과 Vercel `Settings → Domains`가 제시하는 값을 최종 기준으로 삼는다.

## 1. SSH 키와 HTTPS 인증서 구분

- SSH 키/인증서는 Lightsail 서버 셸 접속에 사용한다. Vercel 운영 배포에는 일반적인 서버 SSH 접속 절차가 없다.
- 브라우저의 `https://`는 TLS(통상 SSL이라고 부름) 인증서를 사용한다. SSH 키와 별개다.
- Vercel은 프로젝트에 도메인을 추가하고 DNS 검증이 성공하면 Let’s Encrypt TLS 인증서를 자동 발급하고 갱신한다. 개인키를 내려받거나 Lightsail 인증서를 복사할 필요가 없다.
- DNS가 Vercel에 도달하지 않거나 CAA가 Let’s Encrypt를 금지하면 인증서가 발급되지 않을 수 있다. 따라서 DNS부터 바꾸지 말고 반드시 Vercel에 도메인을 먼저 추가한다.

공식 문서: [Vercel custom domain 설정](https://vercel.com/docs/domains/set-up-custom-domain), [Vercel SSL 인증서](https://vercel.com/docs/domains/working-with-ssl), [Vercel 도메인 문제 해결](https://vercel.com/docs/domains/troubleshooting)

## 2. 2026-07-14 전환 전 DNS 기준점

실행 직전에 다시 조회해야 한다. 현재 확인된 값은 다음과 같다.

| 항목 | 현재 값 | 전환 원칙 |
|---|---|---|
| authoritative NS | `dns1.registrar-servers.com`, `dns2.registrar-servers.com` | 네임서버는 변경하지 않는 것을 권장 |
| apex A | `3.37.189.12`, TTL 약 1800초 | Vercel이 화면에 제시한 A 값으로 교체 |
| `www` | 레코드 없음 | Vercel이 제시한 CNAME 추가 |
| AAAA | 없음 | 외부 DNS 사용 시 임의로 추가하지 않음 |
| CAA | 없음 | 그대로 두면 Let’s Encrypt 허용. 향후 CAA를 만들면 `0 issue "letsencrypt.org"` 허용 필요 |
| `_acme-challenge` TXT | 없음 | 충돌 없음 |
| Google TXT | `google-site-verification=...` 존재 | 삭제하지 않음 |
| MX/SPF | Namecheap email forwarding 레코드 존재 | 삭제하지 않음 |
| 기존 TLS | Lightsail/Apache의 Let’s Encrypt, 2026-09-09 만료 | Vercel 인증서와 별개; 복사하지 않음 |

네임서버를 Vercel로 통째로 바꾸면 MX·SPF·Google TXT를 새 DNS에 모두 복제해야 한다. 이번 전환은 그럴 이유가 없으므로 기존 DNS에서 A/CNAME만 수정한다.

## 3. 24시간 전: 백업과 롤백 준비

1. Lightsail 인스턴스 snapshot을 만든다.
2. WordPress DB와 `wp-content/uploads` 백업이 열리는지 확인한다.
3. Supabase DB dump를 별도 저장한다. Free 플랜은 자동 백업을 제공하지 않으므로 keepalive와 별개로 필요하다.
4. 현재 DNS 화면을 캡처하고 apex A의 이전 값 `3.37.189.12`를 기록한다.
5. Lightsail 인스턴스와 기존 인증서를 전환 후 최소 2주 유지한다.
6. DNS apex A의 TTL을 제공자가 허용하는 60~300초로 낮춘다. 변경 전 TTL 약 1800초가 만료되도록 최소 30분 기다린다.

Supabase 수동 백업 예시다. `SUPABASE_BACKUP_DATABASE_URL`에는 Dashboard `Connect`에서 복사한 direct connection 또는 session pooler `:5432` URI를 넣는다. 애플리케이션용 transaction pooler `:6543` URI와 구분한다.

```bash
umask 077
BACKUP_DIR="$HOME/aloha-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
supabase db dump --db-url "$SUPABASE_BACKUP_DATABASE_URL" -f "$BACKUP_DIR/schema.sql"
supabase db dump --db-url "$SUPABASE_BACKUP_DATABASE_URL" -f "$BACKUP_DIR/data.sql" --data-only --use-copy
sha256sum "$BACKUP_DIR"/*.sql > "$BACKUP_DIR/SHA256SUMS"
```

백업 파일과 DB URL은 Git에 추가하지 않는다. 암호화된 외장 저장소/클라우드에 한 벌을 복사하고, 분기마다 임시 Supabase 프로젝트로 복원 시험을 한다. [Supabase 백업 공식 문서](https://supabase.com/docs/guides/platform/backups), [CLI 백업/복원](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

## 4. Vercel 운영 환경변수 확인

Vercel Dashboard → `aloha-clone` → `Settings` → `Environment Variables`에서 아래 값을 `Production`에 설정한다. 기존 값을 문서나 채팅에 복사하지 않는다.

필수:

- `NEXT_PUBLIC_SITE_URL=https://aloha-yt.xyz`
- `ADMIN_PASSWORD`: DB 암호와 다른 관리자 전용 암호
- `ADMIN_SESSION_SECRET`: `openssl rand -base64 48`로 생성한 독립 값
- `SUPABASE_DATABASE_URL`: Supavisor transaction pooler 포트 `6543` URI
- `CRON_SECRET`: `openssl rand -hex 32`로 생성
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET` 또는 완전한 `CLOUDINARY_URL`

선택/기존 설정 유지:

- `GOOGLE_SITE_VERIFICATION`: meta 방식 검증을 병행할 때 사용. DNS TXT 검증이 유지되면 필수는 아님
- `CLOUDINARY_FOLDER`, `SITE_STORAGE_PREFIX`, `SOURCE_BASE_URL`

`ADMIN_SESSION_SECRET`, DB URL, Cloudinary secret, `CRON_SECRET`에는 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. 환경변수를 저장한 뒤 최신 `main`으로 Production 재배포하고 Deployment 상태가 `Ready`인지 확인한다.

## 5. DNS 변경 전에 Vercel 배포 검증

도메인을 건드리기 전에 임시 운영 주소에서 검사한다.

```bash
npm run audit:seo -- https://aloha-clone.vercel.app
curl -I https://aloha-clone.vercel.app/
curl -I https://aloha-clone.vercel.app/feed.xml
curl -I https://aloha-clone.vercel.app/sitemap.xml
```

모두 통과한 뒤 다음도 직접 확인한다.

1. `/loginpage` 로그인
2. 관리자 대시보드의 Supabase 연결 상태
3. 임시/테스트 상품 편집 저장 후 재진입 시 값 유지
4. 드래그앤드롭 이미지 업로드의 Cloudinary 성공 메시지와 공개 글 이미지 표시
5. 장바구니·checkout·주문 완료 페이지

하나라도 실패하면 DNS를 변경하지 않는다.

## 6. Vercel에 도메인을 먼저 등록

1. Vercel Dashboard → `aloha-clone` → `Settings` → `Domains`를 연다.
2. `aloha-yt.xyz`를 추가하고 Production 배포에 연결한다.
3. `www.aloha-yt.xyz`도 추가한다.
4. 기존 URL 보존을 위해 최종 주 도메인은 apex `aloha-yt.xyz`로 정한다. 다만 canary 검사 전에는 `www`를 apex로 redirect하지 않고 같은 Production 배포 alias로 둔다.
5. 화면에 표시되는 apex A와 `www` CNAME 값을 별도로 기록한다. 인터넷 예시 IP를 복사하지 말고 이 프로젝트 화면의 값을 사용한다.
6. 도메인이 다른 Vercel 계정에 등록됐다는 메시지가 나오면 Vercel이 제시하는 TXT 소유권 검증부터 완료한다.

## 7. DNS 제공자에서 최소 레코드만 변경

1. 사용자 트래픽이 없는 현재 `www`부터 Vercel 화면의 CNAME으로 추가한다.
2. `www`가 `Valid Configuration`이 되고 `https://www.aloha-yt.xyz`에서 인증서와 새 사이트가 정상인지 확인한다. 실패하면 apex는 건드리지 않고 원인을 해결한다.
3. canary가 통과하면 기존 apex `@` A 레코드 `3.37.189.12`를 Vercel 화면의 A 값으로 교체한다.
4. apex 인증서와 새 사이트가 정상화된 뒤 Vercel에서 `www`를 `https://aloha-yt.xyz`로 영구 redirect한다.
5. 충돌하는 기존 apex A 또는 `www` A/CNAME이 여러 개 남지 않았는지 확인한다.
6. AAAA를 임의로 추가하지 않는다. 기존 AAAA가 생겼다면 Vercel 안내와 일치하지 않는 한 제거한다.
7. 기존 MX, SPF TXT, Google verification TXT는 그대로 둔다.
8. CAA가 여전히 없다면 추가 작업이 필요 없다. 다른 CAA가 존재한다면 `CAA 0 issue "letsencrypt.org"`를 함께 허용한다.
9. `/.well-known` 또는 `_acme-challenge`를 다른 서버로 보내는 프록시·redirect는 만들지 않는다.

## 8. DNS 전파와 Vercel TLS 발급 확인

DNS 캐시 때문에 일부 방문자는 잠시 Lightsail, 일부는 Vercel을 볼 수 있다. 양쪽 서비스를 동시에 정상 상태로 유지한다.

```bash
dig +short A aloha-yt.xyz @1.1.1.1
dig +short A aloha-yt.xyz @8.8.8.8
dig +short CNAME www.aloha-yt.xyz @1.1.1.1
dig +noall +answer aloha-yt.xyz CAA
dig +noall +answer _acme-challenge.aloha-yt.xyz TXT
```

Vercel `Settings → Domains`에서 두 도메인이 `Valid Configuration`이고 인증서가 발급될 때까지 기다린다. DNS 검증 후 보통 수분이지만 전파에는 더 오래 걸릴 수 있다.

TLS 확인:

```bash
curl -I http://aloha-yt.xyz/
curl -I https://aloha-yt.xyz/
curl -I https://www.aloha-yt.xyz/
openssl s_client -connect aloha-yt.xyz:443 -servername aloha-yt.xyz </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

합격 조건:

- `http://aloha-yt.xyz`가 HTTPS로 redirect
- `https://aloha-yt.xyz`가 인증서 경고 없이 200
- `www`가 선택한 주 도메인으로 redirect
- 인증서 SAN에 접속한 hostname 존재
- 발급자·유효기간이 정상이며 Vercel Domains에 오류 없음

## 9. 운영 도메인 기능·SEO 검증

```bash
npm run audit:seo -- https://aloha-yt.xyz
curl -I https://aloha-yt.xyz/wp-sitemap.xml
curl -I https://aloha-yt.xyz/sitemap_index.xml
curl -I https://aloha-yt.xyz/feed
```

SEO 감사가 모두 통과하고 세 legacy 주소가 각각 새 sitemap/feed로 영구 redirect되는지 확인한다. 홈, `/227`, 대표 글, 대표 상품, 관리자 저장, 이미지 업로드, checkout을 다시 확인한다.

## 10. Google Search Console

1. 기존 `google-site-verification` DNS TXT를 삭제하지 않는다.
2. Search Console의 `aloha-yt.xyz` Domain property에서 소유권이 유지되는지 확인한다.
3. `https://aloha-yt.xyz/sitemap.xml`을 제출한다.
4. 홈·대표 글·대표 상품을 URL 검사 → 실제 URL 테스트한다.
5. Page indexing, HTTPS, Core Web Vitals, Product snippets 경고를 주 1회 확인한다.
6. 같은 도메인과 permalink를 유지하므로 Change of Address는 사용하지 않는다.

사이트맵은 발견을 돕는 힌트이며 색인·순위를 보장하지 않는다. [Google sitemap 공식 문서](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

## 11. 장애 알림과 정기 운영

외부 uptime 서비스에 다음을 5분 간격 HTTPS 모니터로 등록한다.

- `https://aloha-yt.xyz/`: 200
- `https://aloha-yt.xyz/sitemap.xml`: 200
- `https://aloha-yt.xyz/robots.txt`: 200
- 대표 공개 상품 URL: 200

알림은 최소 이메일과 메신저 두 경로로 보낸다. `/api/cron/supabase-health`의 secret을 외부 uptime 서비스에 맡기지 말고 Vercel Function/Cron 로그와 `/loginpage/dashboard`의 최근 성공 시각을 매일 확인한다.

- 매주: Vercel 오류·Search Console·Dependabot 확인
- 매월: Supabase schema/data dump와 checksum 생성, 복사본 확인
- 분기: 임시 DB 복원 시험
- 연 1회: 관리자·DB·Cloudinary secret 교체
- 안정화 2주 후: TTL을 1800~3600초로 복원하고 Lightsail 종료 여부 결정

## 12. HTTPS가 안 될 때의 순서

1. Vercel 프로젝트에 정확히 두 도메인이 추가됐는지 확인한다.
2. `dig` 결과가 Vercel Domains 화면의 값과 같은지 확인한다.
3. 오래된/중복 A, 잘못된 `www` 레코드, AAAA가 없는지 확인한다.
4. CAA가 있다면 Let’s Encrypt가 허용됐는지 확인한다.
5. 기존 `_acme-challenge` TXT/CNAME이 다른 인증기관을 고정하지 않는지 확인한다.
6. Cloudflare 등을 사용한다면 인증서 발급 중 proxy를 잠시 DNS-only로 두고 재검증한다.
7. DNSSEC 오류가 의심되면 DNSViz로 확인한다. DNSSEC를 무작정 끄지 말고 DS와 zone 서명 불일치를 먼저 확인한다.
8. Vercel Domain 상태와 Function 로그를 확인한 뒤 재검증한다.

## 13. 롤백

Vercel 배포·DB·TLS 중 중대한 문제가 있고 즉시 해결되지 않으면 다음 순서로 되돌린다.

1. DNS apex A를 기록해 둔 `3.37.189.12`로 복원한다.
2. `www`도 이전 정책에 맞게 제거하거나 이전 대상으로 복구한다.
3. DNS가 전파될 때까지 Vercel과 Lightsail을 모두 유지한다.
4. Lightsail의 `https://aloha-yt.xyz` 200과 기존 인증서가 정상인지 확인한다.
5. 장애 원인을 수정하고 임시 Vercel 주소에서 전체 검증한 뒤 새 전환 시간을 잡는다.

낮은 TTL과 살아 있는 Lightsail이 핵심 예방책이다. DNS 전환 직후 Lightsail을 중지하거나 삭제하면 빠른 롤백이 불가능하다.
