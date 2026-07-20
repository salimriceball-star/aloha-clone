# Vercel Deploy

## Target

- GitHub repo: `https://github.com/salimriceball-star/aloha-clone`
- Vercel project: `https://vercel.com/salimriceball-5026s-projects/aloha-clone`
- Public URL: `https://aloha-clone.vercel.app`

## Recommended Settings

- framework: `Next.js`
- install command: `npm ci`
- build command: `npm run build`
- runtime node: `24.x`
- root directory: `/`

## Build Notes

- Production의 `npm run build`는 Supabase admin DB 연결을 필수로 사용한다. DB 연결이 실패하면 운영 배포도 실패해 비공개/숨김 속성이 누락된 페이지를 내보내지 않는다.
- Vercel Preview와 GitHub CI는 `ALOHA_SKIP_ADMIN_DB=1`을 사용해 정적 원본 데이터로 빌드한다. Production의 Sensitive DB 비밀값을 Preview와 공유하지 않는 운영 선택이다.
- Vercel에서 `ALOHA_SKIP_ADMIN_DB=1`은 Preview만 설정하고 Production에는 절대 설정하지 않는다.
- 데이터 파일 경로는 `process.cwd()` 기준 상대 경로를 사용한다.

## Runtime Secrets

- 현재 프런트 배포는 `data/public-wp-export` 와 `data/assets/manifest.json` 을 읽는다.
- Cloudinary/Supabase 자격증명은 수집/관리자 기능용이며, 실제 배포 연결 시 필요한 env만 별도로 입력한다.
- `SUPABASE_DATABASE_URL`: Supavisor transaction pooler `:6543` URI. 기존 `SUPABASE_DIRECT_URL`도 fallback으로 지원한다.
- `CRON_SECRET`: `/api/cron/supabase-health` 일일 호출 인증용 32-byte 이상 무작위 값.
- Vercel Cron은 매일 `03:17 UTC`에 실행되며 운영 절차는 `/home/ahn/aloha/docs/supabase-availability.md`를 따른다.
- `NEXT_PUBLIC_SITE_URL`: canonical/sitemap/robots/JSON-LD가 사용할 최종 HTTPS custom domain.
- `GOOGLE_SITE_VERIFICATION`: Search Console meta verification을 사용할 때만 설정.
- 도메인 전환과 SEO 운영 절차는 `/home/ahn/aloha/docs/vercel-cutover-seo.md`를 따른다.
- 실제 `aloha-yt.xyz` DNS/TLS 전환 및 롤백은 `/home/ahn/aloha/docs/aloha-yt-vercel-cutover-runbook.md`를 따른다.

## Pre-Deploy Checks

- `npm run vercel:configure-env -- --deploy`
- `npm run cutover:check -- baseline`
- `MAX_TREE_RSS_MB=6000 MIN_AVAILABLE_MB=5000 ./scripts/run-guarded.sh npm run build`
- `./scripts/run-guarded.sh npm run lint`
- local preview 기동 후 `./scripts/run-guarded.sh npx tsx scripts/browseros-targeted-qa.ts`

## Current Status

- GitHub repo 생성 완료
- 로컬 git origin 연결 완료
- Vercel project 생성 및 GitHub repo 연결 완료
- Vercel runtime Node `24.x` 전환 설정 반영
- Vercel 환경변수 존재. 2026-07-16 기준 final-domain canonical 갱신은 `vercel:configure-env -- --deploy` 실행 필요
- guarded `lint` / `build` 통과
- BrowserOS targeted QA 통과:
- local `/home/vboxuser/aloha_clone/artifacts/browseros-targeted-qa/2026-04-07T04-37-35-362Z/report.json`
- public `/home/vboxuser/aloha_clone/artifacts/browseros-targeted-qa/2026-04-07T04-41-55-951Z/report.json`
- 2026-07-16 public `/`, `/feed.xml`, `/sitemap.xml` 200
- 임시 주소 자체 기준 SEO audit 통과
- final domain 예상 audit는 canonical이 아직 Vercel alias라 의도대로 실패. 환경변수 재배포 후 통과 필요
