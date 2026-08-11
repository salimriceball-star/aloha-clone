work time: 2026-08-11 오후 09:15
background/goal: Vercel Fluid Active CPU 절감 (memory/fluid-cpu-analysis-2026-08-11.md 4개 조치 구현)

modified files:
- /home/ahn/aloha/lib/site-data.ts — readJson/readAdminJson을 React cache()에서 모듈 스코프 Map 싱글턴으로 교체(읽기 실패 시 캐시 삭제 후 재시도). listPublicAdminProductOverrides()를 cache()로 래핑(무인자라 참조동일성 문제 없음) — getProductBySlug/getProducts/getProductAliasTarget이 한 렌더 안에서 DB 왕복 1회로 수렴.
- /home/ahn/aloha/lib/asset-map.ts — getAssetManifest/getAssetUrlLookup/getSkippedAssetUrls을 cache() 대신 모듈 스코프 싱글턴(let ...Promise)으로 전환. 미사용된 `cache` import 제거.
- /home/ahn/aloha/app/sitemap.ts — `dynamic = "force-dynamic"` → `revalidate = 3600` (ISR).
- /home/ahn/aloha/app/[...slug]/page.tsx — isKnownBotArtifactPath() 정규식 헬퍼 추가, generateMetadata·페이지 함수 최상단(params 파싱 직후, 다른 로직 이전)에서 notFound() 조기 반환. wp-content/wp-includes/wp-admin/wp-json 첫 세그먼트, *.php 마지막 세그먼트, "feed" 마지막 세그먼트만 매치.
- /home/ahn/aloha/app/wp-content/[...path]/route.ts, app/wp-includes/[...path]/route.ts, app/xmlrpc.php/route.ts (신규) — GET/HEAD 410 Gone, `Cache-Control: public, s-maxage=86400, max-age=3600`. xmlrpc.php 디렉터리명(점 포함)도 Next 15에서 정상 라우팅됨(빌드로 확인).

verification:
- npm run typecheck: PASS (무출력)
- npm run lint: PASS (무출력)
- npm run build: PASS. 라우트 표에서 /sitemap.xml이 `○ Static, Revalidate 1h`로 확인(기존 force-dynamic 제거 확인). /wp-content/[...path], /wp-includes/[...path], /xmlrpc.php 라우트 정상 생성 확인.
- posts/pages/products JSON 슬러그·link 전수 스캔으로 새 정규식과 충돌하는 실제 콘텐츠 없음 확인(wp-content/wp-includes/wp-admin/wp-json 접두, .php, "feed" 세그먼트 0건).

deviation: 없음 — 4개 항목 스펙대로 구현. xmlrpc.php 라우트 파일명 그대로 사용 가능해 catch-all 폴백 불필요.

next step: git add/commit은 오케스트레이터가 처리(요청받음, 이 작업에서는 커밋 안 함). 실측(Vercel CPU 사용량 감소)은 배포 후 확인 필요.
