# Vercel Deploy

## Target

- GitHub repo: `https://github.com/salimriceball-star/aloha-clone`
- Vercel project: `https://vercel.com/salimriceball-5026s-projects/aloha-clone`
- Public URL: `https://aloha-clone.vercel.app`

## Recommended Settings

- framework: `Next.js`
- install command: `npm install`
- build command: `npm run build`
- runtime node: `20.x`
- root directory: `/`

## Build Notes

- `npm run build` 는 정적 빌드 중 `ALOHA_SKIP_ADMIN_DB=1` 로 동작한다.
- 이유: 공개 페이지 SSG 중에는 Supabase admin DB를 건너뛰고, 런타임/관리자 액션에서만 DB를 사용한다.
- 데이터 파일 경로는 `process.cwd()` 기준 상대 경로를 사용한다.

## Runtime Secrets

- 현재 프런트 배포는 `data/public-wp-export` 와 `data/assets/manifest.json` 을 읽는다.
- Cloudinary/Supabase 자격증명은 수집/관리자 기능용이며, 실제 배포 연결 시 필요한 env만 별도로 입력한다.

## Pre-Deploy Checks

- `MAX_TREE_RSS_MB=1500 MIN_AVAILABLE_MB=700 ./scripts/run-guarded.sh npm run build`
- `./scripts/run-guarded.sh npm run lint`
- local preview 기동 후 `./scripts/run-guarded.sh npx tsx scripts/browseros-targeted-qa.ts`

## Current Status

- GitHub repo 생성 완료
- 로컬 git origin 연결 완료
- Vercel project 생성 및 GitHub repo 연결 완료
- Vercel runtime node `20.x` 반영 완료
- Vercel env sync 완료
- guarded `lint` / `build` 통과
- BrowserOS targeted QA 통과:
- local `/home/vboxuser/aloha_clone/artifacts/browseros-targeted-qa/2026-04-07T04-37-35-362Z/report.json`
- public `/home/vboxuser/aloha_clone/artifacts/browseros-targeted-qa/2026-04-07T04-41-55-951Z/report.json`
- latest deployment: `dpl_9G4eqxBp1Nb93XBqffq6ZPW1fuK8` `READY`
- production smoke test 완료
- `https://aloha-clone.vercel.app` 기준 canonical / og:url / robots / sitemap 검증 완료
