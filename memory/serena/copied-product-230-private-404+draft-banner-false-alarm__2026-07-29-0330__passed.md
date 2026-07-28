작업 일시: 2026-07-29 오전 03:30

배경/목표: 227번 상품을 '복사'로 만들어 슬러그 230·본문·이미지까지 편집해 저장했는데 `https://aloha-yt.xyz/230` 404. 편집창엔 "서버 저장본과 다른 임시 내용" 배너 상시 노출. 1순위=글 즉시 노출, 2순위=원인 수정.

원인 (둘 다 확정):
1) 404 — DB `clone_products` id=6, slug='230' 행은 정상 저장됨(content 11,988자, 새 Cloudinary 이미지 반영). 단 `visibility='private'`. `duplicateProductAction`이 복사본을 private로 만들고, 편집 폼의 공개범위 select는 `defaultValue={product.visibility}`라 그대로 저장 → private 유지. `getProductAliasTarget()`은 private면 null 반환 → `/230`·`/product/230` 모두 404. 저장 후엔 "저장되었습니다" 성공 문구만 떠서 사용자에겐 저장 실패로 보임. (228/229는 hidden이라 정상)
2) 배너 오탐 — `admin-html-editor.tsx`가 localStorage 임시본과 `initialHtml`을 **원문 문자열 비교**. 제출값은 contentEditable의 `innerHTML`(브라우저 직렬화), 서버 저장본은 `normalizeNullableText` 트림 + `splitProductContentSections` 트림을 거친 값이라 저장이 성공해도 문자열이 절대 일치하지 않음. 게다가 임시본을 지우는 코드가 없어 영구히 배너 노출.

수정 파일:
- (DB) clone_products id=6: visibility private→hidden. 228/229와 동일 정책. `/230`→308→`/product/230` 200 확인, 제목·업로드 이미지 렌더링 확인.
- /home/ahn/aloha/app/loginpage/(dashboard)/products/edit/[slug]/page.tsx — private면 "404가 됩니다" 경고 배너, hidden이면 안내 문구, 공개범위 select 라벨을 "비공개 (주소 접근 시 404)"로 바꾸고 하단 설명 추가.
- /home/ahn/aloha/components/admin-html-editor.tsx — `normalizeHtmlForCompare()`(detached div로 양쪽 재직렬화 후 trim) 추가. 마운트 시 정규화 비교로 같으면 localStorage 임시본 제거 후 배너 미표시. 배너 문구를 행동 지시형으로 교체.
- /home/ahn/aloha/docs/project-overview.md (신규) — 구조 재탐색 방지용 오버뷰.
- /home/ahn/aloha/CLAUDE.md (신규) — 오버뷰 절대경로 참조 지침.

추가 요구(사용자): 비공개면 404 대신 "비공개" 안내 페이지로. 구현:
- /home/ahn/aloha/components/private-content-notice.tsx (신규) — kind별(product/post/page) 안내 화면. 관리자 편집 링크는 넣지 않음(루트 레이아웃 AdminPublicToolbar가 로그인 시에만 노출).
- /home/ahn/aloha/lib/site-data.ts — `getPostByPath`/`getPageByPath`에 `{ includePrivate }` 옵션 추가(기본 동작 불변). `getProductAliasTarget`에서 private→null 제거해 정식 주소로 308 넘김.
- /home/ahn/aloha/app/product/[slug]/page.tsx, /home/ahn/aloha/app/[...slug]/page.tsx — private면 안내 화면 렌더 + metadata noindex/nofollow.

검증: `npm run typecheck` clean, `npm run lint` clean. 프로덕션 curl로 `/230`,`/product/230` 200 및 본문·이미지 확인.
로컬 dev + 임시 probe 행(상품 zz-private-probe, 글 /zz-private-post-probe, 검증 후 삭제 완료)로 확인: 비공개 상품/글 모두 200 + title "비공개 상품/글" + noindex, 단축주소 308 정상, 정상 상품 200, 없는 주소는 여전히 404.

참조: [[copied-products-missing-in-admin-list__2026-07-25-1200__passed]], docs/project-overview.md

후속(사용자 승인): `duplicateProductAction`의 복사본 기본 visibility를 private→**hidden**으로 변경(/home/ahn/aloha/app/admin/actions.ts). 편집 화면의 copied 안내 문구·공개범위 설명도 hidden 기준으로 교체. typecheck/lint/build clean.

배포: 커밋 55d7251(안내 페이지 등) main 푸시 → Vercel 반영 확인. 프로덕션 probe로 비공개 상품 200+"비공개 상품"+noindex, 단축주소 308, 정상 상품/홈/상점 200, 없는 주소 404 확인 후 probe 삭제.

다음 단계/known issues:
- 잠복 위험: 오버라이드 본문에 `채널 소개` 제목이 들어가면 `splitProductContentSections`가 저장 때마다 앞부분을 잘라냄.
- 230번은 hidden 상태. 상점 목록 노출이 필요하면 사용자가 public으로 전환해야 함.
