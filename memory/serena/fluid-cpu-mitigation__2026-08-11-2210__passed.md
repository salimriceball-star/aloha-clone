# fluid-cpu-mitigation — 2026-08-11 오후 10:10 — passed

## 배경/목표
Fluid Active CPU 3h40m/4h 경보 대응 완료편. 진단은 [[fluid-cpu-spike-diagnosis]] 참조.

## 수정 파일
- /home/ahn/aloha/lib/site-data.ts, lib/asset-map.ts — JSON·매니페스트 파싱 모듈 싱글턴화, listPublicAdminProductOverrides cache() 래핑
- /home/ahn/aloha/app/sitemap.ts — force-dynamic → revalidate 3600
- /home/ahn/aloha/app/[...slug]/page.tsx — WP 유물 경로(wp-*, *.php, /feed) 데이터 로드 전 조기 404
- /home/ahn/aloha/app/wp-content|wp-includes/[...path]/route.ts, app/xmlrpc.php/route.ts — 410 + s-maxage=86400 엣지 캐시 (신규)
- DB: clone_posts 8행 옛 이미지 URL 17개 Cloudinary 치환 (코드 아님, 직접 UPDATE)
- docs/vercel-firewall-guide.md — 사용자 대시보드 방화벽 규칙 안내 (신규)

## 검증 (프로덕션, 배포 gdta2jdca)
- /wp-content/*.jpg, /xmlrpc.php → 410, 2회차 x-vercel-cache=HIT (함수 호출 0)
- /wp-login.php, /product/97/feed → 404 조기 단락(JSON·DB 미접근)
- /sitemap.xml → PRERENDER→HIT (ISR 전환 확인)
- /2024/10/1 → 옛 도메인 이미지 참조 0, 본문 이미지 Cloudinary 정상. /shop, /product/216 200
- typecheck·lint·build 통과. 커밋 b321823(코드), 864f6c0(기록), main 푸시 완료

## 남은 것 / 참고
- 사용자 작업: Vercel 대시보드 Firewall 커스텀 규칙 3개 (docs/vercel-firewall-guide.md) — 적용 시 봇 트래픽 함수 호출 자체가 0
- 이번 청구 주기 잔여 한도 ~20분: 한도 도달 시 자동 일시정지 가능성 여전, 주기 리셋 전까지 usage 모니터 권장
- 교훈: ISR 사이트에서 404는 캐시가 안 돼 봇 히트 수 = 함수 실행 수. 유물 경로는 정적 라우트 410+캐시 헤더로 막는 게 정석.
