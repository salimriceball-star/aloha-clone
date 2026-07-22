작업 일시: 2026-07-22 16:48 KST
배경/목표: 제로 컨텍스트 디자인 리뷰를 운영 안정성과 로딩 성능을 해치지 않는 80~90% 범위로 적용.
수정 파일: /home/ahn/aloha/app/globals.css, app/layout.tsx, lib/asset-map.ts, components/admin-html-editor.tsx, admin-post-form.tsx, protected-post-gate.tsx, shop-catalog.tsx, storefront-client.tsx, 상품 편집·로그인 페이지, docs/frontend-design-refresh.md, progress.md.
주요 변경: 단일 토큰/시스템 글꼴, 컴팩트 헤더, 읽기 좋은 본문, 반응형 상점 카드, 관리자 도크·저장 바, 접근성, 계좌 복사, WP 크기 이미지의 Cloudinary 정규화.
검증: typecheck/lint/build 통과. BrowserOS에서 desktop 3열/mobile 1열, overflow·깨진 홈 이미지·page error 0, 복사 메시지와 58px 모바일 저장 바 확인.
참조: docs/frontend-design-review-request_anser.txt, docs/frontend-design-refresh.md. 체크포인트 checkpoint/pre-frontend-design-refresh-2026-07-22.
다음: PR 병합·Production 배포 후 공개 URL smoke/SEO 확인.
