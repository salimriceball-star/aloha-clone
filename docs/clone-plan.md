# Clone Plan

## Goal

- `aloha-yt.xyz` 를 기준으로 Vercel에서 운용 가능한 운영형 클론을 만든다.

## Workstreams

- 공개 WordPress 데이터 export
- 번호형 direct post/page inventory 수집
- 비공개/링크 전용 글 admin parity 수집
- Cloudinary 자산 이관
- Next.js 라우트/데이터 레이어 구축
- 관리자 글쓰기 / 이미지 삽입 / 상품 관리 기능 구현
- 장바구니 / checkout / order-received 복제
- BrowserOS 시각 QA
- GitHub / Vercel 배포

## Priority Checks

- 홈, 카테고리/글 목록, direct post URL
- 상점 목록, 상품 상세, add-ons, 상태/가격/공개범위 관리
- 장바구니, checkout, order-received
- 푸터, 검색, 최근 글/댓글 위젯
- admin 글쓰기 및 Cloudinary 업로드

## Safety

- heavy 작업은 `./scripts/run-guarded.sh` 로 감싼다.
- source 탐색은 순차/저속으로 유지한다.
- progress는 `/home/vboxuser/aloha_clone/progress.md` 기준으로 닫는다.
