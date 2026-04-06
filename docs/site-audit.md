# Site Audit

기준 시각: 2026-04-06 UTC

## Public Inventory

- base site: `https://aloha-yt.xyz/`
- REST API open: `https://aloha-yt.xyz/wp-json/`
- WordPress stack observed: `Blocksy`, `WooCommerce`, `YITH Product Add-ons`
- permalink pattern:
- 공개 글: 날짜형 (`/2025/06/notice/`)
- 공개 상품: 상품 slug형 (`/product/208/`)
- 보호 direct 글: 숫자형 (`/352`, `/1422`, `/2373`)

## Export Counts

- posts: `16`
- pages: `18`
- products: `178`
- categories: `1`
- product categories: `7`
- comments API total: `0`

## Protected/Admin Findings

- 비밀번호 보호 publish 글: `3`
- ids: `352`, `1422`, `2373`
- admin-only private/draft 글: `4`
- ids: `293`, `150`, `142`, `107`

## Public Pages Confirmed

- `/shop/`
- `/cart/`
- `/checkout/`
- `/my-account/`
- `/deposit/`
- `/terms/`
- `/scheduler/`

## Implications

- 공개 사이트는 date permalink + WooCommerce 상품 구조 중심으로 재현하면 된다.
- 보호글은 BrowserOS admin export를 데이터 레이어에 합쳐 direct URL parity를 맞춘다.
- 댓글은 현재 공개 API 기준 0건이므로 홈 사이드바는 최신 글 fallback이 합리적이다.
- 이미지 자산 수가 많아 WordPress thumbnail variant를 원본 단위로 정규화해 Cloudinary로 올리는 방식이 필요하다.
