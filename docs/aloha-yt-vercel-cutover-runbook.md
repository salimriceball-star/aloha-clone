# aloha-yt.xyz → Vercel 복사·붙여넣기 전환 런북

이 문서는 `/home/ahn/aloha`에서 명령 블록을 위에서부터 하나씩 복사·붙여넣는 방식으로 사용한다. 각 검사에서 `FAIL`이 하나라도 나오면 바로 멈추고 다음 단계로 가지 않는다.

## 0. 터미널 준비

WSL/Ubuntu 터미널을 열고 아래 블록 전체를 붙여넣는다.

```bash
cd /home/ahn/aloha
export DOMAIN=aloha-yt.xyz
export WWW_DOMAIN=www.aloha-yt.xyz
export VERCEL_PROJECT=aloha-clone
export OLD_LIGHTSAIL_IP=3.37.189.12
pwd
git status --short
```

합격 조건:

- `pwd`가 `/home/ahn/aloha`
- `git status --short` 다음에 아무 내용도 나오지 않음

파일 목록이 나오면 아직 커밋하지 않은 변경이 있다는 뜻이다. 덮어쓰지 말고 먼저 변경 내용을 확인한다.

## 1. SSH와 HTTPS: 사용자가 준비할 인증서 없음

- SSH 키는 기존 Lightsail 서버 셸 접속과 비상 롤백용이다. 삭제하지 않는다.
- 브라우저 HTTPS는 TLS/SSL 인증서를 사용하며 SSH 키와 무관하다.
- Vercel은 DNS 검증 후 Let’s Encrypt 인증서를 자동 발급·갱신한다. Lightsail 인증서나 개인키를 Vercel로 복사하지 않는다.
- 인증서 발급 전 DNS부터 바꾸면 잠시 HTTPS 오류가 날 수 있다. 이 런북은 사용하지 않는 `www`에서 먼저 인증서를 시험한 후 apex를 전환한다.

사용자가 이 단계에서 할 일은 없다. SSH 키는 Lightsail 종료가 확정될 때까지 보관한다.

공식 문서: [Vercel custom domain](https://vercel.com/docs/domains/set-up-custom-domain), [Vercel SSL](https://vercel.com/docs/domains/working-with-ssl)

## 2. 현재 상태 저장

아래 명령을 붙여넣는다. 비밀값은 출력되지 않는다.

```bash
cd /home/ahn/aloha
npm run cutover:check -- diagnose | tee "$HOME/aloha-before-cutover.txt"
```

2026-07-16 기준 예상 상태:

| 항목 | 예상 값 |
|---|---|
| apex A | `3.37.189.12` |
| apex 서버 | `Apache`/WordPress |
| `www` | 레코드/HTTPS 없음 |
| AAAA·CAA·`_acme-challenge` | 없음 |
| 기존 apex 인증서 | Let’s Encrypt, 2026-09-09 만료 |

결과가 다르면 문서의 IP를 그대로 사용하지 말고 `$HOME/aloha-before-cutover.txt`에 저장된 실제 값을 롤백 기준으로 삼는다.

## 3. 백업과 롤백 준비

### 3-1. Lightsail snapshot

1. AWS Console에 로그인한다.
2. `Lightsail → Instances → 기존 aloha 인스턴스`를 연다.
3. `Snapshots` 탭을 누른다.
4. `Create snapshot`을 누른다.
5. 이름을 `aloha-before-vercel-20260716`으로 입력한다.
6. 상태가 `Available`이 될 때까지 기다린다.

`Available` 전에는 다음 단계로 가지 않는다.

### 3-2. Supabase public schema/data 백업

Supabase Dashboard → 해당 프로젝트 → `Connect`에서 direct connection 또는 session pooler `:5432` URI를 복사한다. 애플리케이션용 transaction pooler `:6543` URI를 사용하면 스크립트가 중단한다.

현재 WSL에는 PostgreSQL client가 기본 설치돼 있지 않다. 아래 두 줄을 먼저 붙여넣는다. `sudo` 암호를 물으면 WSL 사용자 암호를 입력한다.

```bash
sudo apt-get update
sudo apt-get install -y postgresql-client-16
```

아래 명령을 붙여넣고 URI 입력 요청이 나오면 붙여넣는다. 입력값은 화면에 표시되지 않는다.

```bash
cd /home/ahn/aloha
npm run backup:supabase
```

합격 조건:

- 마지막에 `백업 완료: /home/ahn/aloha-backups/...` 표시
- schema/data의 checksum이 모두 `OK`

이 프로젝트 데이터가 있는 `public` schema만 백업하며 Supabase가 관리하는 auth/storage 내부 schema는 포함하지 않는다. 표시된 폴더를 OneDrive 등 암호화된 외부 저장소에 한 벌 복사한다. Git 저장소에는 넣지 않는다. Supabase Free는 자동 일일 백업이 없으므로 이 백업은 생략하면 안 된다. [Supabase 백업](https://supabase.com/docs/guides/platform/backups)

### 3-3. DNS TTL 낮추기

현재 authoritative DNS는 Namecheap 계열 `registrar-servers.com`이다.

1. Namecheap에 로그인한다.
2. `Domain List → aloha-yt.xyz → Manage → Advanced DNS`를 연다.
3. `Host Records`의 `A Record`, Host `@`, Value `3.37.189.12` 행을 찾는다.
4. TTL을 `5 min`으로 변경하고 저장한다. Value는 아직 바꾸지 않는다.
5. 기존 TTL 약 1800초가 빠질 때까지 30분 기다린다.

30분 후 아래를 붙여넣는다.

```bash
dig +noall +answer aloha-yt.xyz A
```

TTL 숫자가 300 이하로 내려오면 합격이다. Namecheap이 `Automatic`만 허용하면 현재 TTL이 만료된 뒤 진행하되, 롤백 전파가 더 느릴 수 있음을 감수한다.

## 4. Vercel Production 환경변수 설정과 재배포

수동으로 `vercel env add`를 반복하지 않는다. 이미 존재하는 변수 때문에 다음 오류가 나기 때문이다.

```text
A variable with the name NEXT_PUBLIC_SITE_URL already exists ...
```

아래 스크립트는 다음 규칙으로 동작한다.

- `NEXT_PUBLIC_SITE_URL`은 Production에 `https://aloha-yt.xyz`로 강제 갱신
- 기존 Production 비밀값은 유지
- 없는 `ADMIN_SESSION_SECRET`, `CRON_SECRET`은 자동 생성
- `.local/cloudinary.env`의 `CLOUDINARY_URL`에서 cloud name/API key를 값 노출 없이 추출
- 없는 관리자 암호·Supabase URL만 숨김 입력 요청
- 설정 완료 후 새 Production 배포 실행

먼저 변경 없는 예행연습을 붙여넣는다.

```bash
cd /home/ahn/aloha
npm run vercel:configure-env -- --dry-run
```

이어서 실제 설정과 배포를 붙여넣는다.

```bash
cd /home/ahn/aloha
npm run vercel:configure-env -- --deploy
```

첫 실행 시:

1. `.local`에 전용 Node 20+Vercel CLI를 한 번 설치한다. Git에는 포함되지 않는다.
2. 브라우저 로그인 화면이 뜨면 현재 Vercel 계정으로 승인한다.
3. 프로젝트 연결 질문이 나오면 팀 `salimriceball-5026s-projects`를 선택한다.
4. 기존 프로젝트 `aloha-clone`을 선택한다. 새 프로젝트를 만들지 않는다.
5. `SUPABASE_DATABASE_URL` 입력 요청이 나오면 Supabase `Connect → Transaction pooler`, 포트 `6543` URI를 붙여넣는다.
6. `ADMIN_PASSWORD` 입력 요청이 나오면 DB 암호와 다른 관리자 암호를 두 번 붙여넣는다.
7. Cloudinary 값이 로컬 파일에 없을 때만 Cloudinary Dashboard `API Keys` 값을 붙여넣는다.

합격 조건:

- `설정 완료: NEXT_PUBLIC_SITE_URL`
- 기존 비밀은 `기존 값 유지`로 표시
- 마지막 Vercel 배포 상태가 `Production`/`Ready`

환경변수 변경은 이전 배포에 소급되지 않으므로 반드시 `--deploy`까지 실행한다. 스크립트는 공식 `vercel env add ... production --force` 방식을 사용한다. [Vercel env CLI](https://vercel.com/docs/cli/env)

스크립트 대신 `NEXT_PUBLIC_SITE_URL` 오류 하나만 수동 복구해야 할 때는 아래 두 줄을 붙여넣는다. 이 값은 비밀이 아니므로 shell history에 남아도 된다.

```bash
printf '%s' 'https://aloha-yt.xyz' | npm run vercel:cli -- env add NEXT_PUBLIC_SITE_URL production --force
npm run vercel:cli -- deploy --prod --yes
```

## 5. DNS 변경 전 Vercel 배포 합격 판정

아래 한 줄을 붙여넣는다.

```bash
cd /home/ahn/aloha
npm run cutover:check -- baseline
```

이 검사는 다음을 자동 확인한다.

- `https://aloha-clone.vercel.app/`, `/feed.xml`, `/sitemap.xml` 200
- Vercel 응답 헤더
- 접속은 Vercel 임시 주소로 하되 canonical·robots·sitemap origin은 `https://aloha-yt.xyz`
- Organization/Article/Product JSON-LD와 noindex 정책

모든 항목이 `PASS`이고 마지막이 `모든 검사 통과`여야 한다.

2026-07-16 사전 검사에서는 배포 URL의 canonical이 아직 `aloha-clone.vercel.app`이라 실패했다. 4단계의 환경변수 갱신·재배포 후 이 검사가 통과해야 DNS를 변경할 수 있다.

브라우저에서 아래 주소도 직접 확인한다.

- `https://aloha-clone.vercel.app/loginpage`: 로그인
- `https://aloha-clone.vercel.app/loginpage/dashboard`: Supabase 연결 정상
- `https://aloha-clone.vercel.app/loginpage/products`: 상품 목록/복사 버튼
- 테스트 상품 편집: 저장 후 재진입해 변경 유지
- 이미지 업로드: Cloudinary 성공 메시지와 공개 페이지 이미지 표시

하나라도 실패하면 여기서 멈춘다.

## 6. Vercel에 apex와 www 등록

아래 명령을 순서대로 붙여넣는다.

```bash
cd /home/ahn/aloha
npm run vercel:cli -- domains add www.aloha-yt.xyz aloha-clone
npm run vercel:cli -- domains add aloha-yt.xyz aloha-clone
npm run vercel:cli -- domains inspect www.aloha-yt.xyz
npm run vercel:cli -- domains inspect aloha-yt.xyz
```

`already exists`가 나오면 삭제하지 말고 이어지는 `domains inspect` 결과를 사용한다. 다른 Vercel 계정 소유라고 나오면 표시된 TXT verification 레코드를 Namecheap `Advanced DNS`에 먼저 추가하고 `inspect`를 다시 실행한다.

두 `inspect` 결과에서 요구하는 값을 메모한다.

```text
WWW_CNAME_VALUE=Vercel inspect가 표시한 www CNAME 값
APEX_A_VALUE=Vercel inspect가 표시한 apex A 값
```

인터넷 예제에 나온 IP/CNAME을 사용하지 않는다. 반드시 현재 프로젝트의 `inspect` 출력값을 복사한다.

Vercel Dashboard를 선호하면 `aloha-clone → Settings → Domains → Add Domain`에서 같은 두 도메인을 추가한다. 이 시점에는 `www`를 apex로 redirect하지 말고 Production alias로 둔다.

## 7. www canary를 먼저 연결

현재 `www`는 사용하지 않으므로 실제 방문자에게 영향 없이 Vercel DNS·TLS를 시험할 수 있다.

Namecheap에서:

1. `Domain List → aloha-yt.xyz → Manage → Advanced DNS`
2. `Host Records → Add New Record`
3. Type `CNAME Record`
4. Host `www`
5. Value에 6단계의 `WWW_CNAME_VALUE`를 붙여넣기
6. TTL `Automatic` 또는 `5 min`
7. 저장

저장 후 아래 명령을 반복 실행한다.

```bash
cd /home/ahn/aloha
npm run cutover:check -- canary
```

DNS 전파 중에는 실패할 수 있다. 5분 후 다시 실행한다. 합격 조건:

- `www.aloha-yt.xyz CNAME=...` PASS
- TLS 인증서 PASS
- `https://www.aloha-yt.xyz/ → 200` PASS
- `www가 Vercel 응답` PASS

`www`가 301/308이면 Vercel에서 apex redirect가 너무 일찍 설정된 것이다. Domain 설정에서 임시로 같은 Production deployment alias로 되돌린 뒤 canary를 다시 검사한다.

## 8. apex를 Lightsail에서 Vercel로 전환

7단계가 모두 통과한 경우에만 진행한다.

Namecheap에서:

1. `Advanced DNS → Host Records`
2. Type `A Record`, Host `@`, Value `3.37.189.12` 행의 Edit 클릭
3. Value를 6단계의 `APEX_A_VALUE`로 교체
4. TTL `5 min`
5. 저장

절대 변경/삭제하지 않을 레코드:

- 모든 MX (`eforward*.registrar-servers.com`)
- SPF TXT (`v=spf1 include:spf.efwd.registrar-servers.com ~all`)
- `google-site-verification=...` TXT
- NS (`dns1/2.registrar-servers.com`)

AAAA는 새로 만들지 않는다. CAA가 여전히 없다면 만들 필요가 없다. 다른 CAA가 생겼다면 Let’s Encrypt 허용용 `CAA 0 issue "letsencrypt.org"`도 추가한다.

전파 상태를 확인한다.

```bash
dig +short A aloha-yt.xyz @1.1.1.1
dig +short A aloha-yt.xyz @8.8.8.8
npm run cutover:check -- diagnose
```

두 resolver가 Vercel의 `APEX_A_VALUE`를 보여주고 HTTPS 응답에 `x-vercel-id`가 나타날 때까지 Lightsail을 끄지 않는다.

## 9. www를 apex로 영구 redirect

apex HTTPS가 정상화된 뒤에만 실행한다.

1. Vercel Dashboard → `aloha-clone → Settings → Domains`
2. `www.aloha-yt.xyz` 행의 Edit 클릭
3. `Redirect to Another Domain` 선택
4. 대상 `aloha-yt.xyz`
5. Permanent redirect 선택 후 저장

저장 후 아래를 붙여넣는다.

```bash
cd /home/ahn/aloha
npm run cutover:check -- production
```

이 검사는 apex DNS/TLS/Vercel 헤더, `www` 301/308, RSS, sitemap, canonical, JSON-LD를 모두 확인한다. 마지막이 `모든 검사 통과`가 아니면 Lightsail을 종료하지 않는다.

## 10. Google Search Console

1. `https://search.google.com/search-console`에 로그인한다.
2. 왼쪽 위 속성 선택에서 `aloha-yt.xyz` Domain property를 선택한다.
3. 소유권 오류가 없는지 확인한다. 기존 DNS `google-site-verification` TXT를 삭제하지 않았으므로 유지돼야 한다.
4. 왼쪽 `Sitemaps` 클릭
5. `Add a new sitemap` 입력란에 `sitemap.xml` 붙여넣기
6. `Submit` 클릭
7. 상태가 `Success`인지 확인
8. 상단 URL 검사에 아래 세 주소를 하나씩 붙여넣고 `TEST LIVE URL` 실행

```text
https://aloha-yt.xyz/
https://aloha-yt.xyz/227
https://aloha-yt.xyz/shop
```

같은 도메인과 permalink를 유지하는 hosting-only 이전이므로 `Change of Address`는 사용하지 않는다. 사이트맵은 발견 힌트이며 검색 순위를 보장하지 않는다. [Google sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

## 11. Supabase cron 수동 확인

터미널에 아래 블록을 붙여넣는다. secret은 숨김 입력되고 명령 기록에 남지 않는다.

```bash
read -r -s -p 'Vercel CRON_SECRET을 붙여넣으세요: ' CRON_SECRET; echo
curl -i --max-time 30 \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://aloha-yt.xyz/api/cron/supabase-health
unset CRON_SECRET
```

합격 조건:

- HTTP `200`
- JSON에 `"ok":true`
- `/loginpage/dashboard`의 최근 Cron 성공 시각 갱신

`401`은 secret 불일치, `503`은 DB 연결 실패다. Vercel `Logs`에서 `supabase-health`를 검색한다.

## 12. 외부 장애 알림 등록

사용 중인 uptime 서비스에서 HTTP(S) monitor 네 개를 만든다.

| 이름 | URL | 기대값 | 주기 |
|---|---|---|---|
| aloha-home | `https://aloha-yt.xyz/` | 200 | 5분 |
| aloha-sitemap | `https://aloha-yt.xyz/sitemap.xml` | 200 | 15분 |
| aloha-robots | `https://aloha-yt.xyz/robots.txt` | 200 | 15분 |
| aloha-product | 대표 공개 상품 URL | 200 | 5분 |

알림 연락처는 이메일과 메신저 두 개를 등록한다. 외부 서비스에 `CRON_SECRET`을 주지 않는다. DB cron은 Vercel 로그와 관리자 대시보드로 확인한다.

정기 작업:

- 매주: Vercel 오류, Search Console, Dependabot 확인
- 매월: `npm run backup:supabase` 실행 후 외부 복사
- 분기: 새 임시 Supabase 프로젝트로 복원 시험
- 연 1회: 관리자·DB·Cloudinary secret 교체

## 13. HTTPS 오류 진단

아래 한 줄로 진단 자료를 출력한다.

```bash
cd /home/ahn/aloha
npm run cutover:check -- diagnose | tee "$HOME/aloha-cutover-diagnose.txt"
```

| 증상 | 확인/조치 |
|---|---|
| A가 `3.37.189.12` | 아직 Lightsail. Namecheap apex A 저장/전파 확인 |
| `www` CNAME 없음 | Namecheap CNAME Host `www` 추가 |
| TLS 인증서 출력 없음 | Vercel Domains의 `Invalid Configuration`, A/CNAME 확인 |
| CAA가 있는데 `letsencrypt.org` 없음 | `CAA 0 issue "letsencrypt.org"` 추가 |
| `_acme-challenge`가 다른 업체를 가리킴 | 오래된 TXT/CNAME 제거 후 Vercel 재검증 |
| AAAA가 존재하고 Vercel 안내와 다름 | AAAA 제거 |
| 브라우저만 이전 사이트 | 로컬 DNS/브라우저 캐시 문제. 1.1.1.1/8.8.8.8 결과 비교 |
| Vercel인데 500 | Vercel Logs 확인, 환경변수와 Supabase 연결 재검증 |

Vercel 공식 문제 해결: [Troubleshooting domains](https://vercel.com/docs/domains/troubleshooting)

## 14. 즉시 롤백

다음 중 하나면 롤백한다.

- apex HTTPS 인증서 오류가 10분 이상 지속
- 홈/상품/관리자 핵심 기능이 Vercel에서 복구되지 않음
- 주문·DB 저장이 실패

먼저 Lightsail 인스턴스가 실행 중인지 확인한다. 그다음 Namecheap에서:

1. `Advanced DNS → A Record → Host @` Edit
2. Value를 `3.37.189.12`로 복원
3. TTL `5 min`
4. 저장
5. 새로 추가한 `www` CNAME 삭제

아래를 반복 실행한다.

```bash
dig +short A aloha-yt.xyz @1.1.1.1
curl -I https://aloha-yt.xyz/
npm run cutover:check -- diagnose
```

합격 조건:

- A가 `3.37.189.12`
- 응답 Server가 다시 `Apache`
- HTTPS 200과 기존 인증서 정상

DNS 캐시 때문에 일부 사용자는 잠시 Vercel을 계속 볼 수 있다. 양쪽 서비스를 모두 유지하고 원인을 고친 뒤 새 전환 일정을 잡는다.

## 15. 전환 후 2주

다음 조건을 2주 동안 모두 만족한 후에만 Lightsail 종료를 결정한다.

- 외부 monitor 장애 없음
- Vercel 오류 로그에 반복 5xx 없음
- Supabase cron 최근 성공 유지
- 관리자 저장·Cloudinary 업로드·주문 정상
- Search Console HTTPS/Page indexing에 급증 오류 없음
- Supabase 백업과 복원 시험 가능

안정화 후 Namecheap apex TTL을 `30 min` 또는 `Automatic`으로 되돌린다. Lightsail은 바로 삭제하지 말고 snapshot을 먼저 보존한다.
