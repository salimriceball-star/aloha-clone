# Order Admin

- 관리자 주문 확인 경로: `/loginpage/orders`
- 관리자 비밀번호: `ADMIN_PASSWORD` 우선, 없으면 `SUPABASE_DB_PASSWORD`
- 주문 저장 경로: `POST /api/orders`
- 저장 테이블: `clone_orders`, `clone_order_items`
- DB 연결은 `SUPABASE_DATABASE_URL`을 우선 사용하고 `SUPABASE_DIRECT_URL`을 호환 fallback으로 유지한다. 실제 값은 Supavisor transaction pooler(`aws-1-ap-south-1.pooler.supabase.com:6543`)를 사용한다.
- 연결 preflight, stale pool 1회 재생성, 일일 keepalive는 `/home/ahn/aloha/docs/supabase-availability.md`를 따른다.
- 주문완료 페이지는 `/checkout/order-received/[orderId]?key=...` 에서 DB 주문과 `key` 를 대조해 서버 기록을 우선 표시한다.
- 관리자 화면은 최신 주문부터 카드 목록으로 보여 주며 이메일, 연락처, 메모, 상품 라인아이템을 함께 확인한다.
- BrowserOS QA 스크립트: `/home/vboxuser/aloha_clone/scripts/browseros-order-admin-qa.ts`
- 로컬 이 머신에서는 원래 direct IPv6 호스트가 `ECONNREFUSED` 였고, 주문 저장 검증은 pooler 경로 기준으로 맞춘다.
