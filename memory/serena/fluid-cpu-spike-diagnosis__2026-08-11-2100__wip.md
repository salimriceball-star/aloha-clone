# fluid-cpu-spike-diagnosis — 2026-08-11 오후 9:00 — wip

## 배경/목표
Vercel 무료 티어 Fluid Active CPU 3h40m/4h(92%) 경보. 8/10 하루 ~38분 스파이크. 원인 규명.

## 진단 결과
- 로그 47분 샘플(함수 호출 100건): 404가 60%, 대부분 `/wp-content/uploads/*.png` 옛 WP 이미지·`/product/97/feed` WP 피드 경로. 디도스 아님 — 평범한 크롤러가 비싼 구조를 때린 것.
- 404가 엣지 캐시 안 됨(반복 요청도 매번 MISS, ~0.7s/건) → 봇 히트 수 = 함수 실행 수.
- `clone_posts` 오버라이드 8건에 자기 도메인 `aloha-yt.xyz/wp-content/uploads` 이미지 참조 ~17개 잔존(최다 `/2024/10/1` 6개) → 방문자 페이지뷰마다 404 함수 호출 유발. `clone_products` 오버라이드·원본 렌더는 Cloudinary 치환 정상.
- 코드 측(상세: `memory/fluid-cpu-analysis-2026-08-11.md`): readJson/asset manifest가 React cache()라 매 호출 ~10MB JSON 재파싱; 캐치올 404가 JSON 5종+Supabase 3왕복; sitemap.ts force-dynamic; 상품 페이지 DB 쿼리 중복; generateStaticParams 부재.

## 검증
- `curl /2024/10/1` HTML에 옛 이미지 src 6개 확인; 동일 404 URL 2회 curl → 모두 MISS.
- DB 직결 쿼리로 오버라이드 참조 수 계수(pg, .local/supabase.env).

## 다음 단계
사용자 승인 후: JSON 모듈 싱글턴 캐시, sitemap ISR, WP 유물 경로 저비용 404/410+캐시, clone_posts 이미지 URL Cloudinary 치환, Vercel 방화벽 규칙 안내. progress.md 참조.
