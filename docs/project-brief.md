# Project Brief

## Primary Goal

- 대상 사이트: `https://aloha-yt.xyz/`
- 목표: WordPress 운영을 그대로 유지하는 것이 아니라, Vercel에서 운용 가능한 자체 코드베이스로 사이트를 클론한다.
- 핵심은 기존 사이트의 감각, 정보구조, 글/상품/구매 흐름, 관리자 운영성을 최대한 비슷하게 재현하는 것이다.

## Requirements Locked In

- 디자인 스켈레톤은 `/home/vboxuser/web_clone` 에서 확정한 톤을 기본으로 사용한다.
- 이미지 자산은 원본을 내려받아 Cloudinary에 올린 후 새 사이트에서 사용한다.
- 글 수가 많고 이미지 자료가 많으므로 자동 수집 파이프라인이 필요하다.
- 번호형 direct-access 글과 비공개/링크 전용 글도 복제 대상이다.
- 관리자 로그인 상태에서 글쓰기 기능이 필요하다.
- 관리자 로그인 상태에서 Cloudinary 업로드 및 본문 삽입 기능이 필요하다.
- 상품 상세 관리자 기능으로 가격/할인가/공개범위/품절 상태 변경이 가능해야 한다.
- 장바구니/결제/푸터는 실제 운영 가능한 수준으로 보존한다.
- UI/문구에는 클론 암시나 내부 주석을 넣지 않는다.
- 배포 타깃은 Vercel이다.

## Source Notes

- 공개 최신 글 REST 기준 최신 post id: `1425`
- WordPress theme/plugin stack observed: `Blocksy`, `WooCommerce`, `YITH Product Add-ons`
- 원본 경고: 짧은 시간에 여러 글을 연속 클릭하면 IP 차단될 수 있으므로 저속 순차 탐색 유지
