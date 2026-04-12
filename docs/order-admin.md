# Order Admin

- 관리자 주문 확인 경로: `/loginpage/orders`
- 관리자 비밀번호: `ADMIN_PASSWORD` 우선, 없으면 `SUPABASE_DB_PASSWORD`
- 주문 저장 경로: `POST /api/orders`
- 저장 테이블: `clone_orders`, `clone_order_items`
- 주문완료 페이지는 `/checkout/order-received/[orderId]?key=...` 에서 DB 주문과 `key` 를 대조해 서버 기록을 우선 표시한다.
- 관리자 화면은 최신 주문부터 카드 목록으로 보여 주며 이메일, 연락처, 메모, 상품 라인아이템을 함께 확인한다.
- BrowserOS QA 스크립트: `/home/vboxuser/aloha_clone/scripts/browseros-order-admin-qa.ts`
- 로컬 이 머신에서는 Supabase direct DB가 IPv6 `ECONNREFUSED` 로 막힐 수 있어 order save runtime 검증은 production 기준이 더 신뢰된다.
