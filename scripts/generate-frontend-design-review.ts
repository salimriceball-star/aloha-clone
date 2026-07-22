import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const root = process.cwd();
const outputPath = resolve(root, "docs/frontend-design-review-request.md");

type SourceGroup = {
  title: string;
  purpose: string;
  files: string[];
};

const sourceGroups: SourceGroup[] = [
  {
    title: "A. 실행 환경과 전역 셸",
    purpose: "프레임워크 버전, 전역 메타데이터, 헤더·검색·푸터·관리자 툴바가 모든 화면을 감싸는 방식을 보여준다.",
    files: [
      "package.json",
      "next.config.ts",
      "app/layout.tsx",
      "app/globals.css"
    ]
  },
  {
    title: "B. 공개 페이지 라우트",
    purpose: "홈, 글/페이지, 상점, 상품, 검색, 장바구니, 결제의 실제 JSX와 SEO/접근 제약을 보여준다.",
    files: [
      "app/page.tsx",
      "app/page/[page]/page.tsx",
      "app/[...slug]/page.tsx",
      "app/column/page.tsx",
      "app/column/[slug]/page.tsx",
      "app/shop/page.tsx",
      "app/shop/page/[page]/page.tsx",
      "app/product/[slug]/page.tsx",
      "app/search/page.tsx",
      "app/privacy/page.tsx",
      "app/cart/layout.tsx",
      "app/cart/page.tsx",
      "app/checkout/layout.tsx",
      "app/checkout/page.tsx",
      "app/checkout/order-received/[orderId]/page.tsx"
    ]
  },
  {
    title: "C. 공개 UI 컴포넌트",
    purpose: "카드, 목록, 가격, 후기, 보호 글, 장바구니·결제 클라이언트 UI와 새 관리자 툴바를 포함한다.",
    files: [
      "components/admin-public-toolbar.tsx",
      "components/comment-thread.tsx",
      "components/linkified-text.tsx",
      "components/pagination-nav.tsx",
      "components/post-archive-feed.tsx",
      "components/product-price-content.tsx",
      "components/product-status-badges.tsx",
      "components/protected-post-gate.tsx",
      "components/review-list.tsx",
      "components/rich-html.tsx",
      "components/shop-catalog.tsx",
      "components/storefront-client.tsx",
      "components/structured-data.tsx"
    ]
  },
  {
    title: "D. 운영자 화면과 편집기",
    purpose: "로그인, 대시보드, 글·페이지 목록/편집, 상품 목록/편집, 주문/자산 화면의 실제 UI를 보여준다.",
    files: [
      "app/loginpage/layout.tsx",
      "app/loginpage/page.tsx",
      "app/loginpage/(dashboard)/layout.tsx",
      "app/loginpage/(dashboard)/dashboard/page.tsx",
      "app/loginpage/(dashboard)/posts/page.tsx",
      "app/loginpage/(dashboard)/posts/new/page.tsx",
      "app/loginpage/(dashboard)/posts/edit/[id]/page.tsx",
      "app/loginpage/(dashboard)/products/page.tsx",
      "app/loginpage/(dashboard)/products/page/[page]/page.tsx",
      "app/loginpage/(dashboard)/products/common/page.tsx",
      "app/loginpage/(dashboard)/products/edit/[slug]/page.tsx",
      "app/loginpage/(dashboard)/orders/page.tsx",
      "app/loginpage/(dashboard)/assets/page.tsx",
      "components/admin-html-editor.tsx",
      "components/admin-post-form.tsx",
      "components/admin-products-index.tsx"
    ]
  },
  {
    title: "E. 레거시 관리자 별칭 화면",
    purpose: "현재 주 운영 경로는 /loginpage이지만 남아 있는 /admin 화면도 전역 CSS와 컴포넌트 판단에 영향을 줄 수 있어 함께 제공한다.",
    files: [
      "app/admin/layout.tsx",
      "app/admin/login/page.tsx",
      "app/admin/(dashboard)/layout.tsx",
      "app/admin/(dashboard)/page.tsx",
      "app/admin/(dashboard)/posts/page.tsx",
      "app/admin/(dashboard)/products/page.tsx",
      "app/admin/(dashboard)/assets/page.tsx"
    ]
  },
  {
    title: "F. UI에 영향을 주는 서버 액션·API·데이터 모델",
    purpose: "리뷰어가 보이는 상태가 어떤 데이터와 권한 규칙으로 만들어지는지 추측하지 않도록 관련 구현을 붙인다.",
    files: [
      "app/admin/actions.ts",
      "app/api/admin/context/route.ts",
      "app/api/admin/uploads/route.ts",
      "app/api/orders/route.ts",
      "app/api/posts/unlock/route.ts",
      "lib/admin-auth.ts",
      "lib/admin-db.ts",
      "lib/admin-store.ts",
      "lib/admin-uploads.ts",
      "lib/asset-map.ts",
      "lib/asset-utils.ts",
      "lib/html-utils.ts",
      "lib/product-pricing.ts",
      "lib/project-config.ts",
      "lib/purchase-flow.ts",
      "lib/server-env.ts",
      "lib/site-data.ts",
      "lib/site-url.ts",
      "lib/text-format.ts"
    ]
  },
  {
    title: "G. 제품 목표와 기존 운영 문서",
    purpose: "디자인 제안이 이미 확정된 운영·노출·성능 조건을 거스르지 않도록 핵심 문서를 원문으로 제공한다.",
    files: [
      "docs/project-brief.md",
      "docs/clone-plan.md",
      "docs/admin-editor.md",
      "docs/asset-pipeline.md",
      "docs/browseros-qa.md",
      "docs/protected-posts.md",
      "docs/purchase-flow.md"
    ]
  }
];

const dataFiles = [
  "data/public-wp-export/manifest.json",
  "data/public-wp-export/site-meta.json",
  "data/public-wp-export/pages.json",
  "data/public-wp-export/posts.json",
  "data/public-wp-export/products.json",
  "data/public-wp-export/product-details.json",
  "data/public-wp-export/categories.json",
  "data/public-wp-export/product-categories.json",
  "data/public-wp-export/comments.json",
  "data/public-wp-export/shop-visibility.json",
  "data/assets/manifest.json",
  "public/site-logo.png"
];

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function sha256(buffer: string | Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function languageFor(relativePath: string) {
  const extension = extname(relativePath);
  if (extension === ".tsx") return "tsx";
  if (extension === ".ts") return "ts";
  if (extension === ".css") return "css";
  if (extension === ".json") return "json";
  if (extension === ".md") return "markdown";
  return "text";
}

function fenceFor(content: string) {
  const longest = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  return "`".repeat(Math.max(4, longest + 1));
}

function redact(relativePath: string, content: string) {
  let safe = content;

  // 디자인 리뷰에 필요하지 않은 실계좌 번호는 단일 패킷 재배포 시 중복 노출하지 않는다.
  safe = safe.replace(/3333137744634/g, "[REDACTED_PUBLIC_ACCOUNT_NUMBER]");

  // 혹시 이후 원문에 환경값 할당이 추가되어도 패킷에는 값이 들어가지 않게 방어한다.
  safe = safe.replace(
    /^(\s*(?:ADMIN_PASSWORD|ADMIN_SESSION_SECRET|SUPABASE_DATABASE_URL|SUPABASE_DIRECT_URL|SUPABASE_DB_PASSWORD|CRON_SECRET|CLOUDINARY_API_SECRET|CLOUDINARY_URL)\s*=\s*).+$/gm,
    "$1[REDACTED]"
  );

  if (relativePath.endsWith("protected-posts.md")) {
    safe = safe.replace(/(`?(?:password|비밀번호)`?\s*[:=]\s*)`?[^\s|]+`?/gi, "$1[REDACTED]");
  }

  return safe;
}

function stripHtml(value: unknown) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function preview(value: unknown, limit = 180) {
  const text = stripHtml(value);
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function summarizeWpRecord(record: Record<string, unknown> | undefined) {
  if (!record) return null;
  const title = record.title as Record<string, unknown> | string | undefined;
  const excerpt = record.excerpt as Record<string, unknown> | string | undefined;
  const content = record.content as Record<string, unknown> | string | undefined;
  const titleValue = typeof title === "object" && title ? title.rendered : title;
  const excerptValue = typeof excerpt === "object" && excerpt ? excerpt.rendered : excerpt;
  const contentValue = typeof content === "object" && content ? content.rendered : content;
  return {
    id: record.id,
    date: record.date,
    modified: record.modified,
    slug: record.slug,
    status: record.status,
    link: record.link,
    title: preview(titleValue, 120),
    excerptPreview: preview(excerptValue, 180),
    contentPreview: preview(contentValue, 220),
    contentCharacters: String(contentValue ?? "").length,
    categories: record.categories,
    imageFieldNames: Object.keys(record).filter((key) => /image|media/i.test(key))
  };
}

function dataShape(value: unknown, depth = 0): unknown {
  if (depth > 2) return Array.isArray(value) ? `array(${value.length})` : typeof value;
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      item: value.length ? dataShape(value[0], depth + 1) : null
    };
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [key, dataShape(item, depth + 1)])
    );
  }
  return value === null ? "null" : typeof value;
}

function safeDataSamples() {
  const pages = JSON.parse(read("data/public-wp-export/pages.json")) as { records?: Record<string, unknown>[] };
  const posts = JSON.parse(read("data/public-wp-export/posts.json")) as { records?: Record<string, unknown>[] };
  const products = JSON.parse(read("data/public-wp-export/products.json")) as { records?: Record<string, unknown>[] };
  const details = JSON.parse(read("data/public-wp-export/product-details.json")) as Record<string, unknown>[];
  const manifest = JSON.parse(read("data/public-wp-export/manifest.json"));
  const visibility = JSON.parse(read("data/public-wp-export/shop-visibility.json"));
  const product210 = products.records?.find((record) => String(record.slug) === "210") ?? products.records?.[0];
  const detail210 = details.find((record) => String(record.slug) === "210") ?? details[0];

  return {
    manifest,
    representativePage: summarizeWpRecord(pages.records?.find((record) => String(record.slug) === "res") ?? pages.records?.[0]),
    representativePost: summarizeWpRecord(posts.records?.[0]),
    representativeProduct: summarizeWpRecord(product210),
    productDetailShape: dataShape(detail210),
    shopVisibilitySummary: {
      capturedAt: visibility.capturedAt,
      visibleSlugCount: Array.isArray(visibility.visibleSlugs) ? visibility.visibleSlugs.length : 0,
      pageCount: Array.isArray(visibility.pages) ? visibility.pages.length : 0
    }
  };
}

const lines: string[] = [];
const add = (...items: string[]) => lines.push(...items);

add(
  "# Aloha Frontend Design Review Request — Zero-context packet",
  "",
  "> 이 문서는 코드베이스 접근 권한이나 사전 대화가 없는 리뷰어에게 그대로 전달하는 단일 입력물이다. 아래 설명과 원문 소스 번들만으로 현재 UI를 이해하고 구체적인 개선안을 작성해 달라.",
  "",
  "## 1. 리뷰 의뢰 요약",
  "",
  "운영 중인 `https://aloha-yt.xyz`는 WordPress/WooCommerce에서 Next.js 15 + React 19 + Vercel + Supabase + Cloudinary 구조로 이전한 한국어 콘텐츠·상품 사이트다. 기능 이관은 대부분 끝났지만, 현재 프론트엔드는 기능 추가 과정에서 전역 CSS가 누적되었고 공개 화면과 관리자 화면의 시각적 완성도·일관성·모바일 사용성을 한 단계 다듬을 필요가 있다.",
  "",
  "이번 리뷰의 목표는 전면 재구축이나 예술적인 컨셉 제안이 아니다. 실제 1인 운영자가 적은 유지보수 비용으로 적용할 수 있는 80~90점 수준의 실용적인 개선안을 우선순위와 함께 받는 것이다. 희귀한 엣지 케이스를 모두 선제 해결하거나 무거운 디자인 시스템을 도입하는 방향은 선호하지 않는다.",
  "",
  "## 2. 반드시 검토할 화면",
  "",
  "| 우선순위 | 화면 | 운영 URL/경로 | 핵심 검토 포인트 |",
  "|---|---|---|---|",
  "| P0 | 전역 헤더·검색·푸터 | 모든 공개 페이지 | 정보 위계, 링크 가독성, 모바일 내비게이션, 브랜드 인상 |",
  "| P0 | 홈/글 목록 | `/`, `/page/2` | 긴 콘텐츠 제목, 카드 밀도, 최근 글·댓글, 탐색 효율 |",
  "| P0 | 일반 글·고정 페이지 | `/res`, `/terms`, `/227` 등 | 본문 타이포그래피, 이미지 폭, 표/목록/링크, 긴 글 읽기 |",
  "| P0 | 상점/상품 상세 | `/shop`, `/product/210` | 카드 비교성, 가격·상태 표현, 옵션과 CTA, 품절/예약 상태 |",
  "| P0 | 관리자 전용 공개 툴바 | 관리자 로그인 후 공개 URL | 현재 내용 편집, 대시보드 이동, 모바일 점유율과 구분감 |",
  "| P1 | 장바구니·결제·주문 완료 | `/cart`, `/checkout`, 완료 URL | 신뢰감, 폼 오류, 주문 요약, 모바일 입력 경험 |",
  "| P1 | 관리자 대시보드·목록·편집기 | `/loginpage/*` | 1인 운영 속도, 주요 액션 발견성, 저장 상태, 긴 폼 피로도 |",
  "| P2 | 검색·칼럼·댓글·후기·보호 글 | `/search`, `/column/*` 등 | 빈 상태, 보조 콘텐츠, 접근성, 일관성 |",
  "",
  "## 3. 현재 디자인 방향과 제약",
  "",
  "- 기본 톤은 따뜻한 크림 배경, 짙은 갈색 글자, 벽돌색 포인트, 반투명 패널이다.",
  "- 현재 핵심 토큰은 `--bg: #f5efe3`, `--panel: rgba(255, 251, 244, 0.78)`, `--ink: #1d1b19`, `--muted: #655e57`, `--accent: #8f2f1f`다.",
  "- NanumSquare와 GmarketSansMedium을 외부 WOFF로 불러온다. 폰트 요청 비용과 fallback도 검토 대상이다.",
  "- 사이트는 한국어가 기본이며 긴 제목, 긴 본문, WordPress에서 가져온 임의 HTML과 다양한 이미지 비율을 견뎌야 한다.",
  "- 공개 페이지의 SEO 경로, canonical, JSON-LD, sitemap과 글/상품 공개 정책을 깨면 안 된다.",
  "- 공개 방문자의 정적 생성·캐시는 유지해야 한다. 관리자 툴바 때문에 루트 레이아웃을 DB 기반 동적 렌더링으로 바꾸지 않는다.",
  "- 새로운 대형 UI 프레임워크, 아이콘 팩, 애니메이션 라이브러리는 명확한 편익이 없으면 도입하지 않는다.",
  "- 이미지 최적화와 페이지 로딩 비용을 중시한다. 장식용 이미지·영상·과도한 블러/애니메이션은 지양한다.",
  "- 관리자 화면은 다중 사용자 기업 CMS가 아니라 실제 채널 운영자 1명이 빠르게 쓰는 도구다.",
  "- 콘텐츠 공개 상태는 공개/링크 전용/비밀번호/완전 비공개/초안·예약을 구분한다. 디자인이 이 차이를 오해하게 만들면 안 된다.",
  "- 원문에 포함된 실계좌 번호와 비밀번호성 값은 리뷰와 무관하여 이 패킷에서 `[REDACTED…]`로 치환했다. 치환은 UI 구조 판단에 영향을 주지 않는다.",
  "",
  "## 4. 현재 화면 구조",
  "",
  "```text",
  "RootLayout",
  "├─ AdminPublicToolbar (관리자 세션일 때만 클라이언트에서 표시)",
  "├─ site-frame",
  "│  ├─ site-header: 브랜드 + FAQ/상점/장바구니 + 검색",
  "│  ├─ site-main",
  "│  │  ├─ 홈/아카이브 카드",
  "│  │  ├─ 글·페이지 article-shell + rich-text",
  "│  │  ├─ shop catalog → product detail → cart → checkout",
  "│  │  └─ loginpage 관리자 dashboard/list/editor",
  "│  └─ site-footer: 사업자 정보 + 고객센터 + 정책 링크",
  "└─ 전역 app/globals.css 한 파일이 공개·관리자 UI 대부분을 담당",
  "```",
  "",
  "관리자 툴바의 데이터 흐름은 다음과 같다.",
  "",
  "```text",
  "공개 페이지 정적 HTML",
  "  → 클라이언트 AdminPublicToolbar가 /api/admin/context?path=현재경로 요청",
  "  → 비로그인: 204 + DB 조회 없음 + 아무것도 렌더링하지 않음",
  "  → 로그인 상품: /loginpage/products/edit/[slug] 링크",
  "  → 로그인 글/페이지: clone_posts path 조회 후 /loginpage/posts/edit/[id] 링크",
  "```",
  "",
  "## 5. 리뷰어에게 원하는 결과물",
  "",
  "다음 순서로 답변해 달라.",
  "",
  "1. 현재 UI의 장점과 가장 큰 문제를 10줄 이내로 요약한다.",
  "2. 개선안을 `P0/P1/P2`, 예상 효과, 구현 난이도(S/M/L), 관련 파일/선택자와 함께 표로 정리한다.",
  "3. 전역 디자인 토큰(색상, 폰트 크기, 간격, radius, shadow, content width)의 구체적인 권장값을 제안한다.",
  "4. 공개 홈, 글/페이지, 상점, 상품 상세, 장바구니/결제, 관리자 툴바, 관리자 편집 화면을 각각 리뷰한다.",
  "5. 데스크톱 1280px, 태블릿 768px, 모바일 390px에서 발생할 문제와 해결책을 적는다.",
  "6. WCAG 관점에서 색 대비, 키보드 포커스, landmark/label, 오류 메시지, 터치 타깃을 점검한다.",
  "7. CLS/LCP/폰트/이미지/클라이언트 JS/blur 비용을 검토하고 로딩 부담이 거의 없는 개선부터 제안한다.",
  "8. 중복되거나 충돌하는 CSS, 너무 광범위한 selector, 컴포넌트 분리 후보를 실제 선택자와 함께 지적한다.",
  "9. 가장 가치가 큰 3~5개 개선은 적용 가능한 JSX/CSS patch 예시까지 작성한다.",
  "10. 취향 영역과 명백한 사용성 결함을 구분하며, 전면 리브랜딩이 필요하다고 단정하지 않는다.",
  "",
  "## 6. 특별히 답을 원하는 질문",
  "",
  "- 현재 920px 본문 폭과 1280px site-frame 조합이 글·상점·관리자 화면에 각각 적절한가?",
  "- 헤더가 데스크톱에서는 느슨하고 모바일에서는 검색까지 포함해 복잡해지는 문제를 어떻게 단순화할 것인가?",
  "- 24px radius와 반투명 패널이 거의 모든 요소에 반복되어 위계가 약해지는가? 그렇다면 어떤 계층만 유지할 것인가?",
  "- 글 본문의 WordPress HTML을 안전하게 유지하면서 타이포그래피·표·목록·이미지·링크 품질을 어떻게 높일 것인가?",
  "- 상품 목록에서 이미지/제목/가격/예약·품절 상태가 빠르게 비교되도록 어떤 카드 구조가 좋은가?",
  "- 관리자 툴바가 WordPress처럼 유용하면서도 모바일 공개 화면을 과도하게 가리지 않게 하려면 어떤 구조가 좋은가?",
  "- 관리자 편집기의 저장/업로드/공개 상태를 어떤 sticky action bar와 상태 피드백으로 정리하는 것이 좋은가?",
  "- `app/globals.css`를 즉시 대규모 CSS Module 전환하지 않고도 어떤 단위부터 정리하면 효과가 큰가?",
  "- 외부 폰트를 유지할지, 로컬 호스팅/시스템 폰트로 바꿀지 성능과 분위기를 함께 고려해 판단해 달라.",
  "",
  "## 7. 데이터 규모와 대표 샘플",
  "",
  "대용량 WordPress JSON과 이미지 바이너리는 문서에 통째로 넣지 않았다. 이는 각각 수 MB이고 댓글 개인정보나 콘텐츠 원문을 중복 포함할 수 있기 때문이다. 대신 파일 크기·해시, 데이터 구조, UI 판단에 필요한 길이와 미리보기만 아래에 포함한다.",
  ""
);

add("### 7.1 데이터 파일 인벤토리", "", "| 경로 | bytes | SHA-256 |", "|---|---:|---|");
for (const relativePath of dataFiles) {
  const buffer = readFileSync(resolve(root, relativePath));
  add(`| \`${relativePath}\` | ${buffer.byteLength.toLocaleString("en-US")} | \`${sha256(buffer)}\` |`);
}

const samples = JSON.stringify(safeDataSamples(), null, 2);
const sampleFence = fenceFor(samples);
add("", "### 7.2 안전하게 축약한 대표 데이터", "", `${sampleFence}json`, samples, sampleFence, "");

add(
  "## 8. 소스 번들 무결성 인덱스",
  "",
  "아래 SHA-256은 이 문서가 생성될 때 읽은 원본 기준이다. 패킷 안에서는 위에 설명한 민감값만 치환되므로 해당 파일 블록의 텍스트 해시와 다를 수 있다.",
  "",
  "| 그룹 | 경로 | lines | bytes | 원본 SHA-256 |",
  "|---|---|---:|---:|---|"
);

for (const group of sourceGroups) {
  for (const relativePath of group.files) {
    const content = read(relativePath);
    add(`| ${group.title.split(". ")[0]} | \`${relativePath}\` | ${content.split("\n").length} | ${Buffer.byteLength(content).toLocaleString("en-US")} | \`${sha256(content)}\` |`);
  }
}

add(
  "",
  "## 9. 전체 관련 소스 원문",
  "",
  "> 각 블록은 경로를 제목으로 갖고 있으며 생략 없이 파일 전체를 포함한다. 단, 3절의 민감값 치환 규칙은 적용된다.",
  ""
);

for (const group of sourceGroups) {
  add(`## ${group.title}`, "", group.purpose, "");
  for (const relativePath of group.files) {
    const content = redact(relativePath, read(relativePath));
    const fence = fenceFor(content);
    add(
      `<details><summary><code>${relativePath}</code> — 전체 ${content.split("\n").length}줄</summary>`,
      "",
      `${fence}${languageFor(relativePath)}`,
      content,
      fence,
      "",
      "</details>",
      ""
    );
  }
}

add(
  "## 10. 리뷰 범위 밖이거나 의도적으로 미첨부한 항목",
  "",
  "- `.env*`, `.local/*`, PAT, Vercel/Supabase/Cloudinary 실제 값: 디자인 리뷰에 필요하지 않은 비밀정보다.",
  "- `package-lock.json`, `.next`, `node_modules`: 재현 가능한 의존성 산출물이며 UI 판단에 불필요하다.",
  "- `data/public-wp-export/*.json` 전체: 수 MB 원문·댓글 개인정보·반복 HTML을 포함하므로 7절에 구조와 대표 샘플을 제공했다.",
  "- `data/assets/raw/**`, 이미지 바이너리: 7절에 경로·용량·해시를 제공했고 실제 렌더링은 운영 URL에서 볼 수 있다.",
  "- 배포/백업/DNS/SEO 런북: 시각 디자인과 직접 관련된 제약은 3절에 요약했다.",
  "",
  "이 누락 목록 때문에 판단할 수 없는 항목이 있다면, 추측하지 말고 정확히 어떤 데이터가 왜 필요한지 답변 마지막에 별도로 적어 달라.",
  ""
);

writeFileSync(outputPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
console.log(`Generated ${outputPath}`);
console.log(`Bytes: ${statSync(outputPath).size.toLocaleString("en-US")}`);
console.log(`Bundled source files: ${sourceGroups.reduce((sum, group) => sum + group.files.length, 0)}`);
