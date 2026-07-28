# 프로젝트 오버뷰 (aloha-clone)

> 새 세션에서 구조 탐색을 반복하지 않기 위한 지도. 절대경로: `/home/ahn/aloha/docs/project-overview.md`
> 최종 갱신: 2026-07-29

## 1. 한 줄 요약

WordPress 사이트 `aloha-yt.xyz`(유튜브 채널 매물 거래)를 **Next.js 15 App Router + React 19**로 옮긴 클론.
콘텐츠 원본은 **정적 JSON 내보내기**, 관리자가 고친 내용은 **Supabase Postgres 오버라이드**, 이미지는 **Cloudinary**. 배포는 **Vercel**(main 푸시 시 자동).

- 저장소: `https://github.com/salimriceball-star/aloha-clone` (origin, 기본 브랜치 `main`)
- 프로젝트 루트: `/home/ahn/aloha` (※ `AGENTS.md`에 적힌 `/home/vboxuser/aloha_clone`은 옛 경로)
- Node 24.x, ESM(`"type": "module"`)

## 2. 데이터 3층 구조 — 이 프로젝트에서 가장 중요한 개념

| 층 | 위치 | 성격 |
|---|---|---|
| ① 원본(source) | `data/public-wp-export/*.json`, `data/admin-wp-export/` | WP에서 뽑은 읽기 전용 스냅샷. 글·페이지·상품·댓글·사이트메타 |
| ② 오버라이드 | Supabase Postgres 테이블 `clone_posts` / `clone_products` / `clone_settings` / 주문 테이블 | 관리자 화면에서 고친 값. **원본을 덮어씀** |
| ③ 자산 | Cloudinary + `data/assets/manifest.json` | 원본 WP 이미지 URL → Cloudinary URL 치환 맵 |

`lib/site-data.ts`가 ①+②를 **병합**해서 화면용 엔티티를 만든다. 여기가 이 앱의 심장이고, 대부분의 버그가 여기서 난다.

### 상품(product) 병합 규칙 — `lib/site-data.ts`

- `getProducts()` : 원본 상품 배열 + 독립 오버라이드(`source_product_id IS NULL`)를 이어붙인 뒤 날짜 desc 정렬 후 visibility 필터.
- `mergeProductOverride()` : 원본 상품 + 오버라이드 행 병합(오버라이드 값 우선).
- `mapStandaloneProduct()` : 원본 없이 오버라이드만 있는 **독립 상품**(= '복사' 버튼으로 만든 매물)을 엔티티로 변환.
- `splitProductContentSections()` : 본문에서 `채널 소개` 제목을 경계로 **공통 도입부 / 본문**을 분리. 편집 화면과 상품 페이지에 넘어가는 `contentHtml`은 **항상 `bodyHtml`(도입부 제거본)** 이다.
  - ⚠️ 따라서 오버라이드 본문에 `채널 소개` 제목이 들어가면 저장할 때마다 그 앞부분이 잘려나간다. (현재 복사 흐름에서는 재현되지 않는 잠복 위험)
- `getProductAliasTarget(slug)` : `/227` 같은 **숫자 단축 주소**를 `/product/227`로 308 리다이렉트시키는 근거. 비공개 상품도 리다이렉트시키고, 안내 화면은 `/product/[slug]`가 담당한다.
- `getProductBySlug` / `getPostByPath` / `getPageByPath` 는 모두 `{ includePrivate }`(상품은 `includeHidden`도) 옵션을 받는다. **옵션 없이 부르면 비공개는 `null`** 이므로 목록·검색·사이트맵은 자동으로 안전하다.

### visibility / stockState 값

- `visibility`: `public`(상점 목록·검색·사이트맵 노출) / `hidden`(주소를 알면 접근, 목록 비노출) / `private`(**본문 비노출 — 404 대신 `components/private-content-notice.tsx` 안내 화면을 200 + noindex로 렌더**)
- `stockState`: `available` / `reserved` / `soldout`
- **복사(duplicate)로 만든 상품의 기본값은 `hidden`** (2026-07-29 변경, 이전에는 `private`). 주소로는 바로 확인되고 상점 목록에는 안 뜬다. 상점에 노출하려면 `public`으로 바꿔 저장해야 한다.

## 3. 라우트 지도 (`app/`)

### 공개
- `app/page.tsx`, `app/page/[page]/page.tsx` — 홈/글 목록 페이지네이션
- `app/shop/page.tsx`, `app/shop/page/[page]/page.tsx` — 상점 목록
- `app/product/[slug]/page.tsx` — **상품 상세(정식 주소)**
- `app/column/page.tsx`, `app/column/[slug]/page.tsx` — 칼럼
- `app/[...slug]/page.tsx` — **캐치올**. 글 → 페이지 → (1단 슬러그면) 상품 별칭 리다이렉트 → 없으면 404. `/227` 같은 주소가 여기서 처리됨
- `app/cart`, `app/checkout`, `app/checkout/order-received/[orderId]` — 구매 흐름
- `app/search`, `app/feed.xml`, `app/sitemap.ts`, `app/robots.ts`

### 관리자 — `/loginpage` 가 현행, `/admin`은 레거시
- `app/loginpage/page.tsx` — 로그인
- `app/loginpage/(dashboard)/dashboard|posts|products|orders|assets`
- `app/loginpage/(dashboard)/products/edit/[slug]/page.tsx` — **상품 편집 폼**
- `app/loginpage/(dashboard)/products/common/page.tsx` — 상품 공통 도입부 편집
- `app/loginpage/(dashboard)/posts/edit/[id]`, `posts/new`
- `app/admin/actions.ts` — **모든 서버 액션이 여기 한 파일에 모여 있음**
  (`saveProductAction`, `duplicateProductAction`, `bulkUpdateProductAction`, `savePostAction`, `duplicatePostAction`, `uploadAssetAction`, 로그인/로그아웃 …)

### API
- `app/api/admin/uploads/route.ts` — Cloudinary 업로드
- `app/api/admin/context/route.ts`, `app/api/orders/route.ts`, `app/api/posts/unlock/route.ts`
- `app/api/cron/supabase-health/route.ts` — Supabase 휴면 방지 크론

## 4. `lib/` 역할

| 파일 | 역할 |
|---|---|
| `site-data.ts` (~1.2k줄) | **원본+오버라이드 병합의 중심.** `getProducts`, `getProductBySlug`, `getPostByPath`, `getPageByPath`, `getProductAliasTarget`, `getSiteMeta` … |
| `admin-store.ts` | Postgres 읽기/쓰기. `saveAdminProductOverride`(id 있으면 UPDATE, 없으면 slug 충돌 시 UPSERT), `listAdminProductOverrides` |
| `admin-db.ts` | 커넥션 풀. `withAdminDb`(실패해도 폴백) / `withRequiredAdminDb`(실패 시 throw) |
| `admin-auth.ts` | 쿠키 세션, `requireAdminSession()` |
| `admin-uploads.ts` | Cloudinary 업로드 |
| `asset-map.ts` | `rewriteHtmlAssetUrls()` — WP 이미지 URL → Cloudinary. **원본 콘텐츠에만 적용되고 오버라이드 본문에는 적용 안 됨** |
| `server-env.ts` | `process.env` → `.local/*.env` 순으로 조회 |
| `site-url.ts`, `product-pricing.ts`, `purchase-flow.ts`, `html-utils.ts`, `text-format.ts`, `project-config.ts` | 보조 |

## 5. 주요 컴포넌트 (`components/`)

- `admin-html-editor.tsx` — contentEditable 기반 에디터. Cloudinary 업로드, HTML 모드 토글, **localStorage 임시저장**(`aloha-editor:<draftStorageKey>`), 복원/삭제 배너. 폼 제출 시 `formdata` 이벤트로 최신 innerHTML 주입
- `admin-products-index.tsx`, `admin-post-form.tsx`, `admin-public-toolbar.tsx`
- `shop-catalog.tsx`, `storefront-client.tsx`, `product-price-content.tsx`, `product-status-badges.tsx`
- `rich-html.tsx`, `protected-post-gate.tsx`, `comment-thread.tsx`, `review-list.tsx`, `structured-data.tsx`, `pagination-nav.tsx`

## 6. 환경변수 / 시크릿

- `.local/supabase.env` → `SUPABASE_DATABASE_URL`, `SUPABASE_DIRECT_URL`, `SUPABASE_DB_PASSWORD`
- `.local/cloudinary.env` → Cloudinary 자격증명
- `.env.local` → Vercel CLI용(`VERCEL_OIDC_TOKEN`)만 있음. **DB 접속정보는 여기 없음**
- `lib/server-env.ts`가 위 파일들을 읽으므로 로컬 스크립트는 `getServerEnv()`를 쓰거나 직접 파싱
- 빌드는 `ALOHA_SKIP_ADMIN_DB=1 next build` — 빌드 타임에 DB 없이도 통과

### DB에 직접 붙어 확인하는 방법 (진단용)

```js
// 프로젝트 루트에서 실행해야 node_modules/pg가 잡힌다
import pg from "pg";
// .local/supabase.env 의 SUPABASE_DATABASE_URL 사용, ssl: { rejectUnauthorized: false }
```

## 7. 캐싱 / 배포

- 페이지 대부분 `export const revalidate = 60` (ISR). **DB를 직접 수정하면 최대 60초 뒤 반영**
- 서버 액션은 `revalidatePath()`로 즉시 무효화
- `main` 푸시 → Vercel 자동 배포
- 도메인: `aloha-yt.xyz` (컷오버 기록은 `docs/aloha-yt-vercel-cutover-runbook.md`)

## 8. 검증 명령

```bash
npm run typecheck      # tsc --noEmit  (가장 빠른 1차 관문)
npm run lint           # eslint .
npm run build          # ALOHA_SKIP_ADMIN_DB=1 next build
npm run qa:admin-products   # BrowserOS 관리자 상품 QA
npm run audit:site / audit:seo
```

## 9. 관련 문서

- `docs/project-brief.md`, `docs/clone-plan.md` — 프로젝트 배경
- `docs/admin-editor.md` — 관리자 에디터 사양
- `docs/asset-pipeline.md` — Cloudinary 자산 파이프라인
- `docs/purchase-flow.md`, `docs/order-admin.md` — 구매/주문
- `docs/protected-posts.md`, `docs/supabase-security.md`, `docs/supabase-availability.md`
- `docs/vercel-deploy.md`, `docs/domain-cutover.md`
- `memory/serena/*.md` — 작업 기록(사건별 원인·수정 로그). **버그 조사 전에 먼저 훑을 것**

## 10. 알려진 함정 (재발 이력)

1. **복사본이 `private`로 남아 안 보임** — 복사 → 편집 → 저장까지 다 되지만 공개범위를 안 바꾸면 내용이 안 보였다. 복사본 기본값을 `hidden`으로 바꾸고, 편집 화면에 경고를 띄우고, 공개 주소는 404 대신 "비공개" 안내 화면을 보여주도록 수정됨. (2026-07-29)
2. **복사본이 관리 목록에서 안 보임** — 병합 배열 미정렬 문제. `getProducts()` 정렬로 수정됨. (2026-07-25, 커밋 `5a28754`)
3. **에디터 임시저장 배너 오탐** — 브라우저 직렬화 HTML ≠ 서버 저장 문자열이라 저장 성공 후에도 배너가 뜸. 파서 정규화 후 비교하도록 수정됨. (2026-07-29)
4. **오버라이드 본문에는 `rewriteHtmlAssetUrls`가 안 걸린다** — 관리자가 넣은 이미지 URL은 그대로 저장/출력된다.
