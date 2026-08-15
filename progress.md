# progress — Vercel Fluid Active CPU 초과 경보 대응 (2026-08-11)

## 배경
- Vercel 무료 티어 Fluid Active CPU 4h 중 3h40m(92%) 소모. 8/10 하루에만 ~38분 스파이크(평소 5~10분/일). `aloha-clone`이 전체의 99%.
- 한도 초과 시 프로젝트 자동 일시정지 → 프로덕션 중단 위험.

## 확인된 사실 (2026-08-11 조사)
- [x] 로그 47분 샘플(100건): **404가 60%**, 대부분 `/wp-content/uploads/*.png` 옛 WP 이미지 경로 + `/product/97/feed` 같은 WP 피드 경로.
- [x] 404 응답이 엣지에 캐시되지 않음 — 같은 URL 반복 요청도 매번 `x-vercel-cache: MISS`, 함수 재실행(~0.7s/건).
- [x] `clone_posts` 오버라이드 8건에 `https://aloha-yt.xyz/wp-content/uploads/...` 자기 도메인 이미지 참조 총 ~17개 잔존 (예: `/2024/10/1`에 6개). 실제 서빙 HTML에 그대로 나감 → 방문자 브라우저가 404 함수 호출을 유발. `clone_products` 오버라이드는 깨끗(전부 Cloudinary).
- [x] 원본 콘텐츠 경로는 `rewriteHtmlAssetUrls`로 Cloudinary 치환 정상 동작 (`/product/216` HTML 검증).
- [x] cron은 1일 1회(supabase-health)로 무시 가능. middleware 없음.
- [x] 8/10 스파이크는 외부 크롤러의 전수 크롤(옛 이미지·피드 URL 포함)로 추정 — Hobby 플랜 로그 보관 1시간이라 당일 로그는 소실, UA 미확보.

## 코드 분석 결과 (memory/fluid-cpu-analysis-2026-08-11.md)
- [x] `lib/site-data.ts:276-284`·`lib/asset-map.ts:32`가 React `cache()`(요청 스코프)만 사용 → **모든 함수 호출마다 ~10MB JSON 재파싱**
- [x] `app/product/[slug]`·`app/[...slug]`에 `generateStaticParams` 없음 → 모든 첫 요청(봇 404 포함)이 풀 렌더
- [x] 캐치올 404 경로가 최고 비용: JSON 5종 파싱 + Supabase 최대 3회 왕복 후에야 notFound()
- [x] `app/sitemap.ts:16` force-dynamic → 크롤러가 때릴 때마다 JSON 5개 + 필수 DB 3쿼리
- [x] 상품 페이지 중복 DB 쿼리(listPublicAdminProductOverrides 2회)

## 실행 (사용자 승인 완료: 코드 4종 + DB 정리 + 방화벽 안내, 검증 통과 시 main 푸시까지)
- [x] **DB 정리 완료**: clone_posts 8행의 `aloha-yt.xyz/wp-content` 이미지 URL 17개 전부 Cloudinary로 UPDATE (한글 파일명 2개는 퍼센트 인코딩 폴백으로 해석). 치환 URL 전수 HEAD 200 확인. 잔존 bad ref 0.
- [x] 코드 최적화 4종: ① JSON 모듈 싱글턴 캐시 ② sitemap ISR(3600) ③ WP 유물 경로 조기 404/410+엣지캐시 ④ 상품 페이지 중복 쿼리 제거
- [x] typecheck·lint·build 통과 → 커밋 b321823·864f6c0 → main 푸시 → 배포 gdta2jdca
- [x] 라이브 검증: /wp-content·xmlrpc.php 410 + 2회차 엣지 HIT, /wp-login.php·/product/97/feed 조기 404, sitemap PRERENDER→HIT, /2024/10/1 이미지 Cloudinary 정상, 주요 페이지 200
- [x] 방화벽 안내문: docs/vercel-firewall-guide.md
- [x] serena 최종 기록: memory/serena/fluid-cpu-mitigation__2026-08-11-2210__passed.md

## 사용자 작업 (미완)
- [ ] Vercel 대시보드 Firewall 커스텀 규칙 3개 설정 (docs/vercel-firewall-guide.md) — 봇 함수 호출 0화
- [ ] 청구 주기 리셋 전까지 usage 그래프 모니터 (잔여 한도 ~20분)
- [x] Node 20 지원종료 메일 대응: 빌드는 engines 24.x로 이미 안전, 대시보드 설정만 API로 24.x 정렬 (2026-08-15, serena node20-deprecation-check)
