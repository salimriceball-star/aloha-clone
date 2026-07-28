작업 일시: 2026-07-25 오후 12:00

배경/목표: 관리 페이지(/loginpage/products)에서 '복사'로 만든 상품(독립 오버라이드, sourceProductId=null)이 목록에 안 보임. 실제 URL(/product/<slug>)로는 접근 가능(getProductBySlug 경로). 대시보드 목록만 누락.

근본 원인(코드 버그): lib/site-data.ts `getProducts()`가 merged 배열을 `[...원본상품(날짜 desc 정렬됨), ...독립오버라이드(DB원본순, 미정렬)]`로 이어붙인 뒤 정렬 없이 filter만 하고 반환. 독립 복사본이 항상 원본 196개 뒤에 붙어 24/페이지 목록의 마지막 페이지(9쪽)에 묻힘 → 사용자에겐 "안 보임".

수정 파일: /home/ahn/aloha/lib/site-data.ts
변경: getProducts() 반환부 — visibility 필터 결과를 const visible로 잡고 `return sortByDateDesc(visible);` (기존 helper 재사용, ~line 420). 필터/머지/타 함수 무변경. 복사본은 date=override.updatedAt(최근)이라 정렬 후 목록 상단 노출.

부작용(의도됨): 공개 shop(/shop)도 동일 getProducts() 사용 → 공개 독립상품(예: /product/228)이 마지막이 아닌 날짜순 정상 위치(최신=상단)로 이동. 정상 스토어 동작.

검증: sonnet5 서브에이전트 `npm run typecheck`(tsc --noEmit) clean. 커밋 5a28754, main 푸시(8370430..5a28754) → Vercel 자동배포.

다음 단계/known issues: 관리자 실클릭 최종 확인은 로그인 필요(사용자). 미완 하드닝(사용자 "나중"): getConnectionString postgres 접두 검증, duplicateProductAction DB오류를 error=missing과 분리. 참조 [[copy-bug+supabase-creds-restored]].
