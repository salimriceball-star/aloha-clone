# Vercel Fluid Active CPU 소비 분석 (2026-08-11)

> 배경: 무료 티어(월 4h) 75% 소진, 8/10 38분 스파이크(추정 봇 트래픽). 코드 정독으로 원인·완화책을 정리.
> 빌드/네트워크 요청 없이 정적 코드 분석만 수행.

## 요약 (Top 5)

1. **`lib/site-data.ts:276-284`의 `readJson`/`readAdminJson`이 React `cache()`로만 메모이즈됨** — 이는 "요청(렌더) 단위" 메모이제이션이지 "함수 인스턴스/컨테이너 단위"가 아니다. 즉 **서버리스 호출마다(warm 재사용 포함, cache()가 AsyncLocalStorage 기반 요청 스코프라서) products.json(5MB)+product-details.json(896K)+site-meta.json(3MB) 등 최대 ~10MB의 JSON을 매번 다시 읽고 파싱**한다.
2. **`app/product/[slug]/page.tsx`, `app/[...slug]/page.tsx`에 `generateStaticParams`가 없음** → `dynamicParams` 기본값 `true`라서 **모든 슬러그의 첫 요청(봇의 404 프로브 포함)이 완전한 함수 실행**이다. 캐시가 없는 랜덤 경로(봇 스캔)는 영원히 함수 실행으로 남는다.
3. **캐치올 404 경로가 가장 비싸다** — `/wp-login.php` 같은 1-세그먼트 봇 프로브 하나가 `notFound()`를 반환하기 전에: posts.json+categories.json+comments.json 파싱, `clone_posts` DB 쿼리, pages.json 파싱, `clone_posts`(pages) DB 쿼리, **products.json(5MB) 파싱**, `clone_products` DB 쿼리까지 — **최대 3회 DB 왕복 + 6MB+ JSON 파싱**을 전부 수행한 뒤에야 404를 던진다.
4. **`app/sitemap.ts:16`이 `export const dynamic = "force-dynamic"`** — ISR 캐시가 전혀 없어 **크롤러가 `/sitemap.xml`을 칠 때마다** site-meta.json(3MB)+posts.json+pages.json+products.json(5MB)+shop-visibility.json 파싱과 **3개의 필수(throw-on-fail) DB 쿼리**를 매번 새로 실행한다. 단일 라우트로는 가장 비싼 상시 소비원.
5. **상품 상세 페이지는 요청당 오버라이드 DB 쿼리를 2번 중복 실행** — `generateMetadata`와 페이지 본문이 각각 `getProductBySlug`를 호출하는데, `getProductBySlug` 자체는 `cache()`로 감싸지 않아 내부 `listPublicAdminProductOverrides()`(DB) 호출이 요청당 2회 발생(`site-data.ts:963-995`).

### Top 3 완화책 (impact 순)
1. `lib/site-data.ts`의 `readJson`/`readAdminJson`, `lib/asset-map.ts`의 `getAssetManifest`을 React `cache()` 대신 **모듈 레벨 진짜 싱글턴**(plain `Map<string, Promise<T>>`)으로 교체 — warm 컨테이너 재사용 시 JSON 재파싱을 제거. 정적 export 파일은 배포 시에만 바뀌므로 정합성 위험 없음.
2. `app/sitemap.ts`을 `force-dynamic` → `revalidate = 3600` 등 ISR로 전환.
3. `app/[...slug]/page.tsx` 최상단에 알려진 봇 프로브 패턴(`.php`, `wp-admin`, `wp-login.php`, `xmlrpc.php`, `.env` 등) 정규식으로 **데이터 조회 전에 즉시 `notFound()`** 처리.

---

## 1. JSON 로딩 비용 (lib/site-data.ts)

```
lib/site-data.ts:276  const readJson = cache(async <T>(filename) => { readFile + JSON.parse })
lib/site-data.ts:281  const readAdminJson = cache(async <T>(filename) => { readFile + JSON.parse })
lib/asset-map.ts:32   const getAssetManifest = cache(async () => { readFile + JSON.parse })  // manifest.json 1.1MB
```

- `cache()`는 **React 서버 컴포넌트 요청 스코프 메모이제이션**이다. 같은 요청 안에서 `getSiteMeta()`를 두 번 호출해도 `readJson("site-meta.json")`은 1번만 실행되지만, **다른 요청/다른 함수 호출(다른 invocation)에서는 캐시가 공유되지 않는다.** Fluid Compute가 컨테이너를 재사용(warm)하더라도 이 캐시는 요청이 끝나면 사라진다 — 모듈 최상단에 캐시를 심어둔 게 아니라 요청 단위 AsyncLocalStorage 컨텍스트에 심어둔 것이기 때문.
- 결과: **캐시된 ISR HTML을 서빙하지 못하는(=함수가 실제로 실행되는) 모든 요청**은 필요한 JSON 파일을 처음부터 다시 읽고 파싱한다.
  - 상품 목록/상세: `products.json`(5MB) + `product-details.json`(896K) (`getSourceProductData`, site-data.ts:899-910)
  - 홈/게시글/카탈로그 어디서든 `getSiteMeta()` 호출 시 `site-meta.json`(3MB) 전체 파싱 (site-data.ts:438-451) — 캐치올, 상품 상세, feed.xml, sitemap.ts 등 대부분의 공개 라우트가 부른다.
  - 자산 URL 치환을 위해 `manifest.json`(1.1MB, 자산 수천 개) 파싱 후 `Map` 구축 (asset-map.ts:32-60)
  - 그 외 posts.json(100K), pages.json(88K), categories/comments(소용량)
- **추정**: 캐치 없이 매 함수 실행마다 최대 ~10MB급 JSON.parse + Map 구축이 반복된다. Node에서 10MB JSON.parse는 대략 수십~100ms대 CPU(입력 구조에 따라 상이)로, Fluid Active CPU 과금 대상 시간의 상당 부분을 이 파싱이 차지할 가능성이 크다.
- **부가 발견 (숨은 CPU 싱크)**: `lib/asset-map.ts:154-158` — `rewriteHtmlAssetUrls()`가 asset lookup Map 전체(수천 엔트리로 추정)를 길이순 정렬한 뒤 콘텐츠 HTML마다 `split().join()` 루프를 돈다. 이 함수는 게시글/댓글/상품 본문마다(예: `getSourceProducts`, `getSourcePosts`, `getPostComments` 등 다수 지점) 반복 호출되므로, JSON 파싱과 별개로 **자산 매니페스트 크기 × 콘텐츠 길이**에 비례하는 문자열 처리 비용이 추가로 든다. 언급된 완화책(모듈 캐시)이 `getAssetUrlLookup()` 자체의 재계산은 줄여주지만, 콘텐츠별 치환 루프 비용 자체는 남는다.

## 2. 라우트별 렌더링 모드

grep 결과 (`export const revalidate/dynamic/runtime`, `generateStaticParams`):

| 라우트 | 모드 | 근거 |
|---|---|---|
| `app/page.tsx` | ISR 60s | revalidate=60, generateStaticParams 없음(단일 경로라 상관없음) |
| `app/page/[page]/page.tsx` | ISR 60s + 빌드 시 정적 파라미터 | `generateStaticParams`(전체 페이지 수 열거) 있음 → 알려진 페이지는 빌드 시 프리렌더 |
| `app/shop/page.tsx` | ISR 60s | |
| `app/shop/page/[page]/page.tsx` | ISR 60s + 빌드 시 정적 파라미터 | `generateStaticParams` 있음 |
| **`app/product/[slug]/page.tsx`** | **ISR 60s, 정적 파라미터 없음** | `generateStaticParams` 부재 → `dynamicParams` 기본 `true`. **모든 신규 슬러그 첫 요청 = 완전한 함수 실행** |
| `app/column/page.tsx`, `app/column/[slug]/page.tsx` | ISR 60s | |
| **`app/[...slug]/page.tsx`** | **ISR 60s, 정적 파라미터 없음** | 동일하게 `generateStaticParams` 없음. 글/페이지/상품별칭/404 전부 이 파일이 처리 |
| `app/search/page.tsx` | **사실상 매 요청 동적** | `searchParams`를 prop으로 읽음 → Next.js가 해당 세그먼트를 dynamic 렌더링으로 강제, `revalidate=60` export는 무의미해짐 (site-data:639 `searchPosts` 매번 재실행) |
| `app/cart/page.tsx`, `app/checkout/page.tsx` | revalidate=60 명시돼 있으나 `cookies()` 사용 감지(grep) — 장바구니 상태 의존 시 사실상 동적 | 우선순위 낮음(구매 흐름, 트래픽 적음) |
| `app/checkout/order-received/[orderId]/page.tsx` | **force-dynamic** | 명시적, 주문 조회라 타당 |
| `app/feed.xml/route.ts` | ISR 3600s (nodejs runtime) | |
| **`app/sitemap.ts`** | **force-dynamic (캐시 없음)** | 명시적 `export const dynamic = "force-dynamic"` |
| `app/robots.ts` | **정적(빌드 시 1회)** | dynamic/revalidate 미지정, 동적 API 미사용 → Next가 정적으로 렌더링해 캐시. 사실상 무료 |
| `app/admin/*`, `app/loginpage/*` | 전부 동적 (cookies 사용) | 관리자 전용, 트래픽 적음 |
| `app/api/admin/context/route.ts` | force-dynamic | 관리자 전용 |
| `app/api/admin/uploads/route.ts` | runtime=nodejs, dynamic 미지정(POST 위주라 캐시 대상 아님) | 관리자 전용 |
| `app/api/orders/route.ts`, `app/api/posts/unlock/route.ts` | 미조사 세부 없음, 정상 구매/열람 트래픽으로 추정 | 봇 스파이크의 원인은 아닐 가능성 높음 |
| `app/api/cron/supabase-health/route.ts` | force-dynamic, `maxDuration=10` | `vercel.json` cron: `17 3 * * *` (1일 1회). 쿼리 2~3개(`select ... limit 1`), 10초 제한 — **무시 가능한 수준 확인됨** |

## 3. 캐치올 404 / 상품 404 경로 추적

### `app/[...slug]/page.tsx` (미스 시 흐름, :123-274)
1. `getPostByPath(path, { includePrivate: true })` (:144) → `getMergedPosts()`(cache) → `getSourcePosts()`(posts.json+categories.json+comments.json 파싱) + `getSourceProtectedPosts()`(admin-wp-export/protected-posts.json 파싱 시도) + `listPublicAdminPosts()` → **DB 쿼리 1회** (`clone_posts`, admin-store.ts:159-193)
2. 매치 없으면 `getPageByPath(path, { includePrivate: true })` (:232) → `getPages()`(cache) → `getSourcePages()`(pages.json 파싱) + `listPublicAdminPages()` → **DB 쿼리 2회째** (`clone_posts` where content_type='page')
3. 페이지도 없고 `slug.length === 1`이면 `getProductAliasTarget(slug[0])` (:237) → `readJson("products.json")` **(5MB 파싱, cache 없이 직접 호출되므로 이 요청에서 최초 파싱)** + `listPublicAdminProductOverrides()` → **DB 쿼리 3회째** (`clone_products`)
4. 그래도 없으면 `notFound()` (:243)

→ **1-세그먼트 봇 프로브(`/wp-login.php`, `/xmlrpc.php`, `/.env` 등, 실제 WP 취약점 스캐너들이 즐겨 찌르는 패턴) 하나가 posts.json+categories.json+comments.json+pages.json+products.json(5MB) 파싱과 최대 3회의 DB 왕복을 전부 거친 뒤에야 404를 반환.** 이 경로가 매번 새로운 랜덤/유일 경로라서 ISR 캐시도 전혀 도움이 안 됨 — 8/10 38분 스파이크의 유력한 원인.

`generateMetadata`(:17-95)도 같은 요청 안에서 `getPostByPath`/`getPageByPath`를 다시 호출하지만, 이건 `getMergedPosts`/`getPages`가 `cache()`로 감싸져 있어(:590, :1081) **요청 내부에서는 중복 실행되지 않음** — 이 부분은 정상.

### `app/product/[slug]/page.tsx` (미스 시)
- `generateMetadata`(:22)와 페이지 본문(:63)이 **각각** `getProductBySlug(slug, {...})`를 호출.
- `getProductBySlug` 자체는 `cache()`로 감싸지 않음(site-data.ts:963) → 내부의 `getSourceProductData()`(products.json+product-details.json 파싱)는 하위에서 `cache()`로 감싸져 있어 1회만 파싱되지만(:899), **`listPublicAdminProductOverrides()` DB 호출은 매번 새로 실행되어 요청당 2회** (site-data.ts:968-971, :988).
- 슬러그가 없으면 `notFound()`(:69). 즉 알려지지 않은 상품 슬러그 하나당 products.json(5MB)+product-details.json(896K) 파싱 1회 + DB 쿼리 2회.

## 4. Supabase 쿼리 패턴 (lib/admin-db.ts, lib/admin-store.ts)

- `withAdminDb`(폴백 반환, admin-db.ts:247-268) / `withRequiredAdminDb`(실패 시 throw, :270-280) 모두 **connection pool**(`max: 2`, admin-db.ts:75-84)을 전역(`globalThis.__alohaPgPool__`)에 유지 — 커넥션 자체는 재사용되므로 문제는 "쿼리 실행 빈도"이지 "연결 생성"이 아님.
- 각 `listAdmin*` 함수는 **테이블 전체를 `SELECT *` 스타일로 통째로 가져옴** (`clone_posts`, `clone_products` — `order by ... ` 전체 스캔, admin-store.ts:159-193, :390-416). 콘텐츠가 늘어나면 쿼리당 응답 페이로드도 커짐.
- **고전적인 row-by-row N+1은 발견되지 않음.** 예외적으로 `listAdminOrders`/`getAdminOrderById`(admin-store.ts:682-753)는 주문 목록 1쿼리 + 아이템 1쿼리(IN 절 배치)로 N+1 아님.
- 요청당 DB 왕복 수:
  - 캐치올 404 최대 3회 (posts, pages, product overrides) — 위 3절
  - 상품 상세 페이지 2회 (중복, 4절/5절 참고)
  - `getProducts()` (홈/샵) 1회 (`listPublicAdminProductOverrides`)
  - `app/sitemap.ts` **3회, 매 요청마다, force-dynamic이라 캐시 없음** (posts/pages/product overrides `Required` 변형 — DB 실패 시 500)
  - `app/loginpage`, `app/admin` 대시보드류: `cookies()` 기반 관리자 세션 확인(HMAC 검증, DB 아님, admin-auth.ts:111-120) 후 각 목록 쿼리 — 관리자 전용이라 저빈도

## 5. 그 외 함수 유발 지점

- `app/feed.xml/route.ts`: revalidate=3600(1시간) ISR — `getPosts()`(캐시된 병합) + `getSiteMeta()`(3MB) 호출하지만 **1시간에 1번만 실제 실행**되므로 비용 낮음.
- **`app/sitemap.ts`: force-dynamic — 캐시가 전혀 없어 크롤러가 반복 요청할 때마다 5개 JSON 파일(최대 5MB) 파싱 + 3개의 `Required`(throw-on-fail) DB 쿼리를 매번 실행.** `robots.ts`가 `sitemap.xml`을 명시적으로 가리키고 있어(:28) 정상 크롤러(구글봇 등)조차 주기적으로 이 라우트를 때린다 — **상시 소비원 1순위 후보.**
- `app/robots.ts`: 동적 API 미사용 → 빌드 시 정적 생성, 사실상 무료.
- `app/api/cron/supabase-health/route.ts`: `vercel.json`의 크론(`17 3 * * *`, 1일 1회), `maxDuration=10`, 쿼리 2~3개 — **무시 가능 확인됨.**
- `app/api/admin/*`, `app/loginpage/*`, `app/admin/*`: 전부 관리자 인증(cookies) 필요, 정상 트래픽에서 저빈도.

## 6. 미들웨어

`find . -iname "middleware.ts" -not -path "*/node_modules/*" -not -path "*/.next/*"` → **결과 없음.** `src/` 디렉터리 자체가 존재하지 않음(`ls -d src` 실패). `next.config.ts`에는 `redirects()`/`headers()`만 있고 `matcher` 설정 없음. **미들웨어로 인한 추가 함수 실행/오버헤드 없음을 확인.**

## 7. 완화책 (impact 순, 코드 변경 지점 포함)

### ① 모듈 레벨 진짜 JSON 캐시 도입 — 최우선, 정합성 위험 없음
- 대상: `lib/site-data.ts:276-284`(`readJson`/`readAdminJson`), `lib/asset-map.ts:32`(`getAssetManifest`).
- 변경: React `cache()` 대신 아래처럼 모듈 스코프 `Map`으로 교체.
  ```ts
  const jsonCache = new Map<string, Promise<unknown>>();
  function readJson<T>(filename: string): Promise<T> {
    if (!jsonCache.has(filename)) {
      jsonCache.set(filename, readFile(`${exportDir}/${filename}`, "utf8").then((raw) => JSON.parse(raw)));
    }
    return jsonCache.get(filename) as Promise<T>;
  }
  ```
- 효과: Fluid Compute가 같은 컨테이너를 재사용하는 warm 요청에서는 JSON을 다시 읽거나 파싱하지 않음. 이 export 파일들은 **배포 시에만 바뀌는 읽기 전용 스냅샷**(오버라이드는 별도로 DB에서 매번 조회되므로 신선도 유지)이라 캐시가 stale해질 위험이 없음. `getAssetUrlLookup()`/`getSkippedAssetUrls()`도 같은 방식으로 전환하면 자산 매니페스트 1.1MB 파싱+Map 구축 반복도 사라짐.
- 주의: `readAdminJson`이 읽는 `data/admin-wp-export/protected-posts.json`도 동일 성격(정적 export)이라 같이 캐시 가능.

### ② `app/sitemap.ts`를 ISR로 전환
- `app/sitemap.ts:16` `export const dynamic = "force-dynamic";` → `export const revalidate = 3600;` (또는 60) 로 교체.
- 효과: 현재 요청마다 재실행되는 5개 JSON 파싱(최대 5MB) + 3개 DB 쿼리를 1시간에 1번으로 축소. 크롤러 폴링 빈도를 감안하면 단일 변경으로는 가장 큰 절감 후보.
- 위험/트레이드오프: 사이트맵 신선도가 최대 1시간 지연되지만, 사이트맵 용도상 문제 없음. 오히려 현재는 `Required` DB 변형이라 **DB 장애 시 매 요청 500** — ISR 전환 시 재생성 실패해도 마지막 성공 캐시를 서빙(fail-open)하므로 더 안전해짐.

### ③ 캐치올 404 조기 차단
- `app/[...slug]/page.tsx:123` `CatchAllPage` 함수 최상단에, 데이터 조회 전에 알려진 WP 취약점 스캐너 패턴을 정규식으로 걸러 즉시 `notFound()`:
  ```ts
  const knownBotProbePattern = /\.(php|env|git|aspx?)$|^wp-(admin|login|content|json)|xmlrpc\.php$/i;
  if (slug.some((segment) => knownBotProbePattern.test(segment))) {
    notFound();
  }
  ```
- 효과: 3절에서 분석한 "posts+categories+comments+pages+products(5MB) 파싱 + DB 3회" 전체를 스킵. Aug 10 스파이크의 직접 원인으로 추정되는 패턴을 정면으로 차단.
- 위험: 정상 콘텐츠 슬러그가 우연히 이 패턴과 겹칠 가능성은 이 사이트의 실제 슬러그 체계(한글/숫자 상품 슬러그, WP 포스트 슬러그)상 거의 없음 — 배포 전 기존 sitemap 슬러그 목록과 대조 확인 권장.

### ④ `product/[slug]`, `[...slug]`에 `generateStaticParams` 추가
- `app/product/[slug]/page.tsx`에 `getProducts({ includeHidden: true })` 순회로 알려진 슬러그를 빌드 타임에 프리렌더.
- 효과: 신규 배포 직후부터 알려진 상품/글 경로는 첫 요청도 캐시 히트로 처리 — "첫 방문자가 비용을 문다"는 문제를 정상 트래픽에 한해 해소. **단, 이는 봇의 랜덤/미지 경로 프로브에는 근본적으로 도움이 안 됨**(그 경로들은 애초에 `dynamicParams`로만 처리 가능하므로 ③이 필요).
- 위험: 낮음 — 빌드 시점 스냅샷이 서빙되다가 첫 revalidate(60s)에서 최신화되므로, 기존에도 존재하던 "배포~수정 사이 지연" 패턴과 동일 수준.

### ⑤ `getProductBySlug` 중복 DB 조회 제거
- `lib/site-data.ts:963` `export async function getProductBySlug` → `export const getProductBySlug = cache(async (...) => {...})`로 전환.
- 효과: `generateMetadata` + 페이지 본문에서 요청당 2회 나가던 `listPublicAdminProductOverrides()` DB 호출을 1회로 감소.
- 위험: 없음(순수 요청 내 메모이제이션).

### ⑥ 엣지 레벨 봇 차단 (Vercel WAF / Attack Challenge Mode)
- robots.txt 강화(`app/robots.ts:15-25`에 이미 `/wp-admin`, `/wp-login.php` disallow 등록돼 있음)만으로는 **악성 스캐너가 robots.txt를 지키지 않으므로 효과 없음.**
- 권장: Vercel 대시보드에서 WAF 규칙(경로 패턴 기반 차단) 또는 "Attack Challenge Mode"를 활성화 — 이는 **함수가 실행되기도 전에 엣지에서 차단**하므로 Fluid Active CPU 소비가 아예 0이 되는 유일한 옵션. ③(코드 레벨 조기 차단)과 상호 보완적: ③은 이미 함수가 켜진 뒤의 비용을 줄이고, WAF는 함수 자체를 안 켜게 만듦.
- 위험: 정상 검색엔진 크롤러/실사용자 오탐 가능성 있으므로 규칙은 명백한 익스플로잇 패턴(`.php`, `wp-*`, `.env` 등)에 한정 권장.

### 우선순위 요약
| 순위 | 조치 | 코드 위치 | 예상 효과 | 정합성 위험 |
|---|---|---|---|---|
| 1 | JSON 모듈 캐시 전환 | site-data.ts:276-284, asset-map.ts:32 | 모든 함수 실행의 기본 비용 절감(warm 재사용 시) | 없음 |
| 2 | sitemap.ts ISR 전환 | sitemap.ts:16 | 상시 최고 비용 라우트를 시간당 1회로 | 없음(오히려 더 안전) |
| 3 | 캐치올 봇 프로브 조기 차단 | app/[...slug]/page.tsx:123 | Aug 10류 스파이크 직접 차단 | 낮음(사전 슬러그 대조 권장) |
| 4 | product/[...]/catch-all generateStaticParams | 신규 추가 | 정상 트래픽 첫 히트 비용 제거 | 낮음 |
| 5 | getProductBySlug cache() | site-data.ts:963 | 상품 페이지 DB 왕복 절반 | 없음 |
| 6 | Vercel WAF/Attack Challenge | 대시보드 설정 | 악성 스캔 자체를 함수 도달 전 차단 | 오탐 규칙 설계 필요 |
