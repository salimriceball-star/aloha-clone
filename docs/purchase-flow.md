# Purchase Flow

## Goal

- `aloha-yt.xyz` 의 WooCommerce 구매 흐름을 Vercel 운영형 구조로 재구성한다.
- 공개 사이트 기준 장바구니, 결제, 주문완료, 무통장입금 안내를 유지한다.

## Source Anchors

- 상점: `https://aloha-yt.xyz/shop/`
- 장바구니: `https://aloha-yt.xyz/cart/`
- 결제: `https://aloha-yt.xyz/checkout/`
- 예약금 안내: `https://aloha-yt.xyz/deposit/`

## Bank Transfer

- 은행: `카카오뱅크`
- 예금주: `안*리`
- 계좌: `3333137744634`

## Product/Order Notes

- 상품은 숫자 slug 중심으로 다수 존재한다.
- 품절/예약중 판단은 schema보다 상품 제목 prefix를 더 신뢰한다.
- 주문은 Supabase에 우선 저장하고 localStorage는 동일 브라우저 복구용 보조 수단으로만 사용한다.
- 주문완료 조회는 UUID 주문 ID와 144-bit 무작위 order key가 모두 일치해야 개인정보를 표시한다.

## Admin Needs

- 가격/할인가 조정
- 공개/링크전용/비공개 전환
- 판매 가능/예약중/판매완료 전환
