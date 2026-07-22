# Aloha Frontend Design Review Request — Zero-context packet

> 이 문서는 코드베이스 접근 권한이나 사전 대화가 없는 리뷰어에게 그대로 전달하는 단일 입력물이다. 아래 설명과 원문 소스 번들만으로 현재 UI를 이해하고 구체적인 개선안을 작성해 달라.

## 1. 리뷰 의뢰 요약

운영 중인 `https://aloha-yt.xyz`는 WordPress/WooCommerce에서 Next.js 15 + React 19 + Vercel + Supabase + Cloudinary 구조로 이전한 한국어 콘텐츠·상품 사이트다. 기능 이관은 대부분 끝났지만, 현재 프론트엔드는 기능 추가 과정에서 전역 CSS가 누적되었고 공개 화면과 관리자 화면의 시각적 완성도·일관성·모바일 사용성을 한 단계 다듬을 필요가 있다.

이번 리뷰의 목표는 전면 재구축이나 예술적인 컨셉 제안이 아니다. 실제 1인 운영자가 적은 유지보수 비용으로 적용할 수 있는 80~90점 수준의 실용적인 개선안을 우선순위와 함께 받는 것이다. 희귀한 엣지 케이스를 모두 선제 해결하거나 무거운 디자인 시스템을 도입하는 방향은 선호하지 않는다.

## 2. 반드시 검토할 화면

| 우선순위 | 화면 | 운영 URL/경로 | 핵심 검토 포인트 |
|---|---|---|---|
| P0 | 전역 헤더·검색·푸터 | 모든 공개 페이지 | 정보 위계, 링크 가독성, 모바일 내비게이션, 브랜드 인상 |
| P0 | 홈/글 목록 | `/`, `/page/2` | 긴 콘텐츠 제목, 카드 밀도, 최근 글·댓글, 탐색 효율 |
| P0 | 일반 글·고정 페이지 | `/res`, `/terms`, `/227` 등 | 본문 타이포그래피, 이미지 폭, 표/목록/링크, 긴 글 읽기 |
| P0 | 상점/상품 상세 | `/shop`, `/product/210` | 카드 비교성, 가격·상태 표현, 옵션과 CTA, 품절/예약 상태 |
| P0 | 관리자 전용 공개 툴바 | 관리자 로그인 후 공개 URL | 현재 내용 편집, 대시보드 이동, 모바일 점유율과 구분감 |
| P1 | 장바구니·결제·주문 완료 | `/cart`, `/checkout`, 완료 URL | 신뢰감, 폼 오류, 주문 요약, 모바일 입력 경험 |
| P1 | 관리자 대시보드·목록·편집기 | `/loginpage/*` | 1인 운영 속도, 주요 액션 발견성, 저장 상태, 긴 폼 피로도 |
| P2 | 검색·칼럼·댓글·후기·보호 글 | `/search`, `/column/*` 등 | 빈 상태, 보조 콘텐츠, 접근성, 일관성 |

## 3. 현재 디자인 방향과 제약

- 기본 톤은 따뜻한 크림 배경, 짙은 갈색 글자, 벽돌색 포인트, 반투명 패널이다.
- 현재 핵심 토큰은 `--bg: #f5efe3`, `--panel: rgba(255, 251, 244, 0.78)`, `--ink: #1d1b19`, `--muted: #655e57`, `--accent: #8f2f1f`다.
- NanumSquare와 GmarketSansMedium을 외부 WOFF로 불러온다. 폰트 요청 비용과 fallback도 검토 대상이다.
- 사이트는 한국어가 기본이며 긴 제목, 긴 본문, WordPress에서 가져온 임의 HTML과 다양한 이미지 비율을 견뎌야 한다.
- 공개 페이지의 SEO 경로, canonical, JSON-LD, sitemap과 글/상품 공개 정책을 깨면 안 된다.
- 공개 방문자의 정적 생성·캐시는 유지해야 한다. 관리자 툴바 때문에 루트 레이아웃을 DB 기반 동적 렌더링으로 바꾸지 않는다.
- 새로운 대형 UI 프레임워크, 아이콘 팩, 애니메이션 라이브러리는 명확한 편익이 없으면 도입하지 않는다.
- 이미지 최적화와 페이지 로딩 비용을 중시한다. 장식용 이미지·영상·과도한 블러/애니메이션은 지양한다.
- 관리자 화면은 다중 사용자 기업 CMS가 아니라 실제 채널 운영자 1명이 빠르게 쓰는 도구다.
- 콘텐츠 공개 상태는 공개/링크 전용/비밀번호/완전 비공개/초안·예약을 구분한다. 디자인이 이 차이를 오해하게 만들면 안 된다.
- 원문에 포함된 실계좌 번호와 비밀번호성 값은 리뷰와 무관하여 이 패킷에서 `[REDACTED…]`로 치환했다. 치환은 UI 구조 판단에 영향을 주지 않는다.

## 4. 현재 화면 구조

```text
RootLayout
├─ AdminPublicToolbar (관리자 세션일 때만 클라이언트에서 표시)
├─ site-frame
│  ├─ site-header: 브랜드 + FAQ/상점/장바구니 + 검색
│  ├─ site-main
│  │  ├─ 홈/아카이브 카드
│  │  ├─ 글·페이지 article-shell + rich-text
│  │  ├─ shop catalog → product detail → cart → checkout
│  │  └─ loginpage 관리자 dashboard/list/editor
│  └─ site-footer: 사업자 정보 + 고객센터 + 정책 링크
└─ 전역 app/globals.css 한 파일이 공개·관리자 UI 대부분을 담당
```

관리자 툴바의 데이터 흐름은 다음과 같다.

```text
공개 페이지 정적 HTML
  → 클라이언트 AdminPublicToolbar가 /api/admin/context?path=현재경로 요청
  → 비로그인: 204 + DB 조회 없음 + 아무것도 렌더링하지 않음
  → 로그인 상품: /loginpage/products/edit/[slug] 링크
  → 로그인 글/페이지: clone_posts path 조회 후 /loginpage/posts/edit/[id] 링크
```

## 5. 리뷰어에게 원하는 결과물

다음 순서로 답변해 달라.

1. 현재 UI의 장점과 가장 큰 문제를 10줄 이내로 요약한다.
2. 개선안을 `P0/P1/P2`, 예상 효과, 구현 난이도(S/M/L), 관련 파일/선택자와 함께 표로 정리한다.
3. 전역 디자인 토큰(색상, 폰트 크기, 간격, radius, shadow, content width)의 구체적인 권장값을 제안한다.
4. 공개 홈, 글/페이지, 상점, 상품 상세, 장바구니/결제, 관리자 툴바, 관리자 편집 화면을 각각 리뷰한다.
5. 데스크톱 1280px, 태블릿 768px, 모바일 390px에서 발생할 문제와 해결책을 적는다.
6. WCAG 관점에서 색 대비, 키보드 포커스, landmark/label, 오류 메시지, 터치 타깃을 점검한다.
7. CLS/LCP/폰트/이미지/클라이언트 JS/blur 비용을 검토하고 로딩 부담이 거의 없는 개선부터 제안한다.
8. 중복되거나 충돌하는 CSS, 너무 광범위한 selector, 컴포넌트 분리 후보를 실제 선택자와 함께 지적한다.
9. 가장 가치가 큰 3~5개 개선은 적용 가능한 JSX/CSS patch 예시까지 작성한다.
10. 취향 영역과 명백한 사용성 결함을 구분하며, 전면 리브랜딩이 필요하다고 단정하지 않는다.

## 6. 특별히 답을 원하는 질문

- 현재 920px 본문 폭과 1280px site-frame 조합이 글·상점·관리자 화면에 각각 적절한가?
- 헤더가 데스크톱에서는 느슨하고 모바일에서는 검색까지 포함해 복잡해지는 문제를 어떻게 단순화할 것인가?
- 24px radius와 반투명 패널이 거의 모든 요소에 반복되어 위계가 약해지는가? 그렇다면 어떤 계층만 유지할 것인가?
- 글 본문의 WordPress HTML을 안전하게 유지하면서 타이포그래피·표·목록·이미지·링크 품질을 어떻게 높일 것인가?
- 상품 목록에서 이미지/제목/가격/예약·품절 상태가 빠르게 비교되도록 어떤 카드 구조가 좋은가?
- 관리자 툴바가 WordPress처럼 유용하면서도 모바일 공개 화면을 과도하게 가리지 않게 하려면 어떤 구조가 좋은가?
- 관리자 편집기의 저장/업로드/공개 상태를 어떤 sticky action bar와 상태 피드백으로 정리하는 것이 좋은가?
- `app/globals.css`를 즉시 대규모 CSS Module 전환하지 않고도 어떤 단위부터 정리하면 효과가 큰가?
- 외부 폰트를 유지할지, 로컬 호스팅/시스템 폰트로 바꿀지 성능과 분위기를 함께 고려해 판단해 달라.

## 7. 데이터 규모와 대표 샘플

대용량 WordPress JSON과 이미지 바이너리는 문서에 통째로 넣지 않았다. 이는 각각 수 MB이고 댓글 개인정보나 콘텐츠 원문을 중복 포함할 수 있기 때문이다. 대신 파일 크기·해시, 데이터 구조, UI 판단에 필요한 길이와 미리보기만 아래에 포함한다.

### 7.1 데이터 파일 인벤토리

| 경로 | bytes | SHA-256 |
|---|---:|---|
| `data/public-wp-export/manifest.json` | 945 | `cc986571199bf7a0e498aa3916c3565982cb2e85b7b7c06f471cf517c9b0ebcc` |
| `data/public-wp-export/site-meta.json` | 3,088,834 | `38ce4829c91bef4fb39b2e83a20376b79185f21619d4113cb97b4d2aa8b63c1c` |
| `data/public-wp-export/pages.json` | 88,626 | `6b15c04910c13aee0b5266557180e47e6084894898ad33edfc7f25fa1a0a215a` |
| `data/public-wp-export/posts.json` | 99,953 | `b446a32d4575d6b0157e9ff26f78eaa5e4748787325faab5601d2209f3bda179` |
| `data/public-wp-export/products.json` | 5,238,460 | `4be7a7ebb18792c5ab46dad4f563187729583a042ede13e9693b43274be6a670` |
| `data/public-wp-export/product-details.json` | 916,562 | `4b4ec8c39d34292d7e63e6d1b5ba702d945300d53a5b0b501d4f4e871e098227` |
| `data/public-wp-export/categories.json` | 175 | `c113cbf2fdfa197dfdd3ee71d6197e128d4a93b640031ecacda46aaf2b0c4315` |
| `data/public-wp-export/product-categories.json` | 976 | `0cae4bfe1116b62c5fd5f564132cef8aee2dbbb9072dcebad3152ace53984972` |
| `data/public-wp-export/comments.json` | 52 | `f9ecea015b30091fb0d02f30debf86db452d5bfbd7a0d72188a9471310d6e7ef` |
| `data/public-wp-export/shop-visibility.json` | 1,325 | `b3cfcc69ed62e763baae82a3c0c51b869aec05b3433cc88fde4533d7493327a1` |
| `data/assets/manifest.json` | 1,146,207 | `d95bc48de8297bb29b34911cb6f06b8290a45afea9aafe98c6b14a3d4e91ca2b` |
| `public/site-logo.png` | 129,935 | `2100a1d8417c65bf6e5d8a359ea3fa1ad14c948fc50bfe59d1dd98a3052af962` |

### 7.2 안전하게 축약한 대표 데이터

````json
{
  "manifest": {
    "capturedAt": "2026-07-14T07:19:04.640Z",
    "baseUrl": "https://aloha-yt.xyz/",
    "counts": {
      "posts": 16,
      "pages": 18,
      "products": 196,
      "categories": 1,
      "productCategories": 7,
      "comments": 0
    },
    "files": [
      "site-meta.json",
      "sitemap.json",
      "posts.json",
      "pages.json",
      "products.json",
      "categories.json",
      "product-categories.json",
      "comments.json"
    ],
    "incrementalSync": {
      "capturedAt": "2026-07-14T07:19:04.640Z",
      "fixedTargets": [
        "caution",
        "appeal",
        "terms"
      ],
      "productRange": {
        "from": 209,
        "to": 227
      },
      "mergedProductSlugs": [
        "209",
        "210",
        "211",
        "212",
        "213",
        "214",
        "215",
        "216",
        "217",
        "218",
        "219",
        "220",
        "221",
        "223",
        "224",
        "225",
        "226",
        "227"
      ],
      "missingProductSlugs": [
        "222"
      ]
    }
  },
  "representativePage": {
    "id": 240,
    "date": "2024-11-15T17:41:47",
    "slug": "res",
    "link": "https://aloha-yt.xyz/res/",
    "title": "매물 예약자 목록",
    "excerptPreview": "이 페이지는 매물이 구해지는 경우 알려달라고 말씀해주신 분들의 목록입니다. 예약금 입금 예약자 구두 예약자 바로 구매 가능한 매물 아래에 표시되는 매물이 있다면 현재 예약자가 없는 매물로, 바로 구매 가능합니다.클릭 자주 묻는 질문 지난 예약자분들 목록",
    "contentPreview": "시간 계산 중... 이 페이지는 매물이 구해지는 경우 알려달라고 말씀해주신 분들의 목록입니다. 예약해주시면 매물 목록이 업데이트 됐을 때 알림 메시지를 드립니다. 목록 윗쪽에 있을수록 먼저 알려드리며, 매물 구매 우선권을 갖습니다. 예약금 입금 예약자 Q. 예약금은 어떻게 입금할 수 있나요? A. 이 안내 에 따라주시면 됩니다. 차*표 (S급 매물만 알림) 쁘*****님(영어권 타겟 매물 알…",
    "contentCharacters": 7392,
    "imageFieldNames": []
  },
  "representativePost": {
    "id": 1425,
    "date": "2025-06-29T23:22:59",
    "slug": "notice",
    "link": "https://aloha-yt.xyz/2025/06/notice/",
    "title": "주의사항 : 한 번에 여러 글을 클릭하시면 IP가 차단됩니다",
    "excerptPreview": "요즘 불법크롤링 공격이 많아서 짧은시간에 여러 글을 열어보는 시도가 있으면 IP 차단을 하는 처리가 돼있습니다. IP 차단을 당하시면 이 홈페이지 접속이 불가능해집니다. 글을 읽어보실 때엔 한 번에 하나씩만 열어서 읽어주세요!",
    "contentPreview": "요즘 불법크롤링 공격이 많아서 짧은시간에 여러 글을 열어보는 시도가 있으면 IP 차단을 하는 처리가 돼있습니다. IP 차단을 당하시면 이 홈페이지 접속이 불가능해집니다. 글을 읽어보실 때엔 한 번에 하나씩만 열어서 읽어주세요!",
    "contentCharacters": 154,
    "categories": [
      1
    ],
    "imageFieldNames": []
  },
  "representativeProduct": {
    "id": 2787,
    "date": "2026-04-24T00:46:09",
    "modified": "2026-04-24T01:07:43",
    "slug": "210",
    "status": "publish",
    "link": "https://aloha-yt.xyz/product/210/",
    "title": "(S급)특수보장매물210번, 구독자 3만4600명, 쿠파스 O, 즉시 양도 가능, 애드센스 즉시 변경 가능",
    "excerptPreview": "현재 얼리버드 할인이 적용되어있습니다. 이 매물의 원래 가격은 169만원입니다. 이 매물을 보고 계신 분들은 알림설정을 해주신 분들일 것입니다. 좋은 가격에 가져가세요 ^^ 스크롤 끝까지 내리시면 아래에 채널 소개도 함께 나와있습니다. 제휴 프로그램(쿠파스) 가능 자연성장 채널 유튜브 커뮤니티 가이드라인 위반 경고 없음 …",
    "contentPreview": "직접 쿠파스 1만 채널을 운영하고, 실제 수익을 내면서 쌓은 노하우로 채널 매물을 고르고 있습니다. &#8211; 애드센스 연결 일대일 가이드 제공 &#8211; 채널 저품질시 환불 보장 &#8211; 채널 운영 가이드 문서 제공(자주 묻는 질문 포함) &#8211; 수익창출된 채널 + 동영상/쇼츠 조회수 수익창출 활성화 + 쿠팡파트너스 제휴프로그램 가능 &#8211; 채널 수익창출 정지 이…",
    "contentCharacters": 23415,
    "imageFieldNames": []
  },
  "productDetailShape": {
    "id": "number",
    "slug": "string",
    "link": "string",
    "title": "string",
    "schema": {
      "@context": "string",
      "@type": "string",
      "@id": "string",
      "name": "string",
      "url": "string",
      "description": "string",
      "image": "string",
      "sku": "string",
      "offers": {
        "type": "array",
        "length": 1,
        "item": "object"
      }
    },
    "extractedReviews": {
      "type": "array",
      "length": 0,
      "item": null
    },
    "publicSignals": {
      "hasRefundText": "boolean",
      "hasGmailDeliveryText": "boolean",
      "hasPdfOptionText": "boolean",
      "hasBankTransferText": "boolean"
    }
  },
  "shopVisibilitySummary": {
    "capturedAt": "2026-07-14T07:19:04.640Z",
    "visibleSlugCount": 39,
    "pageCount": 3
  }
}
````

## 8. 소스 번들 무결성 인덱스

아래 SHA-256은 이 문서가 생성될 때 읽은 원본 기준이다. 패킷 안에서는 위에 설명한 민감값만 치환되므로 해당 파일 블록의 텍스트 해시와 다를 수 있다.

| 그룹 | 경로 | lines | bytes | 원본 SHA-256 |
|---|---|---:|---:|---|
| A | `package.json` | 68 | 2,679 | `d15b6ed505a75f771efffd7f0a11ddf22b6ef98bd2d34f4a09c07447a1c05570` |
| A | `next.config.ts` | 44 | 1,234 | `d985fc065846ab7c5094aaa5429d30196b233b4939dfdacd8d3d8aea1d40c376` |
| A | `app/layout.tsx` | 130 | 4,515 | `c3f3b2ac6b42751345af2a79bdc4d6c8b3c13738691d285566300d00ce977a87` |
| A | `app/globals.css` | 2270 | 35,401 | `34530941aa81738267d7e7e890cf18301e2ccdeef7e828df203e5a4a8104ad13` |
| B | `app/page.tsx` | 25 | 928 | `fce7db68606ff32af0107bcdfe130c0e98b6fc6ceff13076a6501b1c6077bf92` |
| B | `app/page/[page]/page.tsx` | 67 | 1,722 | `4edacd1992a7fc4a3f1da1b462787c6fc7c9d8f16c336de31e2f21e71fec9b64` |
| B | `app/[...slug]/page.tsx` | 254 | 8,026 | `7c275fe95475a65426c3dc8b1a16ec5dd8a7d4636a87ff59adac0f2e326ba1a9` |
| B | `app/column/page.tsx` | 22 | 523 | `722063e2cc129c11d366e7d5d51e7eb3e7372644144c69257dbf6904d117575f` |
| B | `app/column/[slug]/page.tsx` | 60 | 1,797 | `f69758d1238668929df4250757dd6b81a42b8112fef3eae5d8834b76700c5b20` |
| B | `app/shop/page.tsx` | 26 | 788 | `cd2079b105bbd6e158c6238c2fec43ee5fcbdc838de1e97f21551cc65ecd345a` |
| B | `app/shop/page/[page]/page.tsx` | 69 | 1,773 | `601e1f7633de44cffd898d15a46f9ba9f9282a0732586a6f1880d47615dffd4c` |
| B | `app/product/[slug]/page.tsx` | 160 | 5,332 | `03ee242ce8234da154254eb14b21920a69555d56752808e472a8eaccdcd08f02` |
| B | `app/search/page.tsx` | 39 | 1,373 | `d811d686cd680eafeb9f4a54b88483ab092c051d55c17e7d21c3bed2ab9098d6` |
| B | `app/privacy/page.tsx` | 6 | 123 | `7a9d87fafd479bb12aae46a79c537cad779a346da571ea8618a4353e549d8050` |
| B | `app/cart/layout.tsx` | 11 | 266 | `43a7810fb2ce352ff992c5b8f2a51bceae63787d59112e39ce8c135094cfbf04` |
| B | `app/cart/page.tsx` | 32 | 877 | `2615a501c5b38af21809b8abc4e1a14e5a63c731cea623311bbadf4e70fe434d` |
| B | `app/checkout/layout.tsx` | 11 | 281 | `725bb895c911a82ccc015401a8287302483f05fc868929782a6ef019d21f8cd6` |
| B | `app/checkout/page.tsx` | 32 | 887 | `34bb42d1f98ec2f75ee594f67223a77c695ad86ba328a086f317bf92762e9be9` |
| B | `app/checkout/order-received/[orderId]/page.tsx` | 25 | 767 | `4f64bbb343bbf541e6ff76597b66d5da4165911277b6f14116f5611587a178b2` |
| C | `components/admin-public-toolbar.tsx` | 81 | 2,431 | `927ac458c1c87881ff6a1fbd4c9e39b98e5de451347441d5c1d12557e05b9c5d` |
| C | `components/comment-thread.tsx` | 30 | 962 | `fcb50df1aa548efa80107b46ee6ec2b780fb53631c1b7cdcb35dd7cbda6aa9da` |
| C | `components/linkified-text.tsx` | 55 | 1,337 | `27b8df6e9371cd0595ba949caee1b1bda3f690258188c91b8d7dfca71888231f` |
| C | `components/pagination-nav.tsx` | 53 | 1,309 | `74255d1f3c9ee66b0dc8458769ded399e0457d89dead4e7fcc35b896a23c6197` |
| C | `components/post-archive-feed.tsx` | 40 | 1,286 | `b13eae553a91c0778d5bef7791d8b945d20caed64f19ba48dde3cdccd2fad73b` |
| C | `components/product-price-content.tsx` | 32 | 868 | `b4a522c17f4109f1791dcfa4bb06bd21558b180b89586c7ac25ccb0e1c693125` |
| C | `components/product-status-badges.tsx` | 24 | 764 | `c321eb4d271f3097506e62976d39ba604169b8688e144351f7402194ec393db1` |
| C | `components/protected-post-gate.tsx` | 90 | 3,121 | `d99ac80b97585583dda5182ec782fa7ab9a63094856d33950d1ac2ae6af505c7` |
| C | `components/review-list.tsx` | 28 | 970 | `1a008d97bbdca985a6449f52e9e41d5cdf78d75ff86cac03c043b039218c9f11` |
| C | `components/rich-html.tsx` | 9 | 213 | `8c3cfb9f4d0b813aa78ae2fd1b6f12460bc94eb3e0c583c470d866317a3a7fa0` |
| C | `components/shop-catalog.tsx` | 72 | 2,555 | `7a9e86d52301aff8ce008f291169197af092eb8ce51be3c76ba736dc32af06b5` |
| C | `components/storefront-client.tsx` | 616 | 19,091 | `e82bf18518e1d5008fc1e9eee32b49d15e397feed9e5d9804a6298846616028c` |
| C | `components/structured-data.tsx` | 9 | 320 | `6025c23cccf7d10ef6af6aa7ac2d008e6f1259737aff4e8f82c596f038e7ca21` |
| D | `app/loginpage/layout.tsx` | 15 | 281 | `c8396352400e0fb44c7c00f529518acb367edd3d3a9dea90d29186a256622644` |
| D | `app/loginpage/page.tsx` | 38 | 1,225 | `93f415f46d644eedc8c65660d08e7f90e4d5d3787a7fcbe6fb642be60ae8f9de` |
| D | `app/loginpage/(dashboard)/layout.tsx` | 34 | 1,068 | `45ad555c6f2825c9b14bb7d63c950904cc79c8cd0d85703cc48fc271ab0024a9` |
| D | `app/loginpage/(dashboard)/dashboard/page.tsx` | 87 | 4,016 | `844b67bc00baa238183b004cf071a9cf96af410d2ceeb417b913c79be16973fb` |
| D | `app/loginpage/(dashboard)/posts/page.tsx` | 105 | 5,288 | `befda4be87fa26edf6e6c92545e62e817876b209a501fde2c560b9968b5ee7ea` |
| D | `app/loginpage/(dashboard)/posts/new/page.tsx` | 11 | 265 | `c6625112b563706f4091b0d492dc69dba46de4f5760828d71cfdc21d5e06ea5e` |
| D | `app/loginpage/(dashboard)/posts/edit/[id]/page.tsx` | 18 | 576 | `cbb9393434047a860f07c9e56fe759982a1840f6336eb705cadc8395bb185c9e` |
| D | `app/loginpage/(dashboard)/products/page.tsx` | 18 | 511 | `80b57ea08d39c789534394e2ea948dbfa06b4d702d8438601c552396a4807b45` |
| D | `app/loginpage/(dashboard)/products/page/[page]/page.tsx` | 29 | 818 | `5f17302a0422494f883f847bffc3be924ad4f42cbb7ad6e740bcaebbcdcafa51` |
| D | `app/loginpage/(dashboard)/products/common/page.tsx` | 46 | 1,899 | `92295834ecc6518e03ecc8bcca1192fa62bae54db1abc2af4b92a4fb5e70f5e5` |
| D | `app/loginpage/(dashboard)/products/edit/[slug]/page.tsx` | 163 | 6,445 | `c2b8dd9a105ab57726bb1fbd09b337542910df779db9fcedf9e61700aaef0568` |
| D | `app/loginpage/(dashboard)/orders/page.tsx` | 105 | 3,414 | `0e79a15589a88467e54a0b9483af1275a82cb1e062983d06cd7de56b56fe15fb` |
| D | `app/loginpage/(dashboard)/assets/page.tsx` | 64 | 2,696 | `bbf45b43925306ec575a683d2ef695d029e531ef2450d94f479350629e5667dc` |
| D | `components/admin-html-editor.tsx` | 492 | 16,588 | `19d438f8ac1e60be5b2c6211417f30ac62d3d4fa79a1e9f229386f21be010646` |
| D | `components/admin-post-form.tsx` | 151 | 7,687 | `413020f81b60584579764b70d60871b89526e0f1cdc9789524c1254f512168cc` |
| D | `components/admin-products-index.tsx` | 193 | 7,688 | `beec31509e54502f326ceab13ae1ce3c78f022cf552ccca92d63019ebe229b88` |
| E | `app/admin/layout.tsx` | 15 | 277 | `9794a5ef121c02492134e98a949fd22ebf85d879c9666aa7d4794067ece18b99` |
| E | `app/admin/login/page.tsx` | 6 | 122 | `b011c8f26ee0fac20be090d7892a226bfa34cc59ec5edaf3e6b32c4aead172a8` |
| E | `app/admin/(dashboard)/layout.tsx` | 6 | 119 | `a5f357838b68daf91011027dc75ddcc8f27a3e2f3ea246ccb561be1def9e1194` |
| E | `app/admin/(dashboard)/page.tsx` | 33 | 995 | `41ae018de77674c4642eaeb46a91df9ea9e83cf4f126e668654aa15ab77c52b4` |
| E | `app/admin/(dashboard)/posts/page.tsx` | 79 | 3,219 | `d1166b1ca3000de3676f17a1ec6d534cb39aa5036cb21881e559c9183adcefa5` |
| E | `app/admin/(dashboard)/products/page.tsx` | 145 | 6,249 | `45b886c87abb20271b91a6ebf87f57a85cd575b4fa5501988e049d7a0cc9dd31` |
| E | `app/admin/(dashboard)/assets/page.tsx` | 51 | 1,979 | `285505e3656962a8dda77bc5ed4277d3eaffca0acb64da1409255727011f0ac5` |
| F | `app/admin/actions.ts` | 406 | 15,363 | `33c088924d58fa05585e5bb92c1d2b0845fb95df0cf4080fa161740e49affc2b` |
| F | `app/api/admin/context/route.ts` | 83 | 2,783 | `4c6694471718e4ef100118e77f84ff13fe647b61a510d034daa63fb877cb6ae0` |
| F | `app/api/admin/uploads/route.ts` | 30 | 990 | `2789f5af97d1083d8106ff5ff0cbf4a8f0580f9a961b6bcd9b568743e2a306ed` |
| F | `app/api/orders/route.ts` | 92 | 3,186 | `dfe323be796e5023f4fdefdefdf716e2a420d667591a0fa1e01086ffc4e2da75` |
| F | `app/api/posts/unlock/route.ts` | 56 | 2,204 | `ac503bb9db983496eddcc466749bbb847c0a59a60a8bf6c983306a4e535070a8` |
| F | `lib/admin-auth.ts` | 121 | 3,170 | `2e023d2f24939425dc0cbc1e30bd6e704fa5cd52c45b1c2ffb08a9e689b63960` |
| F | `lib/admin-db.ts` | 356 | 11,492 | `3af0789473c48a47f31285c763339b8fee5b53e66ce5f8009ae74f21c7367ba2` |
| F | `lib/admin-store.ts` | 754 | 25,052 | `7f2abfc71a1ae00342a58dc70ab284592bfe6b0a34cbc01e28f8787b8459bd08` |
| F | `lib/admin-uploads.ts` | 113 | 3,155 | `0934c899c8353342b2595888e361b4fe38a6a6cd39614b6599ea502b8fbd8911` |
| F | `lib/asset-map.ts` | 152 | 4,519 | `559a819a70419b596ee72120644db4a831c05a4151456e7a2e631dca7d2f01aa` |
| F | `lib/asset-utils.ts` | 140 | 3,884 | `0f19f04b910b52aacf8fbc7ab703c932f614b48d75659bc90618164e850c61e8` |
| F | `lib/html-utils.ts` | 29 | 826 | `b6bf70f34c875bf2a0616482b48403e5f3320844fc839f3c7d4650362eb29ab3` |
| F | `lib/product-pricing.ts` | 17 | 482 | `5dea1159438defdc35b81fc2883265f27c61cc98641a559c1b722a527c06af7e` |
| F | `lib/project-config.ts` | 20 | 871 | `f16eda3bf3030a0a6ec84697f5b8500428c66336d965a9d14e548adce932c2fd` |
| F | `lib/purchase-flow.ts` | 57 | 1,260 | `8cbc306ea541bdaa9bac462543c541d35ef6672cec4586971bda0cfad8d00c62` |
| F | `lib/server-env.ts` | 80 | 1,894 | `e36526637a65df4a0e166adbb37888251a426cf8e35deba3d76dde2e8ecc0c3c` |
| F | `lib/site-data.ts` | 1234 | 38,801 | `198992142f55acf7ab9555e34543a8aa9bb2f018df3862a4f05d31613b23742a` |
| F | `lib/site-url.ts` | 50 | 1,438 | `b160a82080862a8e8c527eaf2e31900a2b87ab6c23b07a5c4ae5e5521ca0092b` |
| F | `lib/text-format.ts` | 16 | 340 | `b4908a9b6dbf7d3eac91674648000e8ee37c583a908b799ffe7a7d5d5d91b1cd` |
| G | `docs/project-brief.md` | 27 | 1,561 | `9df4d4cc3dd9dc785491273728c2042af3a34d72b4ca9ab7b74f8b23cbae0251` |
| G | `docs/clone-plan.md` | 32 | 984 | `ca84b95da4fb204b8666be5fc6d22847c504e7b61ad6d02637dac26d54babaed` |
| G | `docs/admin-editor.md` | 92 | 7,325 | `b443cba1ea73de5a8d0bec472de04cba7cb5fe0301199852344a6733ef4de86f` |
| G | `docs/asset-pipeline.md` | 39 | 1,579 | `feb1d6aa76d1499a802261d268fd988906f9916a242204520d8b94e043b7c004` |
| G | `docs/browseros-qa.md` | 38 | 1,836 | `307bdcccc7b2f6016007fc4521892cf7a2cb98dda1a008db1cf30e2eb6752958` |
| G | `docs/protected-posts.md` | 32 | 1,460 | `c8eb2f026198ca24c05faea3f9e61c8e4dec1183073fcbe003d4fff1567f2d5e` |
| G | `docs/purchase-flow.md` | 33 | 1,063 | `c874b0536af816d11394282122cf1b1e85298152864c148daf3d3c2b6b270859` |

## 9. 전체 관련 소스 원문

> 각 블록은 경로를 제목으로 갖고 있으며 생략 없이 파일 전체를 포함한다. 단, 3절의 민감값 치환 규칙은 적용된다.

## A. 실행 환경과 전역 셸

프레임워크 버전, 전역 메타데이터, 헤더·검색·푸터·관리자 툴바가 모든 화면을 감싸는 방식을 보여준다.

<details><summary><code>package.json</code> — 전체 68줄</summary>

````json
{
  "name": "aloha-clone",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "24.x"
  },
  "scripts": {
    "dev": "next dev",
    "build": "ALOHA_SKIP_ADMIN_DB=1 next build",
    "build:guarded": "./scripts/run-guarded.sh npm run build",
    "start": "next start",
    "lint": "eslint .",
    "lint:guarded": "./scripts/run-guarded.sh npm run lint",
    "typecheck": "tsc --noEmit --incremental false",
    "audit:site": "tsx scripts/site-audit.ts",
    "audit:seo": "tsx scripts/seo-audit.ts",
    "backup:supabase": "bash scripts/backup-supabase.sh",
    "cutover:check": "bash scripts/check-domain-cutover.sh",
    "vercel:configure-env": "bash scripts/configure-vercel-production-env.sh",
    "vercel:cli": "bash scripts/vercel-cli.sh",
    "export:public": "tsx scripts/export-public-wp.ts",
    "export:public:guarded": "./scripts/run-guarded.sh npm run export:public",
    "enrich:products": "tsx scripts/export-product-details.ts",
    "enrich:products:guarded": "./scripts/run-guarded.sh npm run enrich:products",
    "export:protected": "tsx scripts/export-protected-posts.ts",
    "export:protected:guarded": "./scripts/run-guarded.sh npm run export:protected",
    "sync:incremental": "tsx scripts/sync-source-incremental.ts",
    "sync:incremental:guarded": "./scripts/run-guarded.sh npm run sync:incremental",
    "import:cloudinary-env": "tsx scripts/import-cloudinary-env.ts",
    "sync:assets": "tsx scripts/sync-assets.ts",
    "sync:assets:guarded": "./scripts/run-guarded.sh npm run sync:assets",
    "qa:browseros": "tsx scripts/browseros-visual-qa.ts",
    "qa:browseros:guarded": "./scripts/run-guarded.sh npm run qa:browseros",
    "qa:admin-products": "tsx scripts/browseros-admin-products-qa.ts",
    "qa:protected": "tsx scripts/browseros-protected-posts-qa.ts",
    "qa:protected:guarded": "./scripts/run-guarded.sh npm run qa:protected",
    "docs:frontend-review": "tsx scripts/generate-frontend-design-review.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.0",
    "@supabase/supabase-js": "^2.101.1",
    "cheerio": "^1.2.0",
    "cloudinary": "^2.9.0",
    "fast-xml-parser": "^5.5.10",
    "next": "^15.5.6",
    "pg": "^8.20.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.2",
    "@types/node": "^24.6.1",
    "@types/pg": "^8.20.0",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "eslint": "^9.39.1",
    "eslint-config-next": "^15.5.6",
    "playwright-core": "^1.59.1",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.2.2",
    "tsx": "^4.21.0",
    "typescript": "^6.0.2"
  }
}

````

</details>

<details><summary><code>next.config.ts</code> — 전체 44줄</summary>

````ts
import type { NextConfig } from "next";

const sourceHostname = new URL(process.env.SOURCE_BASE_URL ?? "https://aloha-yt.xyz").hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: sourceHostname
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      }
    ]
  },
  async redirects() {
    return [
      { source: "/wp-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap_index.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/feed", destination: "/feed.xml", permanent: true }
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet" }]
      }
    ];
  }
};

export default nextConfig;

````

</details>

<details><summary><code>app/layout.tsx</code> — 전체 130줄</summary>

````tsx
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { AdminPublicToolbar } from "@/components/admin-public-toolbar";
import { CartNavLink } from "@/components/storefront-client";
import { StructuredData } from "@/components/structured-data";
import { getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  const metadataBase = getSiteUrl(siteMeta.home);
  const description = siteMeta.description || `${siteMeta.name}의 글과 상품을 한곳에서 볼 수 있는 사이트`;
  return {
    metadataBase,
    title: {
      default: siteMeta.name,
      template: `%s | ${siteMeta.name}`
    },
    description,
    alternates: {
      canonical: "/",
      types: {
        "application/rss+xml": "/feed.xml"
      }
    },
    openGraph: {
      title: siteMeta.name,
      description,
      url: "/",
      siteName: siteMeta.name,
      images: siteMeta.site_icon_url ? [{ url: siteMeta.site_icon_url }] : undefined,
      locale: "ko_KR",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: siteMeta.name,
      description,
      images: siteMeta.site_icon_url ? [siteMeta.site_icon_url] : undefined
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
    formatDetection: {
      email: false,
      address: false,
      telephone: false
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteMeta = await getSiteMeta();
  const siteUrl = getSiteUrl(siteMeta.home);
  const logoUrl = new URL(siteMeta.site_icon_url || "/icon.png", siteUrl).toString();

  return (
    <html lang="ko">
      <body>
        <AdminPublicToolbar />
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": new URL("/#organization", siteUrl).toString(),
            name: siteMeta.name,
            url: siteUrl.toString(),
            logo: logoUrl
          }}
        />
        <div className="site-frame">
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="brand">
                <Image
                  src={siteMeta.site_icon_url || "/site-logo.png"}
                  alt=""
                  aria-hidden="true"
                  width={38}
                  height={35}
                  className="brand-logo-image"
                />
                <span>{siteMeta.name}</span>
              </Link>
              <nav className="site-nav">
                <Link href="/">자주 묻는 질문</Link>
                <Link href="/shop">상점</Link>
                <CartNavLink />
                <form action="/search" className="site-search-form">
                  <label className="sr-only" htmlFor="site-search-query">글 검색</label>
                  <input id="site-search-query" name="q" type="search" placeholder="글 검색" />
                  <button type="submit">검색</button>
                </form>
              </nav>
            </div>
          </header>
          <div className="site-main">{children}</div>
          <footer className="site-footer">
            <div className="site-footer-inner">
              <div className="footer-legal-block">
                <p>
                  상호명: 마케티드 | 대표: 안누리 | 사업자등록번호: 283-74-00474
                  <br />
                  주소: 전북특별자치도 전주시 완산구 문학대5길 6 202
                  <br />
                  <a href="https://open.kakao.com/me/npn1212/chat" target="_blank" rel="noreferrer">
                    고객센터 (카카오톡 문의)
                  </a>{" "}
                  | 통신판매업신고번호: 제2025-전주완산-0574호
                </p>
                <p className="footer-policy-links">
                  <Link href="/terms">이용약관</Link> | <Link href="/privacy">개인정보처리방침</Link>
                </p>
                <p className="footer-copy footer-copy-muted">Copyright © 2025 마케티드. All Rights Reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

````

</details>

<details><summary><code>app/globals.css</code> — 전체 2270줄</summary>

````css
:root {
  --bg: #f5efe3;
  --panel: rgba(255, 251, 244, 0.78);
  --ink: #1d1b19;
  --muted: #655e57;
  --line: rgba(29, 27, 25, 0.14);
  --accent: #8f2f1f;
}

@font-face {
  font-family: "NanumSquare";
  src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_two@1.0/NanumSquareRound.woff")
    format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "GmarketSansMedium";
  src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff")
    format("woff");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top, rgba(143, 47, 31, 0.12), transparent 36%),
    linear-gradient(180deg, #f6f0e4 0%, #efe4d2 100%);
  color: var(--ink);
  font-family: "NanumSquare", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}

body {
  min-height: 100vh;
}

.admin-public-toolbar {
  position: sticky;
  top: 0;
  z-index: 1200;
  width: 100%;
  color: #fffaf2;
  background: rgba(29, 27, 25, 0.97);
  box-shadow: 0 8px 24px rgba(29, 27, 25, 0.18);
  backdrop-filter: blur(12px);
}

.admin-public-toolbar-inner {
  width: min(1280px, calc(100vw - 24px));
  min-height: 44px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-public-toolbar-mode {
  flex: 0 0 auto;
  color: #ffd9cf;
  font-weight: 800;
}

.admin-public-toolbar-context {
  min-width: 0;
  overflow: hidden;
  color: rgba(255, 250, 242, 0.7);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-public-toolbar-nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-public-toolbar-nav a {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 7px;
  color: #fffaf2;
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}

.admin-public-toolbar-nav a:hover,
.admin-public-toolbar-nav a:focus-visible {
  background: rgba(255, 255, 255, 0.13);
}

.admin-public-toolbar-nav .admin-public-toolbar-primary {
  color: #fff;
  background: var(--accent);
}

.admin-public-toolbar-nav .admin-public-toolbar-primary:hover,
.admin-public-toolbar-nav .admin-public-toolbar-primary:focus-visible {
  background: #aa3b28;
}

@media (max-width: 720px) {
  .admin-public-toolbar-inner {
    min-height: 48px;
    overflow-x: auto;
  }

  .admin-public-toolbar-context {
    display: none;
  }

  .admin-public-toolbar-nav {
    margin-left: 0;
  }
}

.site-frame {
  width: min(1280px, calc(100vw - 24px));
  margin: 0 auto;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 0 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  text-decoration: none;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  font-family: "GmarketSansMedium", "NanumSquare", sans-serif;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border: 2px solid #d6b13a;
  border-radius: 6px 6px 12px 6px;
  transform: rotate(45deg);
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.site-nav a {
  color: var(--muted);
  text-decoration: none;
}

.site-nav a:hover,
.brand:hover,
.text-link:hover,
.stack-actions a:hover,
.inline-link:hover {
  opacity: 0.76;
}

.cart-link {
  color: var(--accent);
  text-decoration: none;
}

.shell {
  width: min(920px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 72px 0 96px;
}

.hero {
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-size: 0.8rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.8rem, 7vw, 5.8rem);
  line-height: 0.92;
  letter-spacing: -0.05em;
  font-family: "GmarketSansMedium", "NanumSquare", sans-serif;
}

.lede {
  max-width: 52rem;
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1.7;
}

.panel {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel);
  backdrop-filter: blur(12px);
}

.panel h2 {
  margin: 0 0 18px;
  font-size: 1.2rem;
}

.panel ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--muted);
  line-height: 1.9;
}

.note-panel p,
.panel p {
  color: var(--muted);
  line-height: 1.8;
}

.stats-grid,
.card-grid {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 44px;
}

.card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 48px;
}

.stat-card,
.content-card,
.stack-card,
.product-image-panel {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 251, 244, 0.72);
  backdrop-filter: blur(10px);
}

.stat-card {
  padding: 18px 20px;
}

.stat-card span {
  display: block;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
}

.stat-card strong {
  display: block;
  margin-top: 12px;
  font-size: clamp(1.6rem, 4vw, 2.6rem);
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin: 0 0 18px;
}

.section-head h1,
.section-head h2,
.panel h2 {
  margin: 0;
  font-family: "GmarketSansMedium", "NanumSquare", sans-serif;
}

.text-link {
  color: var(--accent);
  text-decoration: none;
}

.content-card,
.stack-card {
  padding: 22px;
}

.content-card h2,
.content-card h3,
.stack-card h2 {
  margin: 8px 0 10px;
  font-size: 1.35rem;
  line-height: 1.2;
  font-family: "GmarketSansMedium", "NanumSquare", sans-serif;
}

.content-card a,
.stack-card a {
  color: var(--ink);
  text-decoration: none;
}

.meta-line,
.summary,
.card-footer,
.stack-meta,
.article-meta,
.flag-row,
.signal-list,
.stack-actions {
  color: var(--muted);
}

.meta-line,
.stack-meta,
.article-meta,
.flag-row,
.signal-list,
.stack-actions,
.card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  font-size: 0.92rem;
}

.summary,
.stack-card p {
  line-height: 1.75;
}

.card-footer {
  margin-top: 16px;
}

.signal-list span,
.flag-row span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(143, 47, 31, 0.08);
}

.action-stack {
  margin-top: 18px;
}

.action-stack.compact {
  margin-top: 14px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.action-button,
.link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(143, 47, 31, 0.3);
  border-radius: 999px;
  background: var(--accent);
  color: #fff8f2;
  cursor: pointer;
  font: inherit;
  font-family: "NanumSquare", "Noto Sans KR", sans-serif;
  text-decoration: none;
}

.secondary-button {
  background: rgba(255, 251, 244, 0.66);
  color: var(--accent);
}

.inline-note {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.6;
}

.stack-grid {
  display: grid;
  gap: 16px;
}

.stack-actions {
  margin-top: 18px;
}

.stack-actions a {
  color: var(--accent);
}

.commerce-layout,
.checkout-grid {
  display: grid;
  gap: 24px;
  align-items: start;
}

.commerce-layout {
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.8fr);
}

.checkout-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
}

.checkout-sidebar,
.commerce-list,
.summary-list {
  display: grid;
  gap: 16px;
}

.commerce-card {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 251, 244, 0.72);
}

.cart-thumb img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 18px;
  object-fit: cover;
}

.account-shell {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.account-nav {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 251, 244, 0.72);
}

.account-nav-item {
  padding: 14px 16px;
  border-top: 1px solid rgba(29, 27, 25, 0.08);
  color: var(--muted);
}

.account-nav-item:first-child {
  border-top: 0;
}

.account-nav-item.current {
  background: #c8a22b;
  color: #fffef8;
  font-family: "GmarketSansMedium", "NanumSquare", sans-serif;
}

.account-panel {
  min-height: 220px;
}

.account-greeting {
  margin-top: 0;
}

.account-panel a {
  color: #b18817;
  text-decoration: none;
}

.blank-page-spacer {
  min-height: 52vh;
}

.commerce-card-body h2 {
  margin: 10px 0 12px;
}

.quantity-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-top: 18px;
  color: var(--muted);
}

.quantity-button {
  width: 34px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
  cursor: pointer;
  font: inherit;
}

.inline-link {
  margin-top: 12px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
}

.order-card {
  display: grid;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--muted);
  line-height: 1.65;
}

.summary-row-strong {
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--ink);
}

.field-grid,
.order-meta-grid {
  display: grid;
  gap: 14px;
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 0.94rem;
}

.field-wide {
  grid-column: 1 / -1;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--ink);
  font: inherit;
}

.field textarea {
  resize: vertical;
}

.warning-text {
  margin-top: 14px;
  color: var(--accent);
}

.payment-card p {
  margin: 0 0 10px;
}

.bank-card {
  display: grid;
  gap: 6px;
  margin: 16px 0;
  padding: 16px;
  border: 1px solid rgba(143, 47, 31, 0.18);
  border-radius: 18px;
  background: rgba(143, 47, 31, 0.08);
}

.bank-card strong {
  font-size: 1.15rem;
}

.bank-card-large {
  margin: 0;
}

.detail-list {
  margin: 10px 0 0;
  padding-left: 1.2rem;
  color: var(--muted);
  line-height: 1.8;
}

.order-meta-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 8px;
}

.order-meta-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
}

.order-meta-card span {
  display: block;
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.order-meta-card strong {
  display: block;
  margin-top: 8px;
  font-size: 1rem;
  word-break: break-all;
}

.success-panel {
  margin-bottom: 8px;
}

.article-shell,
.product-shell {
  margin-bottom: 36px;
}

.article-header {
  margin-bottom: 28px;
}

.article-header h1,
.product-summary h1,
.section-head h1 {
  margin: 8px 0 12px;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.rich-text {
  color: var(--ink);
  line-height: 1.85;
}

.rich-text > * {
  margin: 1.15em 0;
}

.rich-text > *:first-child {
  margin-top: 0;
}

.rich-text > *:last-child {
  margin-bottom: 0;
}

.rich-text p,
.rich-text li {
  color: #312d29;
}

.rich-text p,
.rich-text li,
.comment-body,
.comment-body p,
.review-body,
.plain-copy {
  white-space: pre-line;
}

.plain-copy {
  margin: 0;
  line-height: 1.9;
  color: #312d29;
}

.rich-text h2,
.rich-text h3,
.rich-text h4 {
  margin-top: 2.2rem;
}

.rich-text img {
  max-width: 100%;
  height: auto;
  border-radius: 18px;
}

.discussion-section {
  margin-top: 56px;
}

.thread {
  list-style: none;
  margin: 0;
  padding: 0;
}

.thread-item {
  margin-top: 16px;
  padding-left: 18px;
  border-left: 1px solid var(--line);
}

.comment-card,
.review-card {
  padding: 18px 18px 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.6);
}

.comment-meta,
.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 8px;
  color: var(--muted);
}

.comment-body,
.review-body {
  line-height: 1.75;
  margin: 0;
}

.review-list {
  display: grid;
  gap: 14px;
}

.review-rating {
  margin: 6px 0 12px;
  color: var(--accent);
}

.empty-state {
  color: var(--muted);
}

.product-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: start;
}

.product-image-panel {
  padding: 18px;
}

.product-image {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 18px;
  object-fit: cover;
}

.password-panel {
  padding: 28px;
}

.password-form {
  display: grid;
  gap: 18px;
}

.password-note {
  margin: 0;
  color: var(--muted);
  line-height: 1.75;
}

.password-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}

.password-field {
  min-width: min(100%, 320px);
}

.admin-shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.admin-sidebar,
.admin-content,
.admin-login-panel,
.admin-product-card,
.admin-list {
  display: grid;
  gap: 16px;
}

.admin-nav {
  display: grid;
  gap: 10px;
}

.admin-nav a {
  color: var(--accent-strong);
  text-decoration: none;
}

.admin-page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.admin-form-grid {
  display: grid;
  gap: 14px;
}

.admin-list-card {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
}

.admin-list-card a {
  color: var(--accent-strong);
  word-break: break-all;
}

.admin-product-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px;
}

.admin-product-browser,
.admin-product-editor-panel {
  display: grid;
  gap: 18px;
}

.admin-product-browser-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px;
  align-items: end;
}

.admin-bulk-toolbar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.admin-product-selector {
  display: grid;
  gap: 10px;
}

.admin-product-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.admin-product-checkbox {
  align-self: start;
  padding-top: 4px;
}

.admin-product-row-body {
  display: grid;
  gap: 10px;
}

.admin-product-row-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
}

.admin-product-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-inline-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-inline-flags span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(63, 107, 90, 0.08);
  color: var(--accent-strong);
  font-size: 0.82rem;
}

.admin-product-price {
  font-size: 1rem;
}

.admin-product-link {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  text-decoration: none;
}

.admin-product-link.is-active {
  border-color: rgba(63, 107, 90, 0.4);
  background: rgba(63, 107, 90, 0.08);
}

.admin-order-card,
.admin-order-meta {
  display: grid;
  gap: 1rem;
}

.admin-order-head {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.admin-order-head h2 {
  margin: 0.25rem 0 0;
}

.admin-order-meta {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.admin-order-meta div {
  border: 1px solid var(--line);
  border-radius: 18px;
  display: grid;
  gap: 0.35rem;
  padding: 0.85rem 1rem;
}

.admin-order-meta span {
  color: var(--muted);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.admin-editor-field {
  gap: 10px;
}

.admin-editor-field > span {
  font-weight: 700;
}

.editor-description {
  color: var(--muted);
  line-height: 1.6;
}

.admin-editor-shell {
  display: grid;
  gap: 10px;
}

.admin-editor-topbar,
.admin-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.admin-editor-topbar {
  justify-content: space-between;
}

.admin-editor-mode-tabs,
.admin-editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-tab,
.toolbar-button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}

.editor-tab.is-active {
  border-color: rgba(63, 107, 90, 0.35);
  background: rgba(63, 107, 90, 0.1);
  color: var(--accent-strong);
  font-weight: 700;
}

.admin-editor-surface,
.editor-html-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--ink);
  font: inherit;
}

.admin-editor-surface {
  overflow-y: auto;
  line-height: 1.8;
}

.admin-editor-surface:focus,
.editor-html-textarea:focus {
  outline: 2px solid rgba(63, 107, 90, 0.18);
  outline-offset: 0;
  border-color: rgba(63, 107, 90, 0.35);
}

.editor-html-textarea {
  min-height: 320px;
  resize: vertical;
}

.editor-status {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.editor-recovery-banner {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(194, 165, 39, 0.35);
  border-radius: 14px;
  background: rgba(194, 165, 39, 0.08);
}

.admin-post-fields-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.admin-publishing-box {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.5);
}

.admin-publishing-box > div:first-child,
.admin-publishing-box > .admin-post-surface-options,
.admin-publishing-box > .inline-note {
  grid-column: 1 / -1;
}

.admin-publishing-box h2,
.admin-publishing-box p {
  margin: 0;
}

.admin-post-surface-options,
.admin-publish-actions,
.admin-post-filter,
.content-search-form,
.site-search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.admin-publish-actions {
  padding-top: 8px;
}

.admin-post-filter {
  align-items: end;
}

.admin-post-filter .field {
  flex: 1 1 280px;
}

.admin-post-card > span,
.admin-post-card > div > div > span {
  color: var(--muted);
  font-size: 0.88rem;
}

.success-text {
  color: var(--accent-strong);
}

.site-search-form {
  flex-wrap: nowrap;
}

.site-search-form input,
.content-search-form input {
  min-width: 0;
  padding: 8px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--ink);
  font: inherit;
}

.site-search-form button {
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font: inherit;
}

.content-search-form input {
  flex: 1 1 320px;
  padding: 12px 16px;
}

.search-page-head {
  display: grid;
  gap: 14px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.action-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .site-header {
    align-items: start;
    flex-direction: column;
  }

  .admin-post-fields-grid,
  .admin-publishing-box {
    grid-template-columns: 1fr;
  }

  .site-search-form {
    width: 100%;
  }

  .site-search-form input {
    flex: 1;
  }

  .shell {
    padding-top: 48px;
  }

  .panel {
    padding: 22px;
  }

  .stats-grid,
  .card-grid,
  .product-shell,
  .commerce-layout,
  .checkout-grid,
  .field-grid,
  .order-meta-grid,
  .account-shell,
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .commerce-card {
    grid-template-columns: 1fr;
  }

  .admin-bulk-toolbar,
  .admin-product-row {
    grid-template-columns: 1fr;
  }

  .admin-product-checkbox {
    padding-top: 0;
  }
}

/* 2026-04-06 impeccable-inspired editorial refresh */

:root {
  --bg: #ffffff;
  --paper: #ffffff;
  --paper-soft: #f4f7f5;
  --ink: #161916;
  --muted: #68726b;
  --line: #e4ece6;
  --accent: #3f6b5a;
  --accent-strong: #2f5748;
  --shadow-soft: 0 28px 60px -42px rgba(22, 39, 29, 0.22);
}

html,
body {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfb 100%);
  color: var(--ink);
}

body {
  font-family: "NanumSquare", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6,
.brand,
.page-banner h1,
.editorial-title,
.article-header h1,
.product-buybox h1 {
  font-family: "GmarketSansMedium", "NanumSquare", sans-serif;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.site-frame {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-main {
  flex: 1;
}

.site-header {
  padding: 0;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 40;
}

.site-header-inner,
.site-footer-inner {
  width: min(1160px, calc(100vw - 40px));
  margin: 0 auto;
}

.site-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 76px;
}

.brand {
  gap: 10px;
  font-size: 1.05rem;
  color: var(--accent-strong);
}

.brand-mark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent);
  border-radius: 2px 12px 2px 12px;
  transform: rotate(45deg);
}

.brand-logo-image {
  width: 38px;
  height: auto;
  object-fit: contain;
}

.site-nav {
  gap: 18px;
  font-size: 0.95rem;
}

.site-nav a,
.cart-link {
  color: #4f5868;
}

.page-shell,
.shell {
  width: min(1160px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 42px 0 88px;
}

.page-banner {
  margin: 0 calc(50% - 50vw) 42px;
  padding: 44px 0;
  background: var(--paper-soft);
}

.page-banner-inner {
  width: min(1160px, calc(100vw - 40px));
  margin: 0 auto;
  text-align: center;
}

.page-banner h1 {
  margin: 4px 0 0;
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 1.04;
}

.page-banner-copy {
  max-width: 48rem;
  margin: 12px auto 0;
  color: var(--muted);
}

.editorial-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}

.editorial-sidebar {
  position: sticky;
  top: 108px;
}

.section-number {
  margin: 0 0 8px;
  color: var(--accent-strong);
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.editorial-title {
  margin: 0;
  font-size: clamp(2.4rem, 4vw, 3.6rem);
  line-height: 1.02;
}

.lede.compact {
  margin-top: 16px;
  font-size: 1rem;
  line-height: 1.8;
}

.stats-inline,
.feed-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  color: var(--muted);
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.stats-inline {
  margin: 22px 0 24px;
}

.sidebar-post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 18px;
}

.sidebar-post-item {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.sidebar-comment-copy {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 0.94rem;
  line-height: 1.8;
}

.sidebar-comment-copy strong {
  color: var(--ink);
}

.sidebar-comment-link {
  color: inherit;
  text-decoration: none;
}

.sidebar-comment-link:hover,
.sidebar-post-link:hover {
  color: var(--accent);
}

.sidebar-post-link {
  display: block;
  margin-bottom: 8px;
  color: var(--ink);
  text-decoration: none;
  font-size: 0.98rem;
  line-height: 1.6;
}

.sidebar-post-item span {
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}

.editorial-feed,
.archive-feed {
  display: grid;
  gap: 26px;
}

.feed-card {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 0;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-soft);
}

.feed-card.featured {
  grid-template-columns: minmax(260px, 0.95fr) minmax(0, 1.05fr);
}

.feed-card:not(:has(.feed-card-media)) {
  grid-template-columns: 1fr;
}

.feed-card-media {
  display: block;
  min-height: 100%;
  background: #edf3ef;
}

.feed-card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feed-card-body {
  padding: 26px 28px;
}

.feed-card h2 {
  margin: 12px 0 12px;
  font-size: clamp(1.35rem, 2vw, 2rem);
  line-height: 1.25;
}

.feed-card h2 a {
  color: var(--ink);
  text-decoration: none;
}

.feed-card p {
  margin: 0;
  color: #3d3934;
  line-height: 1.8;
}

.catalog-preview,
.catalog-extras {
  margin-top: 72px;
}

.section-head-tight {
  margin-bottom: 28px;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 34px 24px;
}

.catalog-grid-compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.catalog-card {
  text-align: center;
}

.catalog-card-strong {
  display: grid;
  align-content: start;
}

.catalog-art {
  display: block;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-soft);
}

.catalog-art img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.catalog-card h2,
.catalog-card h3 {
  margin: 10px 0 8px;
  font-size: 1.25rem;
}

.catalog-card h2 a,
.catalog-card h3 a {
  color: var(--ink);
  text-decoration: none;
}

.catalog-price,
.product-price-hero {
  margin: 0;
  color: var(--accent-strong);
  font-weight: 700;
}

.catalog-price-current {
  color: var(--accent-strong);
}

.catalog-price-strike {
  color: var(--muted);
  text-decoration: line-through;
  font-weight: 500;
}

.star-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 6px 0 0;
  color: var(--accent-strong);
  font-size: 0.92rem;
}

.catalog-card .action-stack {
  align-items: center;
}

.catalog-card .action-row {
  justify-content: center;
}

.product-page {
  padding-top: 40px;
}

.product-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(320px, 0.8fr);
  gap: 48px;
  align-items: start;
  margin-bottom: 36px;
}

.product-gallery-frame {
  padding: 16px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-soft);
}

.product-buybox {
  position: sticky;
  top: 108px;
}

.product-buybox h1 {
  margin: 6px 0 12px;
  font-size: clamp(2.3rem, 4vw, 3.8rem);
  line-height: 1.08;
}

.product-lede {
  margin: 18px 0;
  color: #3d3934;
  line-height: 1.9;
  white-space: pre-line;
}

.product-lede-html {
  margin: 18px 0;
}

.product-lede-html p {
  margin: 0 0 0.8em;
}

.product-price-hero {
  font-size: 1.7rem;
}

.product-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 34px;
}

.panel,
.wc-panel,
.commerce-card,
.comment-card,
.review-card,
.order-card,
.payment-card,
.success-panel,
.account-nav,
.account-panel,
.order-meta-card {
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-soft);
  backdrop-filter: none;
}

.panel,
.wc-panel,
.success-panel {
  padding: 28px;
}

.note-grid {
  margin-top: 18px;
}

.bank-inline {
  display: grid;
  gap: 4px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  color: var(--accent-strong);
}

.bank-inline strong {
  color: var(--ink);
}

.article-shell-polished {
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
  padding: 32px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-soft);
}

.article-header h1,
.section-head h1 {
  font-size: clamp(2.2rem, 4vw, 3.6rem);
  line-height: 1.1;
}

.article-cover {
  margin: 0 0 26px;
}

.article-cover img {
  width: 100%;
  height: auto;
  box-shadow: var(--shadow-soft);
}

.article-meta,
.meta-line,
.comment-meta,
.review-meta,
.stack-actions,
.flag-row,
.signal-list {
  color: var(--muted);
}

.discussion-section {
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
}

.comment-closure-note {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  color: var(--muted);
  line-height: 1.8;
}

.thread-item {
  padding-left: 0;
  border-left: 0;
}

.comment-card,
.review-card {
  padding: 20px 22px;
}

.commerce-layout,
.checkout-grid {
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
}

.commerce-card {
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
}

.cart-thumb {
  align-self: start;
}

.cart-thumb img {
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.summary-row,
.summary-row-strong {
  padding: 10px 0;
}

.summary-row-strong {
  margin-top: 12px;
}

.field input,
.field textarea,
.field select,
.order-meta-card {
  border-radius: 4px;
}

.field input,
.field textarea,
.field select {
  padding: 13px 14px;
}

.order-card,
.payment-card {
  padding: 24px;
}

.order-meta-grid {
  gap: 12px;
}

.action-button,
.link-button {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 4px;
  border-color: rgba(63, 107, 90, 0.35);
  background: var(--accent);
  color: #f7fbf8;
  font-weight: 700;
}

.secondary-button {
  background: transparent;
  color: var(--accent-strong);
}

.account-auth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}

.account-form {
  display: grid;
  gap: 16px;
}

.account-form-row {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 0.94rem;
}

.account-form-row input {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--ink);
  font: inherit;
}

.account-form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.account-form-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.94rem;
}

.account-inline-link {
  width: fit-content;
}

.account-form-copy {
  margin: 0;
  color: var(--muted);
  line-height: 1.75;
}

.account-panel a {
  color: var(--accent-strong);
}

.bank-card {
  border-color: rgba(63, 107, 90, 0.18);
  background: rgba(63, 107, 90, 0.06);
}

.order-received-note {
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.order-received-note h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.order-received-note p {
  margin: 0;
}

.account-shell {
  grid-template-columns: 220px minmax(0, 1fr);
}

.account-nav {
  overflow: hidden;
}

.account-nav-item.current {
  background: var(--accent);
  color: #f7fbf8;
}

.blank-page-spacer {
  min-height: 56vh;
}

.site-footer {
  border-top: 1px solid var(--line);
  color: var(--muted);
  background: rgba(255, 255, 255, 0.92);
}

.site-footer-inner {
  padding: 18px 0 24px;
  text-align: center;
  font-size: 0.82rem;
}

.home-archive-head {
  margin-bottom: 26px;
}

.home-archive-head h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1.08;
}

.pagination-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 34px;
}

.pagination-pages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-link {
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
  background: var(--paper);
}

.pagination-link.current {
  border-color: var(--accent);
  background: var(--accent);
  color: #f7fbf8;
}

.shop-list {
  display: grid;
  gap: 26px;
}

.shop-card {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 26px;
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-soft);
}

.shop-card-media {
  position: relative;
  display: block;
}

.shop-card-media img {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.shop-card-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.shop-card-body {
  display: grid;
  align-content: start;
  gap: 14px;
}

.shop-card-head h2 {
  margin: 10px 0 0;
  font-size: clamp(1.25rem, 2vw, 1.7rem);
  line-height: 1.4;
}

.shop-card-head h2 a {
  color: var(--ink);
  text-decoration: none;
}

.shop-card-status {
  margin-bottom: 2px;
}

.catalog-lede {
  margin: 0;
  color: #3d3934;
  line-height: 1.9;
  white-space: pre-line;
}

.status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 999px;
}

.status-badge.sale {
  background: rgba(63, 107, 90, 0.12);
  color: var(--accent-strong);
}

.status-badge.soldout {
  background: #24292e;
  color: #ffffff;
}

.status-badge.reserved {
  background: rgba(99, 125, 114, 0.12);
  color: #3d5148;
}

.product-buybox > .status-badges {
  margin-bottom: 14px;
}

.footer-copy {
  margin: 0;
}

.footer-copy-muted {
  color: #888;
  font-size: 12px;
}

.footer-legal-block {
  margin-top: 18px;
  color: #555;
  font-size: 14px;
  line-height: 1.6;
}

.footer-legal-block p {
  margin: 0 0 10px;
}

.footer-legal-block a {
  color: var(--accent);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: rgba(143, 47, 31, 0.45);
  text-underline-offset: 3px;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}

.footer-legal-block a:hover {
  color: #6f2014;
  text-decoration-color: currentColor;
}

.footer-legal-block a:focus-visible {
  border-radius: 2px;
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.footer-policy-links {
  font-size: 14px;
}

@media (max-width: 980px) {
  .editorial-grid,
  .product-hero,
  .product-meta-grid,
  .catalog-grid,
  .catalog-grid-compact,
  .commerce-layout,
  .checkout-grid,
  .account-shell,
  .account-auth-grid {
    grid-template-columns: 1fr;
  }

  .editorial-sidebar,
  .product-buybox {
    position: static;
  }

  .feed-card,
  .feed-card.featured {
    grid-template-columns: 1fr;
  }

  .shop-card {
    grid-template-columns: 1fr;
  }

  .site-header-inner {
    min-height: auto;
    padding: 18px 0;
    flex-direction: column;
    align-items: flex-start;
  }

  .site-nav {
    gap: 12px;
  }
}

@media (max-width: 640px) {
  .page-shell,
  .shell,
  .site-header-inner,
  .site-footer-inner,
  .page-banner-inner {
    width: min(1160px, calc(100vw - 24px));
  }

  .page-banner {
    padding: 30px 0;
  }

  .article-shell-polished,
  .panel,
  .wc-panel,
  .success-panel,
  .order-card,
  .payment-card,
  .comment-card,
  .review-card {
    padding: 20px;
  }

  .feed-card-body {
    padding: 20px;
  }

  .commerce-card,
  .shop-card {
    grid-template-columns: 1fr;
  }

  .pagination-nav {
    gap: 10px;
  }
}

````

</details>

## B. 공개 페이지 라우트

홈, 글/페이지, 상점, 상품, 검색, 장바구니, 결제의 실제 JSX와 SEO/접근 제약을 보여준다.

<details><summary><code>app/page.tsx</code> — 전체 25줄</summary>

````tsx
import { PaginationNav } from "@/components/pagination-nav";
import { PostArchiveFeed } from "@/components/post-archive-feed";
import { RichHtml } from "@/components/rich-html";
import { getPageByPath, getPosts } from "@/lib/site-data";

export const revalidate = 60;

const homePostsPerPage = 10;

export default async function HomePage() {
  const [posts, homePage] = await Promise.all([getPosts(), getPageByPath("/")]);
  const totalPages = Math.max(1, Math.ceil(posts.length / homePostsPerPage));

  return (
    <main className="page-shell">
      <section className="home-archive-head">
        <h1>{homePage?.title ?? "글 목록"}</h1>
        {homePage?.contentHtml ? <RichHtml className="rich-text" html={homePage.contentHtml} /> : null}
      </section>
      <PostArchiveFeed posts={posts.slice(0, homePostsPerPage)} />
      <PaginationNav currentPage={1} totalPages={totalPages} basePath="/" />
    </main>
  );
}

````

</details>

<details><summary><code>app/page/[page]/page.tsx</code> — 전체 67줄</summary>

````tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PaginationNav } from "@/components/pagination-nav";
import { PostArchiveFeed } from "@/components/post-archive-feed";
import { getPosts } from "@/lib/site-data";

export const revalidate = 60;

const homePostsPerPage = 10;

export async function generateStaticParams() {
  const posts = await getPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / homePostsPerPage));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `글 목록 ${page}페이지`,
    alternates: {
      canonical: `/page/${page}`
    }
  };
}

export default async function HomeArchivePage({
  params
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect("/");
  }

  const posts = await getPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / homePostsPerPage));
  if (pageNumber > totalPages) {
    notFound();
  }

  const start = (pageNumber - 1) * homePostsPerPage;
  const end = start + homePostsPerPage;

  return (
    <main className="page-shell">
      <section className="home-archive-head">
        <h1>글 목록</h1>
      </section>
      <PostArchiveFeed posts={posts.slice(start, end)} />
      <PaginationNav currentPage={pageNumber} totalPages={totalPages} basePath="/" />
    </main>
  );
}

````

</details>

<details><summary><code>app/[...slug]/page.tsx</code> — 전체 254줄</summary>

````tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { ProtectedPostGate } from "@/components/protected-post-gate";
import { RichHtml } from "@/components/rich-html";
import { StructuredData } from "@/components/structured-data";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPageByPath, getPostByPath, getPostComments, getProductAliasTarget, getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 60;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (path === "/my-account" || path.startsWith("/my-account/")) {
    return {
      title: path.endsWith("lost-password") ? "비밀번호 재설정" : "내 계정",
      robots: { index: false, follow: false, noarchive: true }
    };
  }
  const post = await getPostByPath(path);
  if (post) {
    const canIndex = post.visibility === "public" && post.allowIndexing;
    const isPasswordProtected = post.visibility === "password";
    return {
      title: isPasswordProtected ? `보호된 글: ${post.title}` : post.title,
      description: isPasswordProtected ? "비밀번호로 보호된 글입니다." : post.excerpt || post.title,
      alternates: {
        canonical: post.legacyPath
      },
      openGraph: {
        title: isPasswordProtected ? `보호된 글: ${post.title}` : post.title,
        description: isPasswordProtected ? "비밀번호로 보호된 글입니다." : post.excerpt || post.title,
        url: post.legacyPath,
        images: !isPasswordProtected && post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.updatedAt
      },
      robots: {
        index: canIndex,
        follow: canIndex,
        noarchive: !canIndex
      }
    };
  }

  const page = await getPageByPath(path);
  if (page) {
    const canIndex = page.visibility === "public" && page.allowIndexing;
    const isPasswordProtected = page.visibility === "password";
    return {
      title: isPasswordProtected ? `보호된 페이지: ${page.title}` : page.title,
      description: isPasswordProtected ? "비밀번호로 보호된 페이지입니다." : undefined,
      alternates: {
        canonical: page.legacyPath
      },
      openGraph: {
        title: isPasswordProtected ? `보호된 페이지: ${page.title}` : page.title,
        url: page.legacyPath,
        type: "article"
      },
      robots: {
        index: canIndex,
        follow: canIndex,
        noarchive: !canIndex
      }
    };
  }

  return {};
}

function AccountPage() {
  return (
    <section className="panel account-panel">
      <h2>내 계정</h2>
      <p className="account-form-copy">주문이나 예약을 원하시면 고객센터(아래)로 연락주세요.</p>
      <p className="account-form-copy">
        <a href="https://open.kakao.com/me/npn1212/chat" target="_blank" rel="noreferrer">
          고객센터 바로가기
        </a>
      </p>
    </section>
  );
}

function LostPasswordPage() {
  return (
    <section className="panel account-panel">
      <h2>비밀번호 재설정</h2>
      <p className="account-form-copy">웹 로그인 기능을 운영하지 않아 비밀번호 재설정도 제공하지 않습니다.</p>
      <Link className="action-button" href="/my-account">
        내 계정으로 돌아가기
      </Link>
    </section>
  );
}

export default async function CatchAllPage({
  params
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;

  if (path === "/my-account/lost-password") {
    return (
      <main className="shell">
        <article className="article-shell">
          <header className="article-header">
            <h1>비밀번호 재설정</h1>
          </header>
          <LostPasswordPage />
        </article>
      </main>
    );
  }

  const post = await getPostByPath(path);
  if (post) {
    const comments = await getPostComments(post.id);

    if (post.visibility === "password") {
      return (
        <main className="shell">
          <ProtectedPostGate post={{
            id: post.id,
            path,
            title: post.title,
            date: post.date,
            categoryNames: post.categoryNames
          }} />
        </main>
      );
    }

    const siteMeta = await getSiteMeta();
    const siteUrl = getSiteUrl(siteMeta.home);
    const postUrl = new URL(post.legacyPath, siteUrl).toString();

    const coverImageUrl =
      post.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;

    return (
      <main className="shell">
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${postUrl}#article`,
            headline: post.title,
            description: post.excerpt || post.title,
            datePublished: post.date,
            dateModified: post.updatedAt,
            mainEntityOfPage: postUrl,
            image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
            author: {
              "@type": "Organization",
              name: siteMeta.name,
              url: siteUrl.toString()
            },
            publisher: {
              "@type": "Organization",
              name: siteMeta.name,
              url: siteUrl.toString(),
              logo: siteMeta.site_icon_url
                ? { "@type": "ImageObject", url: new URL(siteMeta.site_icon_url, siteUrl).toString() }
                : undefined
            }
          }}
        />
        <article className="article-shell article-shell-polished">
          <header className="article-header">
            <p className="meta-line">{post.categoryNames.join(" · ") || "글"}</p>
            <h1>{post.title}</h1>
            <div className="article-meta">
              <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
              <span>댓글 {post.commentCount}</span>
            </div>
          </header>

          {coverImageUrl ? (
            <div className="article-cover">
              <Image src={coverImageUrl} alt={post.title} width={1200} height={720} />
            </div>
          ) : null}

          <RichHtml className="rich-text article-body" html={post.contentHtml} />
        </article>

        <section className="discussion-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Comments</p>
              <h2>댓글</h2>
            </div>
          </div>
          <CommentThread comments={comments} />
        </section>
      </main>
    );
  }

  const page = await getPageByPath(path);
  if (!page && slug.length === 1) {
    const productSlug = await getProductAliasTarget(slug[0]);
    if (productSlug) {
      permanentRedirect(`/product/${productSlug}`);
    }
  }
  if (!page) {
    notFound();
  }

  if (page.visibility === "password") {
    return (
      <main className="shell">
        <ProtectedPostGate post={{
          id: page.id,
          path,
          title: page.title,
          date: page.date,
          categoryNames: ["페이지"]
        }} />
      </main>
    );
  }

  return (
    <main className="shell">
      <article className="article-shell">
        <header className="article-header">
          <h1>{page.title}</h1>
          <div className="article-meta">
            <span>{new Date(page.date).toLocaleDateString("ko-KR")}</span>
          </div>
        </header>

        {page.slug === "my-account" ? <AccountPage /> : <RichHtml className="rich-text article-body" html={page.contentHtml} />}
      </article>
    </main>
  );
}

````

</details>

<details><summary><code>app/column/page.tsx</code> — 전체 22줄</summary>

````tsx
import { PostArchiveFeed } from "@/components/post-archive-feed";
import { getPosts } from "@/lib/site-data";

export const revalidate = 60;

export default async function ColumnIndexPage() {
  const posts = await getPosts();

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Archive</p>
          <h1>글 목록</h1>
        </div>
      </section>

      <PostArchiveFeed posts={posts} />
    </main>
  );
}

````

</details>

<details><summary><code>app/column/[slug]/page.tsx</code> — 전체 60줄</summary>

````tsx
import Image from "next/image";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { RichHtml } from "@/components/rich-html";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPostBySlug, getPostComments } from "@/lib/site-data";

export const revalidate = 60;

export default async function ColumnDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const comments = await getPostComments(post.id);
  const coverImageUrl =
    post.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;

  return (
    <main className="shell">
      <article className="article-shell article-shell-polished">
        <header className="article-header">
          <p className="meta-line">{post.categoryNames.join(" · ") || "글"}</p>
          <h1>{post.title}</h1>
          <div className="article-meta">
            <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
            <span>댓글 {post.commentCount}</span>
          </div>
        </header>

        {coverImageUrl ? (
          <div className="article-cover">
            <Image src={coverImageUrl} alt={post.title} width={1200} height={720} />
          </div>
        ) : null}

        <RichHtml className="rich-text article-body" html={post.contentHtml} />
      </article>

      <section className="discussion-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Comments</p>
            <h2>댓글</h2>
          </div>
        </div>
        <CommentThread comments={comments} />
      </section>
    </main>
  );
}

````

</details>

<details><summary><code>app/shop/page.tsx</code> — 전체 26줄</summary>

````tsx
import { PaginationNav } from "@/components/pagination-nav";
import { ShopCatalog } from "@/components/shop-catalog";
import { getProducts, getShopPageCount } from "@/lib/site-data";

export const revalidate = 60;

const shopPageSize = 16;

export default async function ShopPage() {
  const [products, totalPages] = await Promise.all([getProducts(), getShopPageCount(shopPageSize)]);

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Marketplace</p>
          <h1>상점</h1>
        </div>
      </section>

      <ShopCatalog products={products.slice(0, shopPageSize)} />
      <PaginationNav currentPage={1} totalPages={totalPages} basePath="/shop" />
    </main>
  );
}

````

</details>

<details><summary><code>app/shop/page/[page]/page.tsx</code> — 전체 69줄</summary>

````tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PaginationNav } from "@/components/pagination-nav";
import { ShopCatalog } from "@/components/shop-catalog";
import { getProducts, getShopPageCount } from "@/lib/site-data";

export const revalidate = 60;

const shopPageSize = 16;

export async function generateStaticParams() {
  const totalPages = await getShopPageCount(shopPageSize);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `상점 ${page}페이지`,
    alternates: {
      canonical: `/shop/page/${page}`
    }
  };
}

export default async function ShopPaginationPage({
  params
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect("/shop");
  }

  const [products, totalPages] = await Promise.all([getProducts(), getShopPageCount(shopPageSize)]);
  if (pageNumber > totalPages) {
    notFound();
  }

  const start = (pageNumber - 1) * shopPageSize;
  const end = start + shopPageSize;

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Marketplace</p>
          <h1>상점</h1>
        </div>
      </section>

      <ShopCatalog products={products.slice(start, end)} />
      <PaginationNav currentPage={pageNumber} totalPages={totalPages} basePath="/shop" />
    </main>
  );
}

````

</details>

<details><summary><code>app/product/[slug]/page.tsx</code> — 전체 160줄</summary>

````tsx
import Image from "next/image";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductPriceContent } from "@/components/product-price-content";
import { ProductStatusBadges } from "@/components/product-status-badges";
import { StructuredData } from "@/components/structured-data";
import { ProductPurchaseActions } from "@/components/storefront-client";
import { RichHtml } from "@/components/rich-html";
import { getProductBySlug, getProductCommonIntroHtml, getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 60;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug, { includeHidden: true });
  if (!product) {
    return {};
  }

  return {
    title: product.title,
    description: product.excerpt || product.title,
    alternates: {
      canonical: `/product/${product.slug}`
    },
    openGraph: {
      title: product.title,
      description: product.excerpt || product.title,
      url: `/product/${product.slug}`,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
      type: "article"
    },
    robots: {
      index: product.visibility === "public",
      follow: product.visibility === "public",
      noarchive: product.visibility !== "public"
    }
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, productCommonIntroHtml, siteMeta] = await Promise.all([
    getProductBySlug(slug, { includeHidden: true }),
    getProductCommonIntroHtml(),
    getSiteMeta()
  ]);

  if (!product) {
    notFound();
  }
  if (slug !== product.slug) {
    permanentRedirect(`/product/${encodeURIComponent(product.slug)}`);
  }
  const siteUrl = getSiteUrl(siteMeta.home);
  const productUrl = new URL(`/product/${encodeURIComponent(product.slug)}`, siteUrl).toString();
  const availability = {
    available: "https://schema.org/InStock",
    reserved: "https://schema.org/PreOrder",
    soldout: "https://schema.org/OutOfStock"
  }[product.stockState];
  const offer = product.priceValue !== null
    ? {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "KRW",
        price: product.priceValue,
        availability,
        itemCondition: "https://schema.org/NewCondition"
      }
    : undefined;

  const purchaseProduct = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    excerpt: product.excerpt,
    priceText: product.priceText,
    priceValue: product.priceValue,
    imageUrl: product.imageUrl,
    reviewCount: product.reviewCount,
    stockState: product.stockState
  };

  return (
    <main className="page-shell product-page">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${productUrl}#product`,
          name: product.title,
          description: product.excerpt || product.description || product.title,
          image: product.imageUrl ? [product.imageUrl] : undefined,
          sku: product.slug,
          brand: {
            "@type": "Brand",
            name: siteMeta.name
          },
          offers: offer
        }}
      />
      <article className="product-hero">
        {product.imageUrl ? (
          <div className="product-gallery">
            <div className="product-gallery-frame">
              <Image src={product.imageUrl} alt={product.title} className="product-image" width={960} height={1180} />
            </div>
          </div>
        ) : null}

        <div className="product-buybox">
          <p className="eyebrow">Product</p>
          <ProductStatusBadges
            stockState={product.stockState}
            regularPriceValue={product.regularPriceValue}
            salePriceValue={product.salePriceValue}
          />
          <h1>{product.title}</h1>
          {product.ratingValue ? (
            <div className="star-row">
              <span aria-hidden="true">★★★★★</span>
              <span>평점 {product.ratingValue}</span>
            </div>
          ) : null}
          <p className="product-price-hero">
            <ProductPriceContent
              priceText={product.priceText}
              priceValue={product.priceValue}
              regularPriceValue={product.regularPriceValue}
              salePriceValue={product.salePriceValue}
            />
          </p>
          <RichHtml className="rich-text product-lede-html" html={product.excerptHtml} />
          <div className="signal-list">
            {product.publicSignals.hasRefundText ? <span>환불정책</span> : null}
            {product.publicSignals.hasGmailDeliveryText ? <span>지메일 전달</span> : null}
          </div>
          <ProductPurchaseActions product={purchaseProduct} />
        </div>
      </article>

      <article className="article-shell article-shell-polished">
        {productCommonIntroHtml ? <RichHtml className="rich-text article-body" html={productCommonIntroHtml} /> : null}
        <RichHtml className="rich-text article-body" html={product.contentHtml} />
      </article>
    </main>
  );
}

````

</details>

<details><summary><code>app/search/page.tsx</code> — 전체 39줄</summary>

````tsx
import type { Metadata } from "next";

import { PostArchiveFeed } from "@/components/post-archive-feed";
import { searchPosts } from "@/lib/site-data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "글 검색",
  robots: {
    index: false,
    follow: false
  }
};

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const posts = query ? await searchPosts(query) : [];

  return (
    <main className="page-shell">
      <section className="home-archive-head search-page-head">
        <h1>글 검색</h1>
        <form action="/search" className="content-search-form">
          <label className="sr-only" htmlFor="content-search-query">검색어</label>
          <input id="content-search-query" name="q" type="search" defaultValue={query} placeholder="제목과 본문 검색" autoFocus />
          <button type="submit" className="action-button">검색</button>
        </form>
        {query ? <p className="inline-note">“{query}” 검색 결과 {posts.length}건</p> : <p className="inline-note">검색어를 입력해 주세요.</p>}
      </section>
      {posts.length > 0 ? <PostArchiveFeed posts={posts} /> : query ? <p className="empty-state">일치하는 글이 없습니다.</p> : null}
    </main>
  );
}

````

</details>

<details><summary><code>app/privacy/page.tsx</code> — 전체 6줄</summary>

````tsx
import { redirect } from "next/navigation";

export default function PrivacyAliasPage() {
  redirect("/privacy-policy");
}

````

</details>

<details><summary><code>app/cart/layout.tsx</code> — 전체 11줄</summary>

````tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장바구니",
  robots: { index: false, follow: false, noarchive: true }
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

````

</details>

<details><summary><code>app/cart/page.tsx</code> — 전체 32줄</summary>

````tsx
import { CartPageClient } from "@/components/storefront-client";
import { getProducts } from "@/lib/site-data";

export const revalidate = 60;

export default async function CartPage() {
  const products = await getProducts({ includeHidden: true });
  const catalog = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    excerpt: product.excerpt,
    priceText: product.priceText,
    priceValue: product.priceValue,
    imageUrl: product.imageUrl,
    reviewCount: product.reviewCount,
    stockState: product.stockState
  }));

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Cart</p>
          <h1>장바구니</h1>
        </div>
      </section>
      <CartPageClient catalog={catalog} />
    </main>
  );
}

````

</details>

<details><summary><code>app/checkout/layout.tsx</code> — 전체 11줄</summary>

````tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "주문",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true }
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

````

</details>

<details><summary><code>app/checkout/page.tsx</code> — 전체 32줄</summary>

````tsx
import { CheckoutPageClient } from "@/components/storefront-client";
import { getProducts } from "@/lib/site-data";

export const revalidate = 60;

export default async function CheckoutPage() {
  const products = await getProducts({ includeHidden: true });
  const catalog = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    excerpt: product.excerpt,
    priceText: product.priceText,
    priceValue: product.priceValue,
    imageUrl: product.imageUrl,
    reviewCount: product.reviewCount,
    stockState: product.stockState
  }));

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Checkout</p>
          <h1>결제</h1>
        </div>
      </section>
      <CheckoutPageClient catalog={catalog} />
    </main>
  );
}

````

</details>

<details><summary><code>app/checkout/order-received/[orderId]/page.tsx</code> — 전체 25줄</summary>

````tsx
import { OrderReceivedClient } from "@/components/storefront-client";
import { getAdminOrderById } from "@/lib/admin-store";
import type { StoredOrder } from "@/lib/purchase-flow";

export const dynamic = "force-dynamic";

export default async function OrderReceivedPage({
  params,
  searchParams
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { orderId } = await params;
  const { key } = await searchParams;
  const order = await getAdminOrderById(orderId);
  const initialOrder: StoredOrder | null = order && key && order.key === key ? order : null;

  return (
    <main className="shell">
      <OrderReceivedClient orderId={orderId} orderKey={key ?? null} initialOrder={initialOrder} />
    </main>
  );
}

````

</details>

## C. 공개 UI 컴포넌트

카드, 목록, 가격, 후기, 보호 글, 장바구니·결제 클라이언트 UI와 새 관리자 툴바를 포함한다.

<details><summary><code>components/admin-public-toolbar.tsx</code> — 전체 81줄</summary>

````tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AdminToolbarContext = {
  editHref: string | null;
  editLabel: string | null;
  contentLabel: string | null;
  listHref: string;
  listLabel: string;
};

function isAdminRoute(pathname: string) {
  return pathname === "/loginpage" || pathname.startsWith("/loginpage/") || pathname.startsWith("/admin");
}

export function AdminPublicToolbar() {
  const pathname = usePathname();
  const [context, setContext] = useState<AdminToolbarContext | null>(null);
  const hidden = isAdminRoute(pathname);

  useEffect(() => {
    if (hidden) {
      setContext(null);
      return;
    }

    const controller = new AbortController();
    setContext(null);

    fetch(`/api/admin/context?path=${encodeURIComponent(pathname)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal
    })
      .then(async (response) => {
        if (response.status === 204) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`Admin context request failed: ${response.status}`);
        }
        return (await response.json()) as AdminToolbarContext;
      })
      .then((payload) => setContext(payload))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setContext(null);
      });

    return () => controller.abort();
  }, [hidden, pathname]);

  if (hidden || !context) {
    return null;
  }

  return (
    <aside className="admin-public-toolbar" aria-label="공개 페이지 관리자 도구">
      <div className="admin-public-toolbar-inner">
        <span className="admin-public-toolbar-mode">관리자 모드</span>
        {context.contentLabel ? <span className="admin-public-toolbar-context">{context.contentLabel}</span> : null}
        <nav className="admin-public-toolbar-nav">
          {context.editHref && context.editLabel ? (
            <Link href={context.editHref} className="admin-public-toolbar-primary">
              {context.editLabel}
            </Link>
          ) : null}
          <Link href="/loginpage/dashboard">대시보드</Link>
          <Link href={context.listHref}>{context.listLabel}</Link>
          <Link href="/loginpage/posts/new">새 글</Link>
        </nav>
      </div>
    </aside>
  );
}

````

</details>

<details><summary><code>components/comment-thread.tsx</code> — 전체 30줄</summary>

````tsx
import { CommentNode } from "@/lib/site-data";
import { RichHtml } from "@/components/rich-html";

type CommentThreadProps = {
  comments: CommentNode[];
};

export function CommentThread({ comments }: CommentThreadProps) {
  if (!comments.length) {
    return <p className="empty-state">댓글이 없습니다.</p>;
  }

  return (
    <ol className="thread">
      {comments.map((comment) => (
        <li key={comment.id} className="thread-item" id={`comment-${comment.id}`}>
          <article className="comment-card">
            <div className="comment-meta">
              <strong>{comment.authorName}</strong>
              <span>{new Date(comment.date).toLocaleDateString("ko-KR")}</span>
            </div>
            <RichHtml className="rich-text comment-body" html={comment.contentHtml} />
          </article>
          {comment.children.length > 0 ? <CommentThread comments={comment.children} /> : null}
        </li>
      ))}
    </ol>
  );
}

````

</details>

<details><summary><code>components/linkified-text.tsx</code> — 전체 55줄</summary>

````tsx
import type { ReactNode } from "react";

import { normalizePlainText } from "@/lib/text-format";

type LinkifiedTextProps = {
  className?: string;
  text: string | null | undefined;
};

const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function renderLine(line: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(urlPattern)) {
    const url = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(line.slice(lastIndex, start));
    }

    const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    parts.push(
      <a key={`${keyPrefix}-${start}`} href={href} target="_blank" rel="noreferrer">
        {url}
      </a>
    );
    lastIndex = start + url.length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

export function LinkifiedText({ className, text }: LinkifiedTextProps) {
  const normalized = normalizePlainText(text);
  const lines = normalized.split("\n");

  return (
    <p className={className}>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {renderLine(line, `${index}`)}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}

````

</details>

<details><summary><code>components/pagination-nav.tsx</code> — 전체 53줄</summary>

````tsx
import Link from "next/link";

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

function hrefFor(basePath: string, page: number) {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath.replace(/\/+$/, "")}/page/${page}`;
}

export function PaginationNav({ currentPage, totalPages, basePath }: PaginationNavProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="pagination-nav" aria-label="페이지 이동">
      {currentPage > 1 ? (
        <Link href={hrefFor(basePath, currentPage - 1)} className="pagination-link">
          이전
        </Link>
      ) : null}

      <div className="pagination-pages">
        {pages.map((page) => (
          <Link
            key={page}
            href={hrefFor(basePath, page)}
            className={`pagination-link${page === currentPage ? " current" : ""}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Link>
        ))}
      </div>

      {currentPage < totalPages ? (
        <Link href={hrefFor(basePath, currentPage + 1)} className="pagination-link">
          다음
        </Link>
      ) : null}
    </nav>
  );
}

````

</details>

<details><summary><code>components/post-archive-feed.tsx</code> — 전체 40줄</summary>

````tsx
import Image from "next/image";
import Link from "next/link";

import type { PostEntry } from "@/lib/site-data";

type PostArchiveFeedProps = {
  posts: PostEntry[];
};

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}…` : value;
}

export function PostArchiveFeed({ posts }: PostArchiveFeedProps) {
  return (
    <section className="archive-feed">
      {posts.map((post) => (
        <article key={post.id} className="feed-card archive-card">
          {post.coverImageUrl ? (
            <Link href={post.legacyPath} className="feed-card-media">
              <Image src={post.coverImageUrl} alt={post.title} width={720} height={420} />
            </Link>
          ) : null}
          <div className="feed-card-body">
            <div className="feed-card-meta">
              <span>{post.categoryNames.join(" · ") || "글"}</span>
              <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
              <span>댓글 {post.commentCount}</span>
            </div>
            <h2>
              <Link href={post.legacyPath}>{post.title}</Link>
            </h2>
            <p>{clampText(post.excerpt, 180)}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

````

</details>

<details><summary><code>components/product-price-content.tsx</code> — 전체 32줄</summary>

````tsx
import { formatWon } from "@/lib/purchase-flow";
import { hasSalePrice } from "@/lib/product-pricing";

type ProductPriceContentProps = {
  priceText: string | null;
  priceValue: number | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
};

export function ProductPriceContent({
  priceText,
  priceValue,
  regularPriceValue,
  salePriceValue
}: ProductPriceContentProps) {
  if (hasSalePrice(regularPriceValue, salePriceValue)) {
    return (
      <>
        <span className="catalog-price-current">{formatWon(salePriceValue as number)}</span>{" "}
        <span className="catalog-price-strike">{formatWon(regularPriceValue as number)}</span>
      </>
    );
  }

  if (priceValue !== null) {
    return <span className="catalog-price-current">{formatWon(priceValue)}</span>;
  }

  return <>{priceText ?? "가격 확인 필요"}</>;
}

````

</details>

<details><summary><code>components/product-status-badges.tsx</code> — 전체 24줄</summary>

````tsx
import { hasSalePrice } from "@/lib/product-pricing";

type ProductStatusBadgesProps = {
  stockState: "available" | "reserved" | "soldout";
  regularPriceValue: number | null;
  salePriceValue: number | null;
};

export function ProductStatusBadges({
  stockState,
  regularPriceValue,
  salePriceValue
}: ProductStatusBadgesProps) {
  const hasSale = hasSalePrice(regularPriceValue, salePriceValue);

  return (
    <div className="status-badges" aria-label="상품 상태">
      {stockState === "soldout" ? <span className="status-badge soldout">SOLD OUT</span> : null}
      {stockState === "reserved" ? <span className="status-badge reserved">RESERVED</span> : null}
      {hasSale ? <span className="status-badge sale">SALE</span> : null}
    </div>
  );
}

````

</details>

<details><summary><code>components/protected-post-gate.tsx</code> — 전체 90줄</summary>

````tsx
"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { RichHtml } from "@/components/rich-html";

type ProtectedPostSummary = {
  id: number;
  path: string;
  title: string;
  date: string;
  categoryNames: string[];
};

type UnlockedContent = {
  title: string;
  contentHtml: string;
  coverImageUrl: string | null;
};

export function ProtectedPostGate({ post }: { post: ProtectedPostSummary }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState<UnlockedContent | null>(null);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsChecking(true);
    setError("");
    try {
      const response = await fetch("/api/posts/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: post.path, password })
      });
      const payload = (await response.json()) as UnlockedContent & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "비밀번호가 올바르지 않습니다.");
      }
      setUnlocked(payload);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "잠금 해제에 실패했습니다.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <article className="article-shell article-shell-polished">
      <header className="article-header">
        <p className="meta-line">{post.categoryNames.join(" · ") || "글"}</p>
        <h1>{unlocked?.title ?? `보호된 글: ${post.title}`}</h1>
        <div className="article-meta">
          <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
        </div>
      </header>

      {unlocked ? (
        <>
          {unlocked.coverImageUrl ? (
            <div className="article-cover">
              <Image src={unlocked.coverImageUrl} alt={unlocked.title} width={1200} height={720} />
            </div>
          ) : null}
          <RichHtml className="rich-text article-body" html={unlocked.contentHtml} />
        </>
      ) : (
        <div className="panel password-panel">
          <form className="password-form" onSubmit={handleSubmit}>
            <p className="password-note">이 콘텐츠는 비밀번호로 보호되어 있습니다. 비밀번호를 입력해 주세요.</p>
            <div className="password-row">
              <label className="field password-field">
                <span>비밀번호</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} spellCheck={false} required />
              </label>
              <button type="submit" className="action-button" disabled={isChecking}>
                {isChecking ? "확인 중…" : "확인"}
              </button>
            </div>
            {error ? <p className="warning-text">{error}</p> : null}
          </form>
        </div>
      )}
    </article>
  );
}

````

</details>

<details><summary><code>components/review-list.tsx</code> — 전체 28줄</summary>

````tsx
import { LinkifiedText } from "@/components/linkified-text";
import { ProductReview } from "@/lib/site-data";

type ReviewListProps = {
  reviews: ProductReview[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews.length) {
    return <p className="empty-state">공개 페이지 기준으로 수집된 상품평이 아직 없습니다.</p>;
  }

  return (
    <div className="review-list">
      {reviews.map((review, index) => (
        <article key={`${review.author}-${review.date}-${index}`} className="review-card">
          <div className="review-meta">
            <strong>{review.author}</strong>
            <span>{review.date ? new Date(review.date).toLocaleDateString("ko-KR") : "날짜 미상"}</span>
          </div>
          {review.rating ? <p className="review-rating">평점 {review.rating}</p> : null}
          <LinkifiedText className="review-body" text={review.body} />
        </article>
      ))}
    </div>
  );
}

````

</details>

<details><summary><code>components/rich-html.tsx</code> — 전체 9줄</summary>

````tsx
type RichHtmlProps = {
  className?: string;
  html: string;
};

export function RichHtml({ className, html }: RichHtmlProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

````

</details>

<details><summary><code>components/shop-catalog.tsx</code> — 전체 72줄</summary>

````tsx
import Image from "next/image";
import Link from "next/link";

import { ProductPriceContent } from "@/components/product-price-content";
import { ProductPurchaseActions } from "@/components/storefront-client";
import { ProductStatusBadges } from "@/components/product-status-badges";
import type { ProductEntry } from "@/lib/site-data";

type ShopCatalogProps = {
  products: ProductEntry[];
};

export function ShopCatalog({ products }: ShopCatalogProps) {
  return (
    <section className="shop-list">
      {products.map((product) => (
        <article key={product.id} className="shop-card">
          {product.imageUrl ? (
            <Link href={`/product/${product.slug}`} className="shop-card-media">
              <span className="shop-card-badges">
                <ProductStatusBadges
                  stockState={product.stockState}
                  regularPriceValue={product.regularPriceValue}
                  salePriceValue={product.salePriceValue}
                />
              </span>
              <Image src={product.imageUrl} alt={product.title} width={420} height={520} />
            </Link>
          ) : null}

          <div className="shop-card-body">
            <div className="shop-card-head">
              <div className="shop-card-status">
                <ProductStatusBadges
                  stockState={product.stockState}
                  regularPriceValue={product.regularPriceValue}
                  salePriceValue={product.salePriceValue}
                />
              </div>
              <h2>
                <Link href={`/product/${product.slug}`}>{product.title}</Link>
              </h2>
            </div>
            <p className="catalog-price">
              <ProductPriceContent
                priceText={product.priceText}
                priceValue={product.priceValue}
                regularPriceValue={product.regularPriceValue}
                salePriceValue={product.salePriceValue}
              />
            </p>
            <ProductPurchaseActions
              compact
              product={{
                id: product.id,
                slug: product.slug,
                title: product.title,
                excerpt: product.excerpt,
                priceText: product.priceText,
                priceValue: product.priceValue,
                imageUrl: product.imageUrl,
                reviewCount: product.reviewCount,
                stockState: product.stockState
              }}
            />
          </div>
        </article>
      ))}
    </section>
  );
}

````

</details>

<details><summary><code>components/storefront-client.tsx</code> — 전체 616줄</summary>

````tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type FormEvent } from "react";

import {
  bankTransferAccount,
  checkoutBoxNotes,
  checkoutFieldLabels,
  formatWon,
  type PurchaseProduct,
  type StoredCartItem,
  type StoredOrder
} from "@/lib/purchase-flow";

const CART_STORAGE_KEY = "aloha-clone/cart";
const ORDER_STORAGE_PREFIX = "aloha-clone/order/";
const CART_EVENT = "aloha-clone:cart-updated";
const NORMALIZED_CART_STORAGE_KEY = "aloha-clone/cart";

type ResolvedCartItem = {
  product: PurchaseProduct;
  quantity: number;
  lineTotal: number;
};

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}…` : value;
}

function sanitizeCartItems(items: StoredCartItem[]) {
  return items
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(0, Math.floor(item.quantity))
    }))
    .filter((item) => item.quantity > 0);
}

function readCart() {
  if (typeof window === "undefined") {
    return [] as StoredCartItem[];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const nextRaw = raw ?? window.localStorage.getItem(NORMALIZED_CART_STORAGE_KEY);
    if (!nextRaw) {
      return [] as StoredCartItem[];
    }

    const parsed = JSON.parse(nextRaw) as StoredCartItem[];
    return sanitizeCartItems(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [] as StoredCartItem[];
  }
}

function writeCart(items: StoredCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NORMALIZED_CART_STORAGE_KEY, JSON.stringify(sanitizeCartItems(items)));
  window.dispatchEvent(new Event(CART_EVENT));
}

function updateStoredCart(recipe: (items: StoredCartItem[]) => StoredCartItem[]) {
  writeCart(recipe(readCart()));
}

function writeOrder(order: StoredOrder) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${ORDER_STORAGE_PREFIX}${order.id}`, JSON.stringify(order));
}

function readOrder(orderId: string) {
  if (typeof window === "undefined") {
    return null as StoredOrder | null;
  }

  try {
    const raw = window.localStorage.getItem(`${ORDER_STORAGE_PREFIX}${orderId}`);
    return raw ? (JSON.parse(raw) as StoredOrder) : null;
  } catch {
    return null as StoredOrder | null;
  }
}

function resolveCartItems(catalog: PurchaseProduct[], items: StoredCartItem[]) {
  const catalogMap = new Map(catalog.map((product) => [product.id, product]));

  return sanitizeCartItems(items)
    .map((item) => {
      const product = catalogMap.get(item.productId);
      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        lineTotal: (product.priceValue ?? 0) * item.quantity
      };
    })
    .filter((item): item is ResolvedCartItem => item !== null);
}

function lineTotalLabel(item: ResolvedCartItem) {
  if (item.product.priceValue === null) {
    return item.product.priceText ?? "";
  }

  return formatWon(item.lineTotal);
}

function useCartState(catalog: PurchaseProduct[]) {
  const [cartItems, setCartItems] = useState<ResolvedCartItem[]>([]);

  useEffect(() => {
    const syncCart = () => {
      startTransition(() => {
        setCartItems(resolveCartItems(catalog, readCart()));
      });
    };

    const handleSync = () => {
      syncCart();
    };

    syncCart();
    window.addEventListener("storage", handleSync);
    window.addEventListener(CART_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(CART_EVENT, handleSync);
    };
  }, [catalog]);

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    cartItems,
    totalCount,
    totalValue,
    totalText: totalValue > 0 ? formatWon(totalValue) : "",
    addItem(product: PurchaseProduct) {
      updateStoredCart((current) => {
        const existing = current.find((item) => item.productId === product.id);
        if (existing) {
          return current.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }

        return [...current, { productId: product.id, quantity: 1 }];
      });
    },
    updateQuantity(productId: number, quantity: number) {
      updateStoredCart((current) =>
        current
          .map((item) => (item.productId === productId ? { ...item, quantity } : item))
          .filter((item) => item.quantity > 0)
      );
    },
    removeItem(productId: number) {
      updateStoredCart((current) => current.filter((item) => item.productId !== productId));
    },
    clearCart() {
      writeCart([]);
    }
  };
}

export function CartNavLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const syncCount = () => {
      startTransition(() => {
        setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
      });
    };

    const handleSync = () => {
      syncCount();
    };

    syncCount();
    window.addEventListener("storage", handleSync);
    window.addEventListener(CART_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(CART_EVENT, handleSync);
    };
  }, []);

  return (
    <Link href="/cart" className="cart-link">
      장바구니{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}

export function ProductPurchaseActions({
  product,
  compact = false
}: {
  product: PurchaseProduct;
  compact?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const soldOut = product.stockState === "soldout" || product.stockState === "reserved";

  const addItem = () => {
    if (soldOut) {
      return;
    }
    updateStoredCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { productId: product.id, quantity: 1 }];
    });
    setMessage("장바구니에 담았습니다.");
  };

  const goCheckout = () => {
    if (soldOut) {
      return;
    }
    addItem();
    router.push("/checkout");
  };

  return (
    <div className={`action-stack${compact ? " compact" : ""}`}>
      <div className="action-row">
        <button type="button" className="action-button" onClick={addItem} disabled={soldOut}>
          {soldOut ? (product.stockState === "reserved" ? "예약중" : "판매완료") : "장바구니 담기"}
        </button>
        <button type="button" className="action-button secondary-button" onClick={goCheckout} disabled={soldOut}>
          바로 결제
        </button>
      </div>
      {message ? <p className="inline-note">{message}</p> : null}
    </div>
  );
}

export function CartPageClient({ catalog }: { catalog: PurchaseProduct[] }) {
  const { cartItems, totalCount, totalText, updateQuantity, removeItem } = useCartState(catalog);

  if (!cartItems.length) {
    return (
      <section className="panel">
        <h2>장바구니가 비어 있습니다</h2>
        <p>구매 가능한 상품을 먼저 선택해 주세요.</p>
        <Link href="/shop" className="text-link">
          상점으로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="commerce-layout">
      <section className="commerce-list">
        {cartItems.map((item) => (
          <article key={item.product.id} className="commerce-card">
            {item.product.imageUrl ? (
              <div className="cart-thumb">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.title}
                  width={240}
                  height={240}
                  loading="eager"
                />
              </div>
            ) : null}
            <div className="commerce-card-body">
              <div className="flag-row">
                <span>{item.product.priceText ?? "가격 확인 필요"}</span>
              </div>
              <h2>
                <Link href={`/product/${encodeURIComponent(item.product.slug)}`}>{item.product.title}</Link>
              </h2>
              <p className="summary">{clampText(item.product.excerpt, 140)}</p>
              <div className="quantity-row">
                <button type="button" className="quantity-button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                  -
                </button>
                <strong>{item.quantity}</strong>
                <button type="button" className="quantity-button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                  +
                </button>
                <span>{lineTotalLabel(item)}</span>
              </div>
              <button type="button" className="inline-link" onClick={() => removeItem(item.product.id)}>
                항목 제거
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="panel order-card">
        <p className="eyebrow">Cart</p>
        <h2>장바구니 합계</h2>
        <div className="summary-row">
          <span>상품 수량</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="summary-row summary-row-strong">
          <span>총계</span>
          <strong>{totalText}</strong>
        </div>
        <Link href="/checkout" className="action-button link-button">
          결제 진행하기
        </Link>
      </aside>
    </div>
  );
}

export function CheckoutPageClient({ catalog }: { catalog: PurchaseProduct[] }) {
  const router = useRouter();
  const { cartItems, totalText, totalValue, clearCart } = useCartState(catalog);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cartItems.length) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          memo,
          items: cartItems.map((item) => ({
            ...item.product,
            quantity: item.quantity,
            lineTotal: item.lineTotal
          })),
          totalValue,
          totalText
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; order?: StoredOrder } | null;
      if (!response.ok || !payload?.order) {
        throw new Error(payload?.error ?? "주문을 저장하지 못했습니다.");
      }

      writeOrder(payload.order);
      clearCart();
      router.push(`/checkout/order-received/${payload.order.id}?key=${encodeURIComponent(payload.order.key)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "주문 처리 중 문제가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (!cartItems.length) {
    return (
      <section className="panel">
        <h2>결제할 상품이 없습니다</h2>
        <p>장바구니에서 상품을 담아 주세요.</p>
        <Link href="/shop" className="text-link">
          상점으로 이동
        </Link>
      </section>
    );
  }

  return (
    <form className="checkout-grid" onSubmit={submitOrder}>
      <section className="panel">
        <p className="eyebrow">Billing</p>
        <h2>주문자 정보</h2>
        <div className="field-grid">
          <label className="field">
            <span>{checkoutFieldLabels[0]}</span>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
          </label>
          <label className="field">
            <span>{checkoutFieldLabels[1]}</span>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>{checkoutFieldLabels[2]}</span>
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>{checkoutFieldLabels[3]}</span>
            <textarea
              rows={4}
              placeholder="주문 관련 메시지, 예) 전달 관련 메모."
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>
        </div>
      </section>

      <aside className="checkout-sidebar">
        <section className="panel order-card">
          <p className="eyebrow">Review</p>
          <h2>고객님의 주문</h2>
          <div className="summary-list">
            {cartItems.map((item) => (
              <div key={item.product.id} className="summary-row">
                <span>
                  {item.product.title} x {item.quantity}
                </span>
                <strong>{lineTotalLabel(item)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-row summary-row-strong">
            <span>총계</span>
            <strong>{totalText}</strong>
          </div>
        </section>

        <section className="panel payment-card">
          <p className="eyebrow">BACS</p>
          <h2>무통장입금</h2>
          {checkoutBoxNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <div className="bank-card">
            <strong>{bankTransferAccount.bankName}</strong>
            <span>{bankTransferAccount.accountHolder}</span>
            <span>{bankTransferAccount.accountNumber}</span>
          </div>
          <button type="submit" className="action-button" disabled={submitting}>
            주문 확정
          </button>
          {submitError ? <p className="warning-text">{submitError}</p> : null}
        </section>
      </aside>
    </form>
  );
}

function readMatchingOrder(orderId: string, orderKey: string | null) {
  const order = readOrder(orderId);
  if (!order) {
    return null as StoredOrder | null;
  }

  if (!orderKey || order.key !== orderKey) {
    return null as StoredOrder | null;
  }

  return order;
}

export function OrderReceivedClient({
  orderId,
  orderKey = null,
  initialOrder = null
}: {
  orderId: string;
  orderKey?: string | null;
  initialOrder?: StoredOrder | null;
}) {
  const [order, setOrder] = useState<StoredOrder | null>(initialOrder);

  useEffect(() => {
    const syncOrder = () => {
      startTransition(() => {
        setOrder((current) => current ?? readMatchingOrder(orderId, orderKey));
      });
    };

    syncOrder();
  }, [orderId, orderKey]);
  const createdAtText = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : null;
  const lineItems = order?.items ?? [];

  return (
    <div className="stack-grid">
      <section className="panel success-panel">
        <p className="eyebrow">Order Received</p>
        <h1>주문이 접수되었습니다</h1>
        <p>입금 확인 후 순차적으로 안내가 진행됩니다.</p>
      </section>

      <section className="commerce-layout">
        <article className="panel order-card">
          <h2>주문 상세</h2>
          <div className="order-meta-grid">
            <div className="order-meta-card">
              <span>주문번호</span>
              <strong>{order?.id ?? orderId}</strong>
            </div>
            {createdAtText ? (
              <div className="order-meta-card">
                <span>날짜</span>
                <strong>{createdAtText}</strong>
              </div>
            ) : null}
            {order?.email ? (
              <div className="order-meta-card">
                <span>이메일</span>
                <strong>{order.email}</strong>
              </div>
            ) : null}
            {order?.totalText ? (
              <div className="order-meta-card">
                <span>총계</span>
                <strong>{order.totalText}</strong>
              </div>
            ) : null}
            <div className="order-meta-card">
              <span>결제 방법</span>
              <strong>무통장입금</strong>
            </div>
          </div>
          {lineItems.length > 0 ? (
            <div className="summary-list">
              {lineItems.map((item) => (
                <div key={`${item.id}-${item.quantity}`} className="summary-row">
                  <span>
                    {item.title} x {item.quantity}
                  </span>
                  <strong>{item.priceValue === null ? item.priceText ?? "" : formatWon(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {order?.memo ? (
            <div className="order-received-note">
              <h3>주문 메모</h3>
              <p>{order.memo}</p>
            </div>
          ) : null}
        </article>

        <aside className="stack-grid">
          <section className="panel bank-card bank-card-large">
            <p className="eyebrow">Bank Transfer</p>
            <h2>입금 안내</h2>
            <strong>{bankTransferAccount.bankName}</strong>
            <span>{bankTransferAccount.accountHolder}</span>
            <span>{bankTransferAccount.accountNumber}</span>
          </section>

          <section className="panel order-card">
            <h2>주문 상품</h2>
            {lineItems.length > 0 ? (
              <div className="summary-list">
                {lineItems.map((item) => (
                  <div key={`${item.id}-summary-${item.quantity}`} className="summary-row">
                    <span>
                      {item.title} x {item.quantity}
                    </span>
                    <strong>{item.priceValue === null ? item.priceText ?? "" : formatWon(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="summary-row">
                <span>주문 상품</span>
                <strong>결제 직후 확인하실 수 있습니다.</strong>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

````

</details>

<details><summary><code>components/structured-data.tsx</code> — 전체 9줄</summary>

````tsx
type StructuredDataProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
};

export function StructuredData({ data }: StructuredDataProps) {
  const json = JSON.stringify(data).replaceAll("<", "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

````

</details>

## D. 운영자 화면과 편집기

로그인, 대시보드, 글·페이지 목록/편집, 상품 목록/편집, 주문/자산 화면의 실제 UI를 보여준다.

<details><summary><code>app/loginpage/layout.tsx</code> — 전체 15줄</summary>

````tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true
  }
};

export default function LoginpageLayout({ children }: { children: React.ReactNode }) {
  return children;
}

````

</details>

<details><summary><code>app/loginpage/page.tsx</code> — 전체 38줄</summary>

````tsx
import { redirect } from "next/navigation";

import { loginAdminAction } from "@/app/admin/actions";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminLoginEntryPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/loginpage/dashboard");
  }

  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="shell">
      <section className="panel admin-login-panel">
        <p className="eyebrow">Admin</p>
        <h1>관리자 로그인</h1>
        <p>관리 기능은 로그인된 관리자만 사용할 수 있습니다.</p>
        <form action={loginAdminAction} className="password-form">
          <label className="field password-field">
            <span>비밀번호</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="action-button">
            로그인
          </button>
          {hasError ? <p className="warning-text">비밀번호가 올바르지 않습니다.</p> : null}
        </form>
      </section>
    </main>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/layout.tsx</code> — 전체 34줄</summary>

````tsx
import Link from "next/link";

import { logoutAdminAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function LoginpageDashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <main className="shell admin-shell">
      <aside className="panel admin-sidebar">
        <p className="eyebrow">Admin</p>
        <nav className="admin-nav">
          <Link href="/loginpage/dashboard">대시보드</Link>
          <Link href="/loginpage/posts">글·페이지 관리</Link>
          <Link href="/loginpage/products">상품 관리</Link>
          <Link href="/loginpage/orders">주문 확인</Link>
          <Link href="/loginpage/assets">이미지 업로드</Link>
        </nav>
        <form action={logoutAdminAction}>
          <button type="submit" className="action-button secondary-button">
            로그아웃
          </button>
        </form>
      </aside>
      <div className="admin-content">{children}</div>
    </main>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/dashboard/page.tsx</code> — 전체 87줄</summary>

````tsx
import { listAdminAssets, listAdminOrders, listAdminProductOverrides } from "@/lib/admin-store";
import { getAdminDbHealthStatus } from "@/lib/admin-db";
import { ensureAdminContentCatalog, getSiteMeta } from "@/lib/site-data";
import { getSiteUrlInfo } from "@/lib/site-url";

function connectionModeLabel(mode: Awaited<ReturnType<typeof getAdminDbHealthStatus>>["connectionMode"]) {
  if (mode === "supavisor-transaction") return "Supavisor transaction pooler";
  if (mode === "supavisor-session") return "Supavisor session pooler";
  if (mode === "direct") return "Direct PostgreSQL";
  return "미설정";
}

export default async function LoginpageDashboardPage() {
  let contentDatabaseAvailable = true;
  const [posts, products, assets, orders, dbHealth, siteMeta] = await Promise.all([
    ensureAdminContentCatalog().catch((error) => {
      contentDatabaseAvailable = false;
      console.error("[admin-dashboard-posts]", error instanceof Error ? error.message : "Unknown database error");
      return [];
    }),
    listAdminProductOverrides(),
    listAdminAssets(),
    listAdminOrders(12),
    getAdminDbHealthStatus(),
    getSiteMeta()
  ]);
  const siteUrlInfo = getSiteUrlInfo(siteMeta.home);
  const heartbeatAge = dbHealth.lastCronSuccessAt ? Date.now() - Date.parse(dbHealth.lastCronSuccessAt) : null;
  const heartbeatRecent = heartbeatAge !== null && heartbeatAge < 36 * 60 * 60 * 1_000;

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Overview</p>
        <h1>운영 대시보드</h1>
        <div className="stats-grid">
          <article className="stat-card">
            <span>글·페이지</span>
            <strong>{contentDatabaseAvailable && dbHealth.available ? posts.length : "확인 불가"}</strong>
          </article>
          <article className="stat-card">
            <span>상품 오버라이드</span>
            <strong>{products.length}</strong>
          </article>
          <article className="stat-card">
            <span>업로드 자산</span>
            <strong>{assets.length}</strong>
          </article>
          <article className="stat-card">
            <span>최근 주문</span>
            <strong>{orders.length}</strong>
          </article>
          <article className="stat-card">
            <span>Supabase DB</span>
            <strong>{dbHealth.available ? "정상" : "연결 실패"}</strong>
          </article>
        </div>

        {!dbHealth.available ? (
          <p className="warning-text">Supabase DB 연결 실패로 관리자 통계 일부를 불러오지 못했습니다. 0으로 표시된 값은 실제 데이터 수가 아닐 수 있습니다.</p>
        ) : null}

        <div className="admin-inline-flags">
          <span>{connectionModeLabel(dbHealth.connectionMode)}</span>
          <span>현재 확인 {new Date(dbHealth.checkedAt).toLocaleString("ko-KR")}</span>
        </div>
        {dbHealth.lastCronSuccessAt ? (
          <p className={heartbeatRecent ? "inline-note" : "warning-text"}>
            일일 DB 확인 최근 성공: {new Date(dbHealth.lastCronSuccessAt).toLocaleString("ko-KR")}
            {heartbeatRecent ? "" : " · 36시간 이상 새 성공 기록이 없습니다."}
          </p>
        ) : (
          <p className="warning-text">아직 일일 DB 확인 성공 기록이 없습니다. CRON_SECRET과 Vercel Cron 설정을 확인해 주세요.</p>
        )}

        <div className="admin-inline-flags">
          <span>SEO 기준 주소 {siteUrlInfo.url.origin}</span>
          <span>{siteUrlInfo.source === "explicit" ? "직접 설정" : siteUrlInfo.source === "vercel-production" ? "Vercel 운영 도메인" : "원본 fallback"}</span>
        </div>
        {siteUrlInfo.source === "source-fallback" ? (
          <p className="warning-text">커스텀 도메인 연결 전에 NEXT_PUBLIC_SITE_URL을 최종 HTTPS 주소로 설정해 주세요.</p>
        ) : null}
      </section>
    </section>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/posts/page.tsx</code> — 전체 105줄</summary>

````tsx
import Link from "next/link";

import { duplicatePostAction, setPostPublicationAction } from "@/app/admin/actions";
import { ensureAdminContentCatalog } from "@/lib/site-data";

const visibilityLabel = {
  public: "공개",
  hidden: "링크 전용",
  password: "비밀번호",
  private: "완전 비공개"
} as const;

export default async function LoginpagePostsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; saved?: string; status?: string; error?: string }>;
}) {
  const params = await searchParams;
  let databaseAvailable = true;
  const posts = await ensureAdminContentCatalog().catch((error) => {
    databaseAvailable = false;
    console.error("[admin-posts-list]", error instanceof Error ? error.message : "Unknown database error");
    return [];
  });
  const query = params.q?.trim().toLocaleLowerCase("ko-KR") ?? "";
  const filteredPosts = query
    ? posts.filter((post) => `${post.title} ${post.slug} ${post.path}`.toLocaleLowerCase("ko-KR").includes(query))
    : posts;

  return (
    <section className="stack-grid">
      <section className="panel admin-post-index">
        <div className="admin-product-head">
          <div>
            <p className="eyebrow">Content</p>
            <h1>글·페이지 관리</h1>
            <p>기존 글, 이용약관 같은 고정 페이지, 홈 설정을 한곳에서 관리합니다. 상품은 상품 관리에서 별도로 다룹니다.</p>
          </div>
          <Link href="/loginpage/posts/new" className="action-button">새 콘텐츠</Link>
        </div>

        {params.saved ? <p className="success-text">글을 {params.saved === "published" ? "발행" : "초안 저장"}했습니다.</p> : null}
        {params.status ? <p className="success-text">발행 상태를 변경했습니다.</p> : null}
        {params.error ? <p className="warning-text">요청한 글 작업을 완료하지 못했습니다.</p> : null}
        {!databaseAvailable ? (
          <p className="warning-text">
            Supabase DB에 연결하지 못해 글·페이지 목록을 불러오지 못했습니다. 현재 0개인 것이 아니므로 잠시 후 새로고침해 주세요.
          </p>
        ) : null}

        <form className="admin-post-filter" action="/loginpage/posts">
          <label className="field">
            <span>콘텐츠 검색</span>
            <input type="search" name="q" defaultValue={params.q} placeholder="제목, 슬러그, 경로" />
          </label>
          <button type="submit" className="action-button secondary-button">찾기</button>
        </form>

        <div className="admin-list">
          {filteredPosts.map((post) => {
            const scheduled = post.publicationStatus === "published" && Date.parse(post.publishedAt) > Date.now();
            const live = post.publicationStatus === "published" && !scheduled && post.visibility !== "private";
            return (
              <article key={post.id} className="admin-list-card admin-post-card">
                <div className="admin-product-head">
                  <div>
                    <strong>{post.title}</strong>
                    <span>{post.contentType === "page" ? "페이지" : "글"} · {post.path}</span>
                  </div>
                  <div className="admin-inline-flags">
                    <span>{post.publicationStatus === "draft" ? "초안" : scheduled ? "예약" : "발행"}</span>
                    <span>{visibilityLabel[post.visibility]}</span>
                    {post.listedInArchive ? <span>목록</span> : null}
                    {post.listedInSearch ? <span>검색</span> : null}
                    {post.allowIndexing ? <span>색인</span> : <span>noindex</span>}
                  </div>
                </div>
                <span>발행일 {new Date(post.publishedAt).toLocaleString("ko-KR")} · 수정 {new Date(post.updatedAt).toLocaleString("ko-KR")}</span>
                <div className="admin-page-actions">
                  <Link href={`/loginpage/posts/edit/${post.id}`} className="action-button secondary-button">수정</Link>
                  {live ? <Link href={post.path} target="_blank" className="action-button secondary-button">보기</Link> : null}
                  <form action={duplicatePostAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <button type="submit" className="action-button secondary-button">복사</button>
                  </form>
                  <form action={setPostPublicationAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="publicationStatus" value={post.publicationStatus === "published" ? "draft" : "published"} />
                    <button type="submit" className="action-button secondary-button">
                      {post.publicationStatus === "published" ? "초안으로 전환" : "발행"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {databaseAvailable && filteredPosts.length === 0 ? (
            <p className="empty-state">조건에 맞는 글 또는 페이지가 없습니다.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/posts/new/page.tsx</code> — 전체 11줄</summary>

````tsx
import { AdminPostForm } from "@/components/admin-post-form";

export default async function NewPostPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <AdminPostForm error={params.error} />;
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/posts/edit/[id]/page.tsx</code> — 전체 18줄</summary>

````tsx
import { notFound } from "next/navigation";

import { AdminPostForm } from "@/components/admin-post-form";
import { getAdminPostById } from "@/lib/admin-store";

export default async function EditPostPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; copied?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await getAdminPostById(Number(id));
  if (!post) notFound();
  return <AdminPostForm post={post} error={query.error} copied={query.copied === "1"} />;
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/products/page.tsx</code> — 전체 18줄</summary>

````tsx
import { redirect } from "next/navigation";

import { AdminProductsIndex } from "@/components/admin-products-index";

export default async function LoginpageProductsPage({
  searchParams
}: {
  searchParams: Promise<{ bulkSaved?: string; bulkError?: string; error?: string; edit?: string }>;
}) {
  const params = await searchParams;

  if (params.edit) {
    redirect(`/loginpage/products/edit/${encodeURIComponent(params.edit)}`);
  }

  return <AdminProductsIndex currentPage={1} searchParams={params} />;
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/products/page/[page]/page.tsx</code> — 전체 29줄</summary>

````tsx
import { notFound, redirect } from "next/navigation";

import { AdminProductsIndex } from "@/components/admin-products-index";

export default async function LoginpageProductsPaginationPage({
  params,
  searchParams
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ bulkSaved?: string; bulkError?: string; error?: string; edit?: string }>;
}) {
  const [{ page }, query] = await Promise.all([params, searchParams]);
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect("/loginpage/products");
  }

  if (query.edit) {
    redirect(`/loginpage/products/edit/${encodeURIComponent(query.edit)}?page=${pageNumber}`);
  }

  return <AdminProductsIndex currentPage={pageNumber} searchParams={query} />;
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/products/common/page.tsx</code> — 전체 46줄</summary>

````tsx
import Link from "next/link";

import { saveProductCommonIntroAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { getProductCommonIntroHtml } from "@/lib/site-data";

export default async function LoginpageProductCommonPage({
  searchParams
}: {
  searchParams: Promise<{ introSaved?: string; error?: string }>;
}) {
  const [productCommonIntroHtml, params] = await Promise.all([getProductCommonIntroHtml(), searchParams]);

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Products</p>
            <h1>상품 공통 도입부</h1>
          </div>
          <div className="admin-page-actions">
            <Link href="/loginpage/products" className="action-button secondary-button">
              목록으로
            </Link>
          </div>
        </div>

        <p className="plain-copy">모든 상품 상세 상단에 공통으로 들어가는 안내 영역입니다.</p>
        {params.introSaved === "1" ? <p className="inline-note">공통 안내가 저장되었습니다.</p> : null}
        {params.error === "save" ? (
          <p className="warning-text">Supabase DB에 연결하지 못해 공통 안내를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        ) : null}

        <form action={saveProductCommonIntroAction} className="admin-form-grid">
          <input type="hidden" name="returnTo" value="/loginpage/products/common" />
          <AdminHtmlEditor label="상품 공통 도입부" name="value" initialHtml={productCommonIntroHtml} minHeight={420} />
          <button type="submit" className="action-button">
            공통 안내 저장
          </button>
        </form>
      </section>
    </section>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/products/edit/[slug]/page.tsx</code> — 전체 163줄</summary>

````tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveProductAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { ProductPriceContent } from "@/components/product-price-content";
import { getProductBySlug } from "@/lib/site-data";

function listHrefFor(page: number) {
  return page > 1 ? `/loginpage/products/page/${page}` : "/loginpage/products";
}

export default async function LoginpageProductEditPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; copied?: string; error?: string; page?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug, { includeHidden: true, includePrivate: true });

  if (!product) {
    notFound();
  }

  const pageNumber = Number(query.page ?? "1");
  const normalizedPage = Number.isInteger(pageNumber) && pageNumber > 1 ? pageNumber : 1;
  const listHref = listHrefFor(normalizedPage);

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Product Editor</p>
            <h1>{product.title}</h1>
          </div>
          <div className="admin-page-actions">
            <Link
              href={`/product/${encodeURIComponent(product.slug)}`}
              className="action-button"
              target="_blank"
              rel="noreferrer"
            >
              공개 상품 보기
            </Link>
            <Link href="/loginpage/products/common" className="action-button secondary-button">
              공통 도입부 편집
            </Link>
            <Link href={listHref} className="action-button secondary-button">
              목록으로
            </Link>
          </div>
        </div>

        <div className="admin-inline-flags">
          <span>{product.slug}</span>
          <span>{product.visibility}</span>
          <span>{product.stockState}</span>
        </div>

        <p className="catalog-price admin-product-price">
          <ProductPriceContent
            priceText={product.priceText}
            priceValue={product.priceValue}
            regularPriceValue={product.regularPriceValue}
            salePriceValue={product.salePriceValue}
          />
        </p>

        {query.saved === "1" ? <p className="inline-note">상품 설정이 저장되었습니다.</p> : null}
        {query.copied === "1" ? (
          <p className="inline-note">비공개 독립 복사본을 만들었습니다. 슬러그와 상품 정보를 확인한 뒤 공개범위를 선택해 저장해 주세요.</p>
        ) : null}
        {query.error === "slug" ? <p className="warning-text">사용할 수 있는 상품 슬러그를 입력해 주세요.</p> : null}
        {query.error === "save" ? (
          <p className="warning-text">상품 변경 사항을 DB에 저장하지 못했습니다. 내용은 브라우저 임시 저장본에서 복원할 수 있습니다.</p>
        ) : null}
      </section>

      <article className="panel admin-product-card admin-product-editor-panel">
        <form action={saveProductAction} className="admin-form-grid">
          <input type="hidden" name="overrideId" value={product.overrideId ?? ""} />
          <input type="hidden" name="sourceProductId" value={product.sourceProductId ?? ""} />
          <input type="hidden" name="originalSlug" value={product.slug} />
          <input type="hidden" name="page" value={normalizedPage} />

          <label className="field field-wide">
            <span>주소 슬러그</span>
            <input name="slug" defaultValue={product.slug} required />
            <small className="editor-description">저장 후 공개 주소는 /product/입력한-슬러그 형식으로 바뀝니다.</small>
          </label>

          <label className="field field-wide">
            <span>상품명 override</span>
            <input name="title" defaultValue={product.title} />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>정가</span>
              <input
                name="regularPriceValue"
                type="number"
                min="0"
                defaultValue={product.regularPriceValue ?? product.priceValue ?? undefined}
              />
            </label>

            <label className="field">
              <span>할인가</span>
              <input name="salePriceValue" type="number" min="0" defaultValue={product.salePriceValue ?? undefined} />
            </label>

            <label className="field">
              <span>공개범위</span>
              <select name="visibility" defaultValue={product.visibility}>
                <option value="public">공개</option>
                <option value="hidden">링크로만 접근</option>
                <option value="private">비공개</option>
              </select>
            </label>

            <label className="field">
              <span>판매 상태</span>
              <select name="stockState" defaultValue={product.stockState}>
                <option value="available">판매 가능</option>
                <option value="reserved">예약중</option>
                <option value="soldout">판매완료</option>
              </select>
            </label>
          </div>

          <label className="field field-wide">
            <span>대표 이미지 URL</span>
            <input name="imageUrl" defaultValue={product.imageUrl ?? ""} />
          </label>

          <AdminHtmlEditor
            label="요약 override"
            name="excerptHtml"
            initialHtml={product.excerptHtml}
            minHeight={180}
            draftStorageKey={`product:${product.overrideId ?? product.sourceProductId ?? product.slug}:excerpt`}
          />
          <AdminHtmlEditor
            label="본문 override"
            name="contentHtml"
            initialHtml={product.contentHtml}
            minHeight={360}
            draftStorageKey={`product:${product.overrideId ?? product.sourceProductId ?? product.slug}:content`}
          />

          <button type="submit" className="action-button">
            저장
          </button>
        </form>
      </article>
    </section>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/orders/page.tsx</code> — 전체 105줄</summary>

````tsx
import Link from "next/link";

import { listAdminOrders } from "@/lib/admin-store";
import { formatWon } from "@/lib/purchase-flow";

function formatOrderDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const statusLabels = {
  pending: "입금대기",
  paid: "입금확인",
  done: "처리완료",
  cancelled: "취소"
} as const;

export default async function LoginpageOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Orders</p>
        <div className="admin-page-actions">
          <div>
            <h1>주문 확인</h1>
            <p>최신 주문이 먼저 보이며, 주문완료 페이지로 바로 열어볼 수 있습니다.</p>
          </div>
        </div>
      </section>

      {orders.length > 0 ? (
        <section className="stack-grid">
          {orders.map((order) => (
            <article key={order.id} className="panel admin-order-card">
              <div className="admin-order-head">
                <div>
                  <p className="eyebrow">#{order.id}</p>
                  <h2>{order.customerName || "이름 미입력"}</h2>
                </div>
                <div className="admin-inline-flags">
                  <span>{statusLabels[order.status]}</span>
                  <span>{order.totalText || formatWon(order.totalValue)}</span>
                </div>
              </div>

              <div className="admin-order-meta">
                <div>
                  <span>일시</span>
                  <strong>{formatOrderDate(order.createdAt)}</strong>
                </div>
                <div>
                  <span>이메일</span>
                  <strong>{order.email || "-"}</strong>
                </div>
                <div>
                  <span>연락처</span>
                  <strong>{order.phone || "-"}</strong>
                </div>
                <div>
                  <span>주문완료</span>
                  <strong>
                    <Link href={`/checkout/order-received/${order.id}?key=${encodeURIComponent(order.key)}`} className="text-link">
                      열기
                    </Link>
                  </strong>
                </div>
              </div>

              <div className="summary-list">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.slug}-${item.quantity}`} className="summary-row">
                    <span>
                      {item.title} x {item.quantity}
                    </span>
                    <strong>{item.priceValue === null ? item.priceText ?? "" : formatWon(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>

              {order.memo ? (
                <div className="order-received-note">
                  <h3>주문 메모</h3>
                  <p>{order.memo}</p>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="panel">
          <h2>저장된 주문이 없습니다</h2>
          <p>첫 주문이 생성되면 이 화면에서 확인할 수 있습니다.</p>
        </section>
      )}
    </section>
  );
}

````

</details>

<details><summary><code>app/loginpage/(dashboard)/assets/page.tsx</code> — 전체 64줄</summary>

````tsx
import { uploadAssetAction } from "@/app/admin/actions";
import { listAdminAssetsRequired } from "@/lib/admin-store";

export default async function LoginpageAssetsPage({
  searchParams
}: {
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const params = await searchParams;
  let databaseAvailable = true;
  const assets = await listAdminAssetsRequired().catch((error) => {
    databaseAvailable = false;
    console.error("[admin-assets-list]", error instanceof Error ? error.message : "Unknown database error");
    return [];
  });
  const uploadedCount = Number(params.uploaded ?? "0");

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Assets</p>
        <h1>이미지 업로드</h1>
        <form action={uploadAssetAction} className="admin-form-grid">
          <label className="field field-wide">
            <span>파일</span>
            <input type="file" name="file" accept="image/*,.pdf,.zip" multiple required />
          </label>
          <label className="field field-wide">
            <span>Cloudinary 폴더</span>
            <input name="folder" placeholder="기본값: aloha-clone" />
          </label>
          <button type="submit" className="action-button" disabled={!databaseAvailable}>
            업로드
          </button>
          {uploadedCount > 0 ? <p className="inline-note">{uploadedCount}개 업로드가 완료되었습니다.</p> : null}
          {params.error === "1" ? <p className="warning-text">업로드할 파일을 선택해 주세요.</p> : null}
          {params.error === "save" ? (
            <p className="warning-text">업로드 또는 DB 기록 저장에 실패했습니다. 같은 파일을 다시 올리기 전에 Cloudinary에서 업로드 여부를 확인해 주세요.</p>
          ) : null}
        </form>
      </section>

      <section className="panel">
        <h2>최근 업로드</h2>
        <div className="admin-list">
          {assets.map((asset) => (
            <article key={asset.id} className="admin-list-card">
              <strong>{asset.originalFilename ?? asset.publicId}</strong>
              <a href={asset.secureUrl} target="_blank" rel="noreferrer">
                {asset.secureUrl}
              </a>
            </article>
          ))}
          {!databaseAvailable ? (
            <p className="warning-text">Supabase DB에 연결하지 못해 최근 업로드 목록을 불러오지 못했습니다.</p>
          ) : assets.length === 0 ? (
            <p className="empty-state">업로드된 자산이 아직 없습니다.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}

````

</details>

<details><summary><code>components/admin-html-editor.tsx</code> — 전체 492줄</summary>

````tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";

type UploadedAsset = {
  secureUrl: string;
  originalFilename: string | null;
  resourceType: string;
};

type UploadResponse = {
  provider?: "cloudinary";
  uploads?: UploadedAsset[];
  error?: string;
};

type AdminHtmlEditorProps = {
  label: string;
  name: string;
  initialHtml?: string | null;
  description?: string;
  minHeight?: number;
  required?: boolean;
  draftStorageKey?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildInsertedMarkup(asset: UploadedAsset) {
  const url = escapeHtml(asset.secureUrl);
  const label = escapeHtml(asset.originalFilename ?? "첨부 파일");

  if (asset.resourceType === "image") {
    return `<p><img src="${url}" alt="${label}" /></p>`;
  }

  return `<p><a href="${url}" target="_blank" rel="noreferrer">${label}</a></p>`;
}

function getRangeFromPoint(x: number, y: number) {
  if (typeof document.caretRangeFromPoint === "function") {
    return document.caretRangeFromPoint(x, y);
  }

  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) {
      return null;
    }

    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }

  return null;
}

export function AdminHtmlEditor({
  label,
  name,
  initialHtml,
  description,
  minHeight = 260,
  required = false,
  draftStorageKey
}: AdminHtmlEditorProps) {
  const inputId = useId();
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState(initialHtml ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlValueRef = useRef(initialHtml ?? "");
  const isUploadingRef = useRef(false);

  function commitHtml(nextHtml: string) {
    htmlValueRef.current = nextHtml;
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = nextHtml;
    }
    setHtml(nextHtml);
    setIsDirty(true);
  }

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }, [html, mode]);

  useEffect(() => {
    if (!draftStorageKey) return;
    const draft = window.localStorage.getItem(`aloha-editor:${draftStorageKey}`);
    if (draft !== null && draft !== (initialHtml ?? "")) {
      setSavedDraft(draft);
    }
  }, [draftStorageKey, initialHtml]);

  useEffect(() => {
    if (!draftStorageKey || !isDirty) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(`aloha-editor:${draftStorageKey}`, html);
      setStatus("이 브라우저에 임시 저장했습니다.");
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [draftStorageKey, html, isDirty]);

  useEffect(() => {
    const hiddenInput = hiddenInputRef.current;
    const form = hiddenInput?.form;
    if (!hiddenInput || !form) return;

    const syncSubmittedValue = (event: FormDataEvent) => {
      const latestHtml = mode === "visual" ? editorRef.current?.innerHTML ?? htmlValueRef.current : htmlTextareaRef.current?.value ?? htmlValueRef.current;
      htmlValueRef.current = latestHtml;
      hiddenInput.value = latestHtml;
      event.formData.set(name, latestHtml);
    };
    const blockWhileUploading = (event: SubmitEvent) => {
      if (!isUploadingRef.current) return;
      event.preventDefault();
      setStatus("이미지 업로드가 끝난 뒤 다시 저장해 주세요.");
    };

    form.addEventListener("formdata", syncSubmittedValue);
    form.addEventListener("submit", blockWhileUploading);
    return () => {
      form.removeEventListener("formdata", syncSubmittedValue);
      form.removeEventListener("submit", blockWhileUploading);
    };
  }, [mode, name]);

  const plainText = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  function syncFromEditor() {
    commitHtml(editorRef.current?.innerHTML ?? "");
  }

  function focusVisualEditor() {
    if (mode !== "visual") {
      return false;
    }

    editorRef.current?.focus();
    return true;
  }

  function execCommand(command: string, value?: string) {
    if (!focusVisualEditor()) {
      return;
    }

    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function insertHtmlAtSelection(markup: string) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    let range =
      selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0)
        : null;

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();

    const template = document.createElement("template");
    template.innerHTML = markup;
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (selection) {
      selection.removeAllRanges();
      if (lastNode) {
        const nextRange = document.createRange();
        nextRange.setStartAfter(lastNode);
        nextRange.collapse(true);
        selection.addRange(nextRange);
      } else {
        selection.addRange(range);
      }
    }

    syncFromEditor();
  }

  function insertHtmlIntoTextarea(markup: string) {
    const textarea = htmlTextareaRef.current;
    if (!textarea) {
      commitHtml(`${htmlValueRef.current}${markup}`);
      return;
    }

    const currentHtml = htmlValueRef.current;
    const start = textarea.selectionStart ?? currentHtml.length;
    const end = textarea.selectionEnd ?? currentHtml.length;
    const nextValue = `${currentHtml.slice(0, start)}${markup}${currentHtml.slice(end)}`;
    commitHtml(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + markup.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function uploadFiles(files: FileList | File[]) {
    const queue = Array.from(files).filter((file) => file.size > 0);
    if (queue.length === 0) {
      return;
    }

    isUploadingRef.current = true;
    setIsUploading(true);
    setStatus(`Cloudinary에 ${queue.length}개 업로드 중...`);

    try {
      const formData = new FormData();
      for (const file of queue) {
        formData.append("files", file);
      }

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || payload.provider !== "cloudinary" || !payload.uploads) {
        throw new Error(payload.error ?? "업로드에 실패했습니다.");
      }

      const markup = payload.uploads.map(buildInsertedMarkup).join("");
      if (mode === "html") {
        insertHtmlIntoTextarea(markup);
      } else {
        insertHtmlAtSelection(markup);
      }

      setStatus(
        `Cloudinary 업로드 완료 · ${payload.uploads.length}개를 본문에 삽입했습니다. 상품 저장 버튼을 눌러 변경을 확정해 주세요.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleLinkInsert() {
    if (mode !== "visual") {
      return;
    }

    const value = window.prompt("링크 주소를 입력하세요.");
    if (!value) {
      return;
    }

    execCommand("createLink", value.trim());
  }

  function restoreDraft() {
    if (savedDraft === null) return;
    commitHtml(savedDraft);
    setSavedDraft(null);
    setStatus("브라우저 임시 저장본을 복원했습니다.");
  }

  function discardDraft() {
    if (draftStorageKey) {
      window.localStorage.removeItem(`aloha-editor:${draftStorageKey}`);
    }
    setSavedDraft(null);
    setStatus("브라우저 임시 저장본을 삭제했습니다.");
  }

  return (
    <label className="field field-wide admin-editor-field" htmlFor={inputId}>
      <span>{label}</span>
      {description ? <small className="editor-description">{description}</small> : null}
      <div className="admin-editor-shell">
        <div className="admin-editor-topbar">
          <div className="admin-editor-mode-tabs">
            <button
              type="button"
              className={`editor-tab ${mode === "visual" ? "is-active" : ""}`}
              onClick={() => setMode("visual")}
            >
              기본 모드
            </button>
            <button
              type="button"
              className={`editor-tab ${mode === "html" ? "is-active" : ""}`}
              onClick={() => setMode("html")}
            >
              HTML 모드
            </button>
          </div>
          <div className="admin-editor-actions">
            <button type="button" className="toolbar-button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              이미지 추가
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.zip"
              multiple
              hidden
              onChange={(event) => {
                if (event.currentTarget.files) {
                  void uploadFiles(event.currentTarget.files);
                }
              }}
            />
          </div>
        </div>

        {savedDraft !== null ? (
          <div className="editor-recovery-banner">
            <span>이 브라우저에 서버 저장본과 다른 임시 내용이 있습니다.</span>
            <button type="button" className="toolbar-button" onClick={restoreDraft}>복원</button>
            <button type="button" className="toolbar-button" onClick={discardDraft}>삭제</button>
          </div>
        ) : null}

        {mode === "visual" ? (
          <>
            <div className="admin-editor-toolbar">
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("undo")}>
                실행 취소
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("redo")}>
                다시 실행
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("bold")}>
                굵게
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("italic")}>
                기울임
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("underline")}>
                밑줄
              </button>
              <button
                type="button"
                className="toolbar-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand("formatBlock", "<p>")}
              >
                문단
              </button>
              <button
                type="button"
                className="toolbar-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand("formatBlock", "<h2>")}
              >
                H2
              </button>
              <button
                type="button"
                className="toolbar-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand("formatBlock", "<h3>")}
              >
                H3
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("insertUnorderedList")}>
                목록
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("insertOrderedList")}>
                번호
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("formatBlock", "<blockquote>")}>
                인용
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={handleLinkInsert}>
                링크
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("unlink")}>
                링크 해제
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("insertHorizontalRule")}>
                구분선
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("removeFormat")}>
                서식 지우기
              </button>
            </div>
            <div
              ref={editorRef}
              id={inputId}
              className="admin-editor-surface rich-text"
              contentEditable
              suppressContentEditableWarning
              style={{ minHeight }}
              onInput={syncFromEditor}
              onBlur={syncFromEditor}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                if (files.length === 0) {
                  return;
                }

                event.preventDefault();
                void uploadFiles(files);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const range = getRangeFromPoint(event.clientX, event.clientY);
                if (range) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }

                void uploadFiles(event.dataTransfer.files);
              }}
            />
          </>
        ) : (
          <textarea
            ref={htmlTextareaRef}
            id={inputId}
            className="editor-html-textarea"
            rows={14}
            value={html}
            onChange={(event) => commitHtml(event.currentTarget.value)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const target = event.currentTarget;
              const start = target.selectionStart ?? html.length;
              target.setSelectionRange(start, start);
              void uploadFiles(event.dataTransfer.files);
            }}
          />
        )}

        <p className="editor-status">
          {status ?? "이미지를 드래그앤드롭하거나 선택하면 Cloudinary에 업로드한 뒤 현재 위치에 삽입합니다."} · 텍스트 {plainText.length.toLocaleString("ko-KR")}자
        </p>
      </div>

      <textarea ref={hiddenInputRef} name={name} defaultValue={initialHtml ?? ""} readOnly hidden required={required} />
    </label>
  );
}

````

</details>

<details><summary><code>components/admin-post-form.tsx</code> — 전체 151줄</summary>

````tsx
import Link from "next/link";

import { savePostAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import type { AdminPostRecord } from "@/lib/admin-store";

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function AdminPostForm({
  post,
  error,
  copied = false
}: {
  post?: AdminPostRecord | null;
  error?: string;
  copied?: boolean;
}) {
  const isEdit = Boolean(post);
  const draftKey = post ? `post-${post.id}` : "post-new";

  return (
    <section className="panel admin-post-editor-panel">
      <div className="admin-product-head">
        <div>
          <p className="eyebrow">Posts</p>
          <h1>{isEdit ? `${post?.contentType === "page" ? "페이지" : "글"} 수정` : "새 콘텐츠"}</h1>
        </div>
        <div className="admin-page-actions">
          {post?.publicationStatus === "published" && post.visibility !== "private" ? (
            <Link href={post.path} target="_blank" className="action-button secondary-button">공개 화면 보기</Link>
          ) : null}
          <Link href="/loginpage/posts" className="action-button secondary-button">콘텐츠 목록</Link>
        </div>
      </div>

      {copied ? <p className="success-text">복사본을 비공개 초안으로 만들었습니다. 주소와 제목을 확인한 뒤 발행하세요.</p> : null}
      {error === "required" ? <p className="warning-text">제목과 본문은 필수입니다.</p> : null}
      {error === "password" ? <p className="warning-text">비밀번호 보호 글에는 비밀번호가 필요합니다.</p> : null}
      {error === "save" ? <p className="warning-text">저장하지 못했습니다. 경로 중복이나 데이터베이스 연결을 확인해 주세요.</p> : null}

      <form action={savePostAction} className="admin-form-grid">
        {post ? <input type="hidden" name="id" value={post.id} /> : null}
        {post?.sourceId !== null && post?.sourceId !== undefined ? <input type="hidden" name="sourceId" value={post.sourceId} /> : null}
        <input type="hidden" name="publicationStatus" value={post?.publicationStatus ?? "draft"} />
        <input type="hidden" name="returnTo" value={post ? `/loginpage/posts/edit/${post.id}` : "/loginpage/posts/new"} />

        <label className="field field-wide">
          <span>제목</span>
          <input name="title" defaultValue={post?.title} required />
        </label>

        <div className="admin-post-fields-grid field-wide">
          <label className="field">
            <span>콘텐츠 유형</span>
            {post?.sourceId !== null && post?.sourceId !== undefined ? (
              <>
                <input type="hidden" name="contentType" value={post.contentType} />
                <input value={post.contentType === "page" ? "페이지 — 원본 유형 유지" : "글 — 원본 유형 유지"} disabled />
              </>
            ) : (
              <select name="contentType" defaultValue={post?.contentType ?? "post"}>
                <option value="post">글 — 홈 글 목록에 표시 가능</option>
                <option value="page">페이지 — 고정 주소 콘텐츠</option>
              </select>
            )}
          </label>
          <label className="field">
            <span>슬러그</span>
            <input name="slug" defaultValue={post?.slug} placeholder="비우면 제목에서 자동 생성" />
          </label>
          <label className="field">
            <span>발행일시</span>
            <input type="datetime-local" name="publishedAt" defaultValue={toDateTimeLocal(post?.publishedAt ?? new Date().toISOString())} />
            <small>미래 시각으로 발행하면 그 시각 전까지 공개되지 않습니다.</small>
          </label>
        </div>

        <label className="field field-wide">
          <span>직접 경로</span>
          <input name="path" defaultValue={post?.path} placeholder="/2026/07/sample-post" />
          <small>페이지는 보통 `/terms`, 글은 `/2026/07/sample-post` 형식입니다. 주소 변경 시 기존 주소는 자동 리다이렉트되지 않습니다.</small>
        </label>

        <section className="admin-publishing-box field-wide" aria-labelledby="publishing-heading">
          <div>
            <h2 id="publishing-heading">공개·접근 정책</h2>
            <p>발행 여부, 주소 접근, 목록/검색 노출, 검색엔진 색인을 서로 독립적으로 설정합니다.</p>
          </div>
          <label className="field">
            <span>주소 접근 방식</span>
            <select name="visibility" defaultValue={post?.visibility ?? "public"}>
              <option value="public">공개 — 누구나 접근</option>
              <option value="hidden">링크 전용 — 목록에는 기본 비노출</option>
              <option value="password">비밀번호 — 암호 입력 후 접근</option>
              <option value="private">완전 비공개 — URL을 알아도 접근 불가</option>
            </select>
          </label>
          <label className="field">
            <span>글 비밀번호</span>
            <input name="accessPassword" type="password" defaultValue={post?.accessPassword ?? ""} autoComplete="new-password" placeholder="비밀번호 보호 선택 시 필수" />
          </label>
          <div className="admin-post-surface-options">
            <label className="admin-checkbox">
              <input type="checkbox" name="listedInArchive" defaultChecked={post?.listedInArchive ?? true} />
              <span>홈·글 목록에 표시(글만 적용)</span>
            </label>
            <label className="admin-checkbox">
              <input type="checkbox" name="listedInSearch" defaultChecked={post?.listedInSearch ?? true} />
              <span>사이트 검색 결과에 표시</span>
            </label>
            <label className="admin-checkbox">
              <input type="checkbox" name="allowIndexing" defaultChecked={post?.allowIndexing ?? true} />
              <span>검색엔진 색인 허용</span>
            </label>
          </div>
          <p className="inline-note">
            검색에만 보이게 하려면 <strong>링크 전용</strong> + <strong>홈·글 목록 끄기</strong> + <strong>사이트 검색 켜기</strong>를 선택하세요.
            완전 차단은 <strong>완전 비공개</strong> 또는 <strong>초안 저장</strong>을 사용합니다.
          </p>
        </section>

        <AdminHtmlEditor
          label="요약"
          name="excerptHtml"
          initialHtml={post?.excerptHtml}
          minHeight={150}
          draftStorageKey={`${draftKey}-excerpt`}
          description="목록과 검색 결과의 짧은 소개입니다. 비우면 본문에서 자동 생성됩니다."
        />
        <AdminHtmlEditor
          label="본문"
          name="contentHtml"
          initialHtml={post?.contentHtml}
          minHeight={420}
          draftStorageKey={`${draftKey}-content`}
        />

        <div className="admin-publish-actions field-wide">
          <button type="submit" name="intent" value="draft" className="action-button secondary-button">초안 저장</button>
          <button type="submit" name="intent" value="publish" className="action-button">발행 또는 업데이트</button>
          {post ? <span className="inline-note">최근 저장: {new Date(post.updatedAt).toLocaleString("ko-KR")}</span> : null}
        </div>
      </form>
    </section>
  );
}

````

</details>

<details><summary><code>components/admin-products-index.tsx</code> — 전체 193줄</summary>

````tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { bulkUpdateProductAction, duplicateProductAction } from "@/app/admin/actions";
import { PaginationNav } from "@/components/pagination-nav";
import { ProductPriceContent } from "@/components/product-price-content";
import { getAdminDbHealthStatus } from "@/lib/admin-db";
import { getProducts } from "@/lib/site-data";

const adminProductPageSize = 24;

function visibilityLabel(value: "public" | "hidden" | "private") {
  if (value === "hidden") {
    return "링크 전용";
  }

  if (value === "private") {
    return "비공개";
  }

  return "공개";
}

function stockStateLabel(value: "available" | "reserved" | "soldout") {
  if (value === "reserved") {
    return "예약중";
  }

  if (value === "soldout") {
    return "판매완료";
  }

  return "판매중";
}

function hrefForPage(page: number) {
  return page <= 1 ? "/loginpage/products" : `/loginpage/products/page/${page}`;
}

export async function AdminProductsIndex({
  currentPage,
  searchParams
}: {
  currentPage: number;
  searchParams: {
    bulkSaved?: string;
    bulkError?: string;
    error?: string;
  };
}) {
  const [products, dbHealth] = await Promise.all([
    getProducts({ includeHidden: true, includePrivate: true, allowAdminDbFallback: true }),
    getAdminDbHealthStatus()
  ]);
  const totalPages = Math.max(1, Math.ceil(products.length / adminProductPageSize));

  if (currentPage < 1 || currentPage > totalPages) {
    notFound();
  }

  const start = (currentPage - 1) * adminProductPageSize;
  const pageProducts = products.slice(start, start + adminProductPageSize);
  const currentListHref = hrefForPage(currentPage);

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h1>상품 관리</h1>
          </div>
          <div className="admin-page-actions">
            <Link href="/loginpage/products/common" className="action-button secondary-button">
              공통 도입부 편집
            </Link>
          </div>
        </div>

        <p className="plain-copy">
          목록에서는 상품 요약과 상태만 다룹니다. 자세한 편집은 각 상품의 편집 페이지에서 진행합니다.
        </p>
        <p className="plain-copy">
          전체 {products.length}개 상품 중 {start + 1} - {Math.min(products.length, start + pageProducts.length)}번을 보고 있습니다.
        </p>

        {!dbHealth.available ? (
          <p className="warning-text">
            Supabase DB에 연결하지 못해 저장된 상품 변경사항을 불러오지 못했습니다. 아래에는 원본 상품만 표시될 수 있으며, 연결이 복구될 때까지 편집하지 마세요.
          </p>
        ) : null}

        {searchParams.bulkSaved ? (
          <p className="inline-note">{searchParams.bulkSaved}개 상품 상태를 저장했습니다.</p>
        ) : null}
        {searchParams.bulkError === "selection" ? <p className="warning-text">선택한 상품이 없습니다.</p> : null}
        {searchParams.bulkError === "action" ? <p className="warning-text">일괄 변경할 상태를 선택해 주세요.</p> : null}
        {searchParams.bulkError === "save" ? <p className="warning-text">일괄 변경을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : null}
        {searchParams.error === "copy" ? <p className="warning-text">상품 복사본을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : null}
        {searchParams.error === "missing" ? <p className="warning-text">복사할 상품을 찾지 못했습니다.</p> : null}

        <form action={bulkUpdateProductAction} className="admin-form-grid">
          <input type="hidden" name="returnTo" value={currentListHref} />
          <input type="hidden" name="currentPage" value={currentPage} />

          <div className="admin-bulk-toolbar">
            <label className="field">
              <span>공개 범위 일괄변경</span>
              <select name="visibility">
                <option value="">변경 안 함</option>
                <option value="public">공개</option>
                <option value="hidden">링크로만 접근</option>
                <option value="private">비공개</option>
              </select>
            </label>
            <label className="field">
              <span>판매 상태 일괄변경</span>
              <select name="stockState">
                <option value="">변경 안 함</option>
                <option value="available">판매 가능</option>
                <option value="reserved">예약중</option>
                <option value="soldout">판매완료</option>
              </select>
            </label>
            <button type="submit" className="action-button">
              선택 상품 저장
            </button>
          </div>

          <div className="admin-product-selector">
            {pageProducts.map((product) => {
              const editHref = `/loginpage/products/edit/${encodeURIComponent(product.slug)}${
                currentPage > 1 ? `?page=${currentPage}` : ""
              }`;

              return (
                <article key={product.id} className="admin-product-row">
                  <label className="admin-checkbox admin-product-checkbox">
                    <input type="checkbox" name="selectedSlug" value={product.slug} />
                    <span>선택</span>
                  </label>

                  <div className="admin-product-row-body">
                    <div className="admin-product-row-head">
                      <div>
                        <strong>{product.title}</strong>
                        <p className="plain-copy">{product.slug}</p>
                      </div>
                      <div className="admin-product-actions">
                        <button
                          type="submit"
                          formAction={duplicateProductAction}
                          name="slug"
                          value={product.slug}
                          className="action-button secondary-button"
                        >
                          복사
                        </button>
                        <Link href={editHref} className="action-button secondary-button">
                          편집
                        </Link>
                        <Link href={`/product/${product.slug}`} className="action-button secondary-button">
                          보기
                        </Link>
                      </div>
                    </div>

                    <div className="admin-inline-flags">
                      <span>{visibilityLabel(product.visibility)}</span>
                      <span>{stockStateLabel(product.stockState)}</span>
                    </div>

                    <p className="catalog-price admin-product-price">
                      <ProductPriceContent
                        priceText={product.priceText}
                        priceValue={product.priceValue}
                        regularPriceValue={product.regularPriceValue}
                        salePriceValue={product.salePriceValue}
                      />
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </form>

        <PaginationNav currentPage={currentPage} totalPages={totalPages} basePath="/loginpage/products" />
      </section>
    </section>
  );
}

````

</details>

## E. 레거시 관리자 별칭 화면

현재 주 운영 경로는 /loginpage이지만 남아 있는 /admin 화면도 전역 CSS와 컴포넌트 판단에 영향을 줄 수 있어 함께 제공한다.

<details><summary><code>app/admin/layout.tsx</code> — 전체 15줄</summary>

````tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

````

</details>

<details><summary><code>app/admin/login/page.tsx</code> — 전체 6줄</summary>

````tsx
import { redirect } from "next/navigation";

export default function LegacyAdminLoginPage() {
  redirect("/loginpage");
}

````

</details>

<details><summary><code>app/admin/(dashboard)/layout.tsx</code> — 전체 6줄</summary>

````tsx
import { redirect } from "next/navigation";

export default function LegacyAdminLayout() {
  redirect("/loginpage");
}

````

</details>

<details><summary><code>app/admin/(dashboard)/page.tsx</code> — 전체 33줄</summary>

````tsx
import { listAdminAssets, listAdminPosts, listAdminProductOverrides } from "@/lib/admin-store";

export default async function AdminDashboardPage() {
  const [posts, products, assets] = await Promise.all([
    listAdminPosts(),
    listAdminProductOverrides(),
    listAdminAssets()
  ]);

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Overview</p>
        <h1>운영 대시보드</h1>
        <div className="stats-grid">
          <article className="stat-card">
            <span>작성 글</span>
            <strong>{posts.length}</strong>
          </article>
          <article className="stat-card">
            <span>상품 오버라이드</span>
            <strong>{products.length}</strong>
          </article>
          <article className="stat-card">
            <span>업로드 자산</span>
            <strong>{assets.length}</strong>
          </article>
        </div>
      </section>
    </section>
  );
}

````

</details>

<details><summary><code>app/admin/(dashboard)/posts/page.tsx</code> — 전체 79줄</summary>

````tsx
import { savePostAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { listAdminPosts } from "@/lib/admin-store";

export default async function AdminPostsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [posts, params] = await Promise.all([listAdminPosts(), searchParams]);

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Posts</p>
        <h1>글쓰기</h1>
        <form action={savePostAction} className="admin-form-grid">
          <label className="field">
            <span>제목</span>
            <input name="title" required />
          </label>
          <label className="field">
            <span>슬러그</span>
            <input name="slug" placeholder="auto-generated-if-empty" />
          </label>
          <label className="field">
            <span>발행일시</span>
            <input type="datetime-local" name="publishedAt" defaultValue={new Date().toISOString().slice(0, 16)} />
          </label>
          <label className="field">
            <span>공개범위</span>
            <select name="visibility" defaultValue="public">
              <option value="public">공개</option>
              <option value="hidden">링크로만 접근</option>
              <option value="private">비공개</option>
              <option value="password">비밀번호 보호</option>
            </select>
          </label>
          <label className="field field-wide">
            <span>직접 경로</span>
            <input name="path" placeholder="/2026/04/sample-post" />
          </label>
          <label className="field field-wide">
            <span>비밀번호</span>
            <input name="accessPassword" placeholder="visibility=password 인 경우만 입력" />
          </label>
          <AdminHtmlEditor label="요약" name="excerptHtml" minHeight={180} />
          <AdminHtmlEditor label="본문" name="contentHtml" minHeight={360} required />
          <label className="admin-checkbox">
            <input type="checkbox" name="listedInArchive" defaultChecked />
            <span>글 목록과 홈에 노출</span>
          </label>
          <button type="submit" className="action-button">
            저장
          </button>
          {params.saved === "1" ? <p className="inline-note">저장되었습니다.</p> : null}
          {params.error === "1" ? <p className="warning-text">필수 입력값을 확인해 주세요.</p> : null}
        </form>
      </section>

      <section className="panel">
        <h2>등록된 추가 글</h2>
        <div className="admin-list">
          {posts.map((post) => (
            <article key={post.id} className="admin-list-card">
              <strong>{post.title}</strong>
              <span>{post.path}</span>
              <span>
                {post.visibility} · {post.listedInArchive ? "archive" : "direct"}
              </span>
            </article>
          ))}
          {posts.length === 0 ? <p className="empty-state">아직 추가 글이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}

````

</details>

<details><summary><code>app/admin/(dashboard)/products/page.tsx</code> — 전체 145줄</summary>

````tsx
import Link from "next/link";

import { saveProductAction, saveProductCommonIntroAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { getProductCommonIntroHtml, getProducts } from "@/lib/site-data";

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string; introSaved?: string; edit?: string }>;
}) {
  const [products, params, productCommonIntroHtml] = await Promise.all([
    getProducts({ includeHidden: true, includePrivate: true }),
    searchParams,
    getProductCommonIntroHtml()
  ]);
  const selectedProduct = products.find((product) => product.slug === params.edit) ?? products[0] ?? null;
  const selectedHref = selectedProduct ? `/admin/products?edit=${encodeURIComponent(selectedProduct.slug)}` : "/admin/products";

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Products</p>
        <h1>상품 관리</h1>
        <form action={saveProductCommonIntroAction} className="admin-form-grid">
          <input type="hidden" name="returnTo" value={selectedHref} />
          <AdminHtmlEditor
            label="상품 공통 도입부"
            name="value"
            initialHtml={productCommonIntroHtml}
            minHeight={360}
            description="모든 상품 상세 상단에 공통으로 들어가는 안내 영역입니다."
          />
          <button type="submit" className="action-button">
            공통 안내 저장
          </button>
        </form>
        {params.introSaved === "1" ? <p className="inline-note">공통 안내가 저장되었습니다.</p> : null}
        {params.saved === "1" ? <p className="inline-note">상품 설정이 저장되었습니다.</p> : null}
        {params.error === "1" ? <p className="warning-text">상품 식별자를 확인해 주세요.</p> : null}
      </section>

      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>편집할 상품 선택</h2>
          </div>
          <p className="plain-copy">목록에서는 요약만 보여주고, 실제 편집기는 선택한 상품 한 건만 엽니다.</p>
        </div>
        <div className="admin-product-selector">
          {products.map((product) => {
            const href = `/admin/products?edit=${encodeURIComponent(product.slug)}`;
            const isActive = selectedProduct?.slug === product.slug;

            return (
              <Link key={product.id} href={href} className={`admin-product-link ${isActive ? "is-active" : ""}`}>
                <strong>{product.title}</strong>
                <span>{product.slug}</span>
                <span>
                  {product.priceText ?? "가격 미확인"} · {product.visibility} · {product.stockState}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {selectedProduct ? (
        <article className="panel admin-product-card admin-product-editor-panel">
          <div className="admin-product-head">
            <div>
              <strong>{selectedProduct.title}</strong>
              <p className="plain-copy">{selectedProduct.slug}</p>
            </div>
            <div className="flag-row">
              <span>{selectedProduct.priceText ?? "가격 미확인"}</span>
              <span>{selectedProduct.visibility}</span>
              <span>{selectedProduct.stockState}</span>
            </div>
          </div>

          <form action={saveProductAction} className="admin-form-grid">
            <input type="hidden" name="sourceProductId" value={selectedProduct.id} />
            <input type="hidden" name="slug" value={selectedProduct.slug} />
            <input type="hidden" name="returnTo" value={selectedHref} />
            <label className="field field-wide">
              <span>상품명 override</span>
              <input name="title" defaultValue={selectedProduct.title} />
            </label>
            <label className="field">
              <span>정가</span>
              <input
                name="regularPriceValue"
                type="number"
                min="0"
                defaultValue={selectedProduct.regularPriceValue ?? selectedProduct.priceValue ?? undefined}
              />
            </label>
            <label className="field">
              <span>할인가</span>
              <input name="salePriceValue" type="number" min="0" defaultValue={selectedProduct.salePriceValue ?? undefined} />
            </label>
            <label className="field">
              <span>공개범위</span>
              <select name="visibility" defaultValue={selectedProduct.visibility}>
                <option value="public">공개</option>
                <option value="hidden">링크로만 접근</option>
                <option value="private">비공개</option>
              </select>
            </label>
            <label className="field">
              <span>판매 상태</span>
              <select name="stockState" defaultValue={selectedProduct.stockState}>
                <option value="available">판매 가능</option>
                <option value="reserved">예약중</option>
                <option value="soldout">판매완료</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>대표 이미지 URL</span>
              <input name="imageUrl" defaultValue={selectedProduct.imageUrl ?? ""} />
            </label>
            <AdminHtmlEditor
              label="요약 override"
              name="excerptHtml"
              initialHtml={selectedProduct.excerptHtml}
              minHeight={180}
            />
            <AdminHtmlEditor
              label="본문 override"
              name="contentHtml"
              initialHtml={selectedProduct.contentHtml}
              minHeight={320}
            />
            <button type="submit" className="action-button">
              저장
            </button>
          </form>
        </article>
      ) : null}
    </section>
  );
}

````

</details>

<details><summary><code>app/admin/(dashboard)/assets/page.tsx</code> — 전체 51줄</summary>

````tsx
import { uploadAssetAction } from "@/app/admin/actions";
import { listAdminAssets } from "@/lib/admin-store";

export default async function AdminAssetsPage({
  searchParams
}: {
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const [assets, params] = await Promise.all([listAdminAssets(), searchParams]);
  const uploadedCount = Number(params.uploaded ?? "0");

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Assets</p>
        <h1>이미지 업로드</h1>
        <form action={uploadAssetAction} className="admin-form-grid">
          <label className="field field-wide">
            <span>파일</span>
            <input type="file" name="file" accept="image/*,.pdf,.zip" multiple required />
          </label>
          <label className="field field-wide">
            <span>Cloudinary 폴더</span>
            <input name="folder" placeholder="기본값: aloha-clone" />
          </label>
          <button type="submit" className="action-button">
            업로드
          </button>
          {uploadedCount > 0 ? <p className="inline-note">{uploadedCount}개 업로드가 완료되었습니다.</p> : null}
          {params.error === "1" ? <p className="warning-text">업로드할 파일을 선택해 주세요.</p> : null}
        </form>
      </section>

      <section className="panel">
        <h2>최근 업로드</h2>
        <div className="admin-list">
          {assets.map((asset) => (
            <article key={asset.id} className="admin-list-card">
              <strong>{asset.originalFilename ?? asset.publicId}</strong>
              <a href={asset.secureUrl} target="_blank" rel="noreferrer">
                {asset.secureUrl}
              </a>
            </article>
          ))}
          {assets.length === 0 ? <p className="empty-state">업로드된 자산이 아직 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}

````

</details>

## F. UI에 영향을 주는 서버 액션·API·데이터 모델

리뷰어가 보이는 상태가 어떤 데이터와 권한 규칙으로 만들어지는지 추측하지 않도록 관련 구현을 붙인다.

<details><summary><code>app/admin/actions.ts</code> — 전체 406줄</summary>

````ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, createAdminSession, requireAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { isUploadableFile, uploadAdminFiles } from "@/lib/admin-uploads";
import { getAdminPostById, saveAdminPost, saveAdminProductOverride, saveAdminSetting } from "@/lib/admin-store";
import { getProductBySlug, getProducts } from "@/lib/site-data";

const productCommonIntroSettingKey = "product_common_intro_html";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePathInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const compact = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return compact.replace(/\/+$/, "") || "/";
}

function formatDatePath(value: string) {
  const parsed = new Date(value);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `/${year}/${month}`;
}

function buildRedirectPath(returnTo: string, fallback: string, params: Record<string, string>) {
  const candidate = returnTo.trim();
  const safeBase = candidate.startsWith("/") ? candidate : fallback;
  const url = new URL(safeBase, "http://localhost");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return `${url.pathname}${url.search}`;
}

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!(await verifyAdminPassword(password))) {
    redirect("/loginpage?error=1");
  }

  await createAdminSession();
  redirect("/loginpage");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/loginpage");
}

export async function savePostAction(formData: FormData) {
  await requireAdminSession();

  const id = Number(formData.get("id") ?? 0) || null;
  const rawSourceId = String(formData.get("sourceId") ?? "").trim();
  const sourceIdValue = rawSourceId ? Number(rawSourceId) : Number.NaN;
  const sourceId = Number.isFinite(sourceIdValue) ? sourceIdValue : null;
  const contentType = formData.get("contentType") === "page" ? "page" : "post";
  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const publishedAt = String(formData.get("publishedAt") ?? new Date().toISOString());
  const rawVisibility = String(formData.get("visibility") ?? "public");
  const visibility = (["public", "hidden", "private", "password"] as const).includes(
    rawVisibility as "public" | "hidden" | "private" | "password"
  )
    ? (rawVisibility as "public" | "hidden" | "private" | "password")
    : "private";
  const accessPassword = String(formData.get("accessPassword") ?? "").trim();
  const listedInArchive = formData.get("listedInArchive") === "on";
  const listedInSearch = formData.get("listedInSearch") === "on";
  const allowIndexing = formData.get("allowIndexing") === "on";
  const intent = String(formData.get("intent") ?? "");
  const publicationStatus = intent === "publish"
    ? "published"
    : intent === "draft"
      ? "draft"
      : formData.get("publicationStatus") === "published"
        ? "published"
        : "draft";
  const excerptHtml = String(formData.get("excerptHtml") ?? "");
  const contentHtml = String(formData.get("contentHtml") ?? "");
  const customPath = normalizePathInput(String(formData.get("path") ?? ""));
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!title || (contentType === "post" && !contentHtml.trim())) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "required" }));
  }

  if (visibility === "password" && !accessPassword) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "password" }));
  }

  const slug = slugify(rawSlug || title);
  const path = customPath || (contentType === "page" ? `/${slug}` : `${formatDatePath(publishedAt)}/${slug}`);
  const previousPost = id ? await getAdminPostById(id) : null;

  const savedPost = await saveAdminPost({
    id,
    contentType,
    sourceId,
    slug,
    path,
    title,
    excerptHtml,
    contentHtml,
    publishedAt,
    visibility,
    accessPassword: visibility === "password" ? accessPassword : null,
    listedInArchive: contentType === "page" || visibility === "private" ? false : listedInArchive,
    publicationStatus,
    listedInSearch: visibility === "private" || visibility === "password" ? false : listedInSearch,
    allowIndexing: visibility === "public" ? allowIndexing : false
  });

  if (!savedPost) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/page/[page]", "page");
  revalidatePath("/column");
  if (previousPost?.path && previousPost.path !== path) revalidatePath(previousPost.path);
  revalidatePath(path);
  revalidatePath("/sitemap.xml");
  redirect(buildRedirectPath(`/loginpage/posts/edit/${savedPost.id}`, "/loginpage/posts", { saved: publicationStatus }));
}

export async function duplicatePostAction(formData: FormData) {
  await requireAdminSession();
  const sourceId = Number(formData.get("id") ?? 0);
  const source = sourceId ? await getAdminPostById(sourceId) : null;
  if (!source) {
    redirect("/loginpage/posts?error=missing");
  }
  const suffix = Date.now().toString(36);
  const copy = await saveAdminPost({
    contentType: source.contentType,
    sourceId: null,
    slug: `${source.slug}-copy-${suffix}`,
    path: `${source.path}-copy-${suffix}`,
    title: `${source.title} (복사본)`,
    excerptHtml: source.excerptHtml,
    contentHtml: source.contentHtml,
    publishedAt: new Date().toISOString(),
    visibility: "private",
    accessPassword: null,
    listedInArchive: false,
    publicationStatus: "draft",
    listedInSearch: false,
    allowIndexing: false
  });
  revalidatePath("/loginpage/posts");
  redirect(copy ? `/loginpage/posts/edit/${copy.id}?copied=1` : "/loginpage/posts?error=copy");
}

export async function setPostPublicationAction(formData: FormData) {
  await requireAdminSession();
  const id = Number(formData.get("id") ?? 0);
  const publicationStatus = formData.get("publicationStatus") === "published" ? "published" : "draft";
  const post = id ? await getAdminPostById(id) : null;
  if (!post) {
    redirect("/loginpage/posts?error=missing");
  }
  const savedPost = await saveAdminPost({
    ...post,
    id: post.id,
    publicationStatus
  });
  if (!savedPost) {
    redirect("/loginpage/posts?error=save");
  }
  revalidatePath("/");
  revalidatePath("/page/[page]", "page");
  revalidatePath("/column");
  revalidatePath(post.path);
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  redirect(`/loginpage/posts?status=${publicationStatus}`);
}

export async function saveProductAction(formData: FormData) {
  await requireAdminSession();

  const overrideId = Number(formData.get("overrideId") ?? 0) || null;
  const originalSlug = slugify(String(formData.get("originalSlug") ?? ""));
  const slug = slugify(String(formData.get("slug") ?? ""));
  const sourceProductId = Number(formData.get("sourceProductId") ?? 0) || null;
  const page = Math.max(1, Number(formData.get("page") ?? 1) || 1);
  const editPath = `/loginpage/products/edit/${encodeURIComponent(originalSlug || slug)}`;
  const errorReturnTo = page > 1 ? `${editPath}?page=${page}` : editPath;
  const rawVisibility = String(formData.get("visibility") ?? "public");
  const visibility = (["public", "hidden", "private"] as const).includes(
    rawVisibility as "public" | "hidden" | "private"
  )
    ? (rawVisibility as "public" | "hidden" | "private")
    : "private";
  const rawStockState = String(formData.get("stockState") ?? "available");
  const stockState = (["available", "reserved", "soldout"] as const).includes(
    rawStockState as "available" | "reserved" | "soldout"
  )
    ? (rawStockState as "available" | "reserved" | "soldout")
    : "available";
  const parsePrice = (value: FormDataEntryValue | null) => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  if (!slug) {
    redirect(buildRedirectPath(errorReturnTo, "/loginpage/products", { error: "slug" }));
  }

  try {
    await saveAdminProductOverride({
      id: overrideId,
      sourceProductId,
      slug,
      title: String(formData.get("title") ?? ""),
      excerptHtml: String(formData.get("excerptHtml") ?? ""),
      contentHtml: String(formData.get("contentHtml") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      regularPriceValue: parsePrice(formData.get("regularPriceValue")),
      salePriceValue: parsePrice(formData.get("salePriceValue")),
      visibility,
      stockState
    });
  } catch (error) {
    console.error("[save-product]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(errorReturnTo, "/loginpage/products", { error: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  if (originalSlug) revalidatePath(`/product/${originalSlug}`);
  revalidatePath(`/product/${slug}`);
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/loginpage/products");
  revalidatePath("/loginpage/products/page/[page]", "page");
  revalidatePath("/sitemap.xml");
  const savedPath = `/loginpage/products/edit/${encodeURIComponent(slug)}`;
  redirect(buildRedirectPath(page > 1 ? `${savedPath}?page=${page}` : savedPath, savedPath, { saved: "1" }));
}

export async function duplicateProductAction(formData: FormData) {
  await requireAdminSession();

  const sourceSlug = String(formData.get("slug") ?? "").trim();
  const page = Math.max(1, Number(formData.get("currentPage") ?? 1) || 1);
  const listPath = page > 1 ? `/loginpage/products/page/${page}` : "/loginpage/products";
  const source = sourceSlug
    ? await getProductBySlug(sourceSlug, { includeHidden: true, includePrivate: true })
    : null;

  if (!source) {
    redirect(buildRedirectPath(listPath, "/loginpage/products", { error: "missing" }));
  }

  const copySlug = `${source.slug}-copy-${Date.now().toString(36)}`;
  try {
    await saveAdminProductOverride({
      sourceProductId: null,
      slug: copySlug,
      title: source.title,
      excerptHtml: source.excerptHtml,
      contentHtml: source.contentHtml,
      imageUrl: source.imageUrl,
      regularPriceValue: source.regularPriceValue,
      salePriceValue: source.salePriceValue,
      visibility: "private",
      stockState: source.stockState
    });
  } catch (error) {
    console.error("[duplicate-product]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(listPath, "/loginpage/products", { error: "copy" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/loginpage/products");
  revalidatePath("/loginpage/products/page/[page]", "page");
  revalidatePath("/sitemap.xml");
  const editPath = `/loginpage/products/edit/${encodeURIComponent(copySlug)}`;
  redirect(buildRedirectPath(page > 1 ? `${editPath}?page=${page}` : editPath, editPath, { copied: "1" }));
}

export async function saveProductCommonIntroAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = String(formData.get("returnTo") ?? "");

  try {
    await saveAdminSetting({
      key: productCommonIntroSettingKey,
      value: String(formData.get("value") ?? "")
    });
  } catch (error) {
    console.error("[save-product-common-intro]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(returnTo, "/loginpage/products/common", { error: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/sitemap.xml");
  redirect(buildRedirectPath(returnTo, "/loginpage/products/common", { introSaved: "1" }));
}

export async function bulkUpdateProductAction(formData: FormData) {
  await requireAdminSession();

  const returnTo = String(formData.get("returnTo") ?? "");
  const selectedSlugs = formData
    .getAll("selectedSlug")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const visibility = String(formData.get("visibility") ?? "").trim() as "" | "public" | "hidden" | "private";
  const stockState = String(formData.get("stockState") ?? "").trim() as "" | "available" | "reserved" | "soldout";

  if (selectedSlugs.length === 0) {
    redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkError: "selection" }));
  }

  if (!visibility && !stockState) {
    redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkError: "action" }));
  }

  const products = await getProducts({ includeHidden: true, includePrivate: true });
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  let updatedCount = 0;

  try {
    for (const slug of selectedSlugs) {
      const product = productsBySlug.get(slug);
      if (!product) {
        continue;
      }

      await saveAdminProductOverride({
        id: product.overrideId,
        sourceProductId: product.sourceProductId,
        slug: product.slug,
        title: product.title,
        excerptHtml: product.excerptHtml,
        contentHtml: product.contentHtml,
        imageUrl: product.imageUrl,
        regularPriceValue: product.regularPriceValue,
        salePriceValue: product.salePriceValue,
        visibility: visibility || product.visibility,
        stockState: stockState || product.stockState
      });
      updatedCount += 1;
    }
  } catch (error) {
    console.error("[bulk-save-products]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkError: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/loginpage/products");
  revalidatePath("/loginpage/products/page/[page]", "page");
  revalidatePath("/sitemap.xml");

  redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkSaved: String(updatedCount) }));
}

export async function uploadAssetAction(formData: FormData) {
  await requireAdminSession();

  const files = formData
    .getAll("file")
    .filter((value): value is File => isUploadableFile(value) && value.size > 0);

  if (files.length === 0) {
    redirect("/loginpage/assets?error=1");
  }

  const folderOverride = String(formData.get("folder") ?? "").trim();
  try {
    await uploadAdminFiles(files, folderOverride);
  } catch (error) {
    console.error("[upload-asset]", error instanceof Error ? error.message : "Unknown upload error");
    redirect("/loginpage/assets?error=save");
  }
  redirect(`/loginpage/assets?uploaded=${files.length}`);
}

````

</details>

<details><summary><code>app/api/admin/context/route.ts</code> — 전체 83줄</summary>

````ts
import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminPostByPathRequired } from "@/lib/admin-store";
import type { AdminPostRecord } from "@/lib/admin-store";
import { ensureAdminContentCatalog } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow"
  };
}

function normalizePathname(value: string | null) {
  if (!value || !value.startsWith("/") || value.length > 500) {
    return "/";
  }
  return value === "/" ? value : `/${value.replace(/^\/+|\/+$/g, "")}`;
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new Response(null, { status: 204, headers: noStoreHeaders() });
  }

  const pathname = normalizePathname(request.nextUrl.searchParams.get("path"));
  const productMatch = pathname.match(/^\/product\/([^/]+)$/);

  if (productMatch) {
    let slug = productMatch[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      // Keep the normalized path segment when it contains malformed escaping.
    }
    return NextResponse.json(
      {
        editHref: `/loginpage/products/edit/${encodeURIComponent(slug)}`,
        editLabel: "이 상품 편집",
        contentLabel: `상품 · ${slug}`,
        listHref: "/loginpage/products",
        listLabel: "상품 관리"
      },
      { headers: noStoreHeaders() }
    );
  }

  let content: AdminPostRecord | null = null;
  if (pathname !== "/") {
    try {
      content = await getAdminPostByPathRequired(pathname);
      if (!content) {
        const catalog = await ensureAdminContentCatalog();
        const normalized = pathname.replace(/\/+$/, "");
        content =
          catalog.find((record) => record.path.replace(/\/+$/, "") === normalized) ??
          catalog.find((record) => record.slug === pathname.split("/").filter(Boolean).at(-1)) ??
          null;
      }
    } catch (error) {
      console.error("[admin-public-context]", error instanceof Error ? error.message : "Unknown database error");
    }
  }

  const isProductArea = pathname === "/shop" || pathname.startsWith("/shop/");
  const listHref = isProductArea ? "/loginpage/products" : "/loginpage/posts";
  const listLabel = isProductArea ? "상품 관리" : "글·페이지 관리";

  return NextResponse.json(
    {
      editHref: content ? `/loginpage/posts/edit/${content.id}` : null,
      editLabel: content ? "이 내용 편집" : null,
      contentLabel: content ? `${content.contentType === "page" ? "페이지" : "글"} · ${content.title}` : null,
      listHref,
      listLabel
    },
    { headers: noStoreHeaders() }
  );
}

````

</details>

<details><summary><code>app/api/admin/uploads/route.ts</code> — 전체 30줄</summary>

````ts
import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isUploadableFile, uploadAdminFiles } from "@/lib/admin-uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => isUploadableFile(value) && value.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "no-files" }, { status: 400 });
  }

  try {
    const uploads = await uploadAdminFiles(files, String(formData.get("folder") ?? ""));
    return NextResponse.json({ provider: "cloudinary", uploads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload-failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

````

</details>

<details><summary><code>app/api/orders/route.ts</code> — 전체 92줄</summary>

````ts
import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { saveAdminOrder } from "@/lib/admin-store";
import type { StoredOrder, StoredOrderItem } from "@/lib/purchase-flow";

function buildOrderId() {
  return randomUUID();
}

function buildOrderKey() {
  return `wc_order_${randomBytes(18).toString("base64url")}`;
}

function isStockState(value: unknown): value is "available" | "reserved" | "soldout" {
  return value === "available" || value === "reserved" || value === "soldout";
}

function normalizeItem(input: unknown) {
  if (!input || typeof input !== "object") {
    return null as StoredOrderItem | null;
  }

  const item = input as Record<string, unknown>;
  const quantity = Number(item.quantity ?? 0);
  const lineTotal = Number(item.lineTotal ?? 0);

  if (!Number.isFinite(quantity) || quantity < 1 || !String(item.slug ?? "").trim() || !String(item.title ?? "").trim()) {
    return null as StoredOrderItem | null;
  }

  return {
    id: Number(item.id ?? 0),
    slug: String(item.slug),
    title: String(item.title),
    excerpt: String(item.excerpt ?? ""),
    priceText: item.priceText === null || item.priceText === undefined ? null : String(item.priceText),
    priceValue:
      item.priceValue === null || item.priceValue === undefined || item.priceValue === ""
        ? null
        : Number(item.priceValue),
    imageUrl: item.imageUrl === null || item.imageUrl === undefined ? null : String(item.imageUrl),
    reviewCount: Number(item.reviewCount ?? 0),
    stockState: isStockState(item.stockState) ? item.stockState : undefined,
    quantity,
    lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0
  };
}

function isStoredOrderItem(value: StoredOrderItem | null): value is StoredOrderItem {
  return value !== null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items.map(normalizeItem).filter(isStoredOrderItem) : [];
    const customerName = String(body.customerName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const memo = String(body.memo ?? "").trim();

    if (!customerName || !email || items.length === 0) {
      return NextResponse.json({ error: "주문 정보를 다시 확인해 주세요." }, { status: 400 });
    }

    const totalValue = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const order: StoredOrder = {
      id: buildOrderId(),
      key: buildOrderKey(),
      createdAt: new Date().toISOString(),
      customerName,
      email,
      phone,
      memo,
      items,
      totalValue,
      totalText: String(body.totalText ?? "")
    };

    const savedOrder = await saveAdminOrder(order);
    if (!savedOrder) {
      return NextResponse.json({ error: "주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }

    return NextResponse.json({ order: savedOrder });
  } catch {
    return NextResponse.json({ error: "주문 처리 중 문제가 발생했습니다." }, { status: 500 });
  }
}

````

</details>

<details><summary><code>app/api/posts/unlock/route.ts</code> — 전체 56줄</summary>

````ts
import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPageByPath, getPostByPath } from "@/lib/site-data";

type Attempt = {
  count: number;
  resetAt: number;
};

declare global {
  var __alohaPostUnlockAttempts__: Map<string, Attempt> | undefined;
}

const attempts = globalThis.__alohaPostUnlockAttempts__ ?? new Map<string, Attempt>();
globalThis.__alohaPostUnlockAttempts__ = attempts;

function passwordsMatch(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = (await request.json().catch(() => null)) as { path?: string; password?: string } | null;
  const path = body?.path?.trim() ?? "";
  const password = body?.password ?? "";
  const key = `${forwardedFor}:${path}`;
  const now = Date.now();
  const previous = attempts.get(key);
  const attempt = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + 10 * 60_000 };

  if (attempt.count >= 8) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const post = path ? await getPostByPath(path) : null;
  const page = !post && path ? await getPageByPath(path) : null;
  const content = post ?? page;
  if (!content || content.visibility !== "password" || !content.accessPassword || !passwordsMatch(password, content.accessPassword)) {
    attempts.set(key, { ...attempt, count: attempt.count + 1 });
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  attempts.delete(key);
  const coverImageUrl =
    post?.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;
  return NextResponse.json(
    { title: content.title, contentHtml: content.contentHtml, coverImageUrl },
    { headers: { "cache-control": "private, no-store" } }
  );
}

````

</details>

<details><summary><code>lib/admin-auth.ts</code> — 전체 121줄</summary>

````ts
import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/server-env";

const adminSessionCookie = "aloha_admin_session";
const sessionDurationSeconds = 60 * 60 * 24 * 30;

type AdminSessionPayload = {
  sub: "admin";
  exp: number;
};

function getAdminPassword() {
  return getServerEnv("ADMIN_PASSWORD") ?? getServerEnv("SUPABASE_DB_PASSWORD");
}

function getAdminSessionSecret() {
  return (
    getServerEnv("ADMIN_SESSION_SECRET") ??
    getServerEnv("SUPABASE_DB_PASSWORD") ??
    getServerEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    "aloha-admin-session"
  );
}

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSession(value: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("base64url");
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readSessionPayload(token: string | undefined) {
  if (!token) {
    return null as AdminSessionPayload | null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null as AdminSessionPayload | null;
  }

  const expectedSignature = signSession(encodedPayload);
  if (!safeEquals(signature, expectedSignature)) {
    return null as AdminSessionPayload | null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as AdminSessionPayload;
    if (payload.sub !== "admin" || payload.exp < Date.now()) {
      return null as AdminSessionPayload | null;
    }

    return payload;
  } catch {
    return null as AdminSessionPayload | null;
  }
}

export async function verifyAdminPassword(input: string) {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }

  return safeEquals(input, expected);
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  const payload: AdminSessionPayload = {
    sub: "admin",
    exp: Date.now() + sessionDurationSeconds * 1000
  };
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const token = `${encodedPayload}.${signSession(encodedPayload)}`;

  cookieStore.set(adminSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return Boolean(readSessionPayload(cookieStore.get(adminSessionCookie)?.value));
}

export async function requireAdminSession() {
  if (!(await isAdminAuthenticated())) {
    redirect("/loginpage");
  }
}

````

</details>

<details><summary><code>lib/admin-db.ts</code> — 전체 356줄</summary>

````ts
import dns from "node:dns";

import { Pool } from "pg";

import { getServerEnv } from "@/lib/server-env";

declare global {
  var __alohaPgPool__: Pool | undefined;
  var __alohaPgConnectionString__: string | undefined;
  var __alohaPgSchemaReady__: boolean | undefined;
  var __alohaPgRetryAt__: number | undefined;
  var __alohaPgErrorLogged__: boolean | undefined;
}

dns.setDefaultResultOrder("ipv4first");

const retryableConnectionCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "57P01",
  "57P02",
  "57P03"
]);

function getConnectionString() {
  return getServerEnv("SUPABASE_DATABASE_URL") ?? getServerEnv("SUPABASE_DIRECT_URL");
}

function isRetryableConnectionError(error: unknown) {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === "string" ? record.code : "";
  const message = error instanceof Error ? error.message : String(error);

  return (
    retryableConnectionCodes.has(code) ||
    code.startsWith("08") ||
    /connection terminated|connection timeout|connect_timeout|socket hang up|client has already been connected|cannot connect now/i.test(
      message
    )
  );
}

function recyclePool() {
  const pool = globalThis.__alohaPgPool__;
  globalThis.__alohaPgPool__ = undefined;
  globalThis.__alohaPgConnectionString__ = undefined;
  globalThis.__alohaPgSchemaReady__ = false;
  if (pool) {
    void pool.end().catch(() => undefined);
  }
}

function getPool() {
  if (process.env.ALOHA_SKIP_ADMIN_DB === "1") {
    return null as Pool | null;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    return null as Pool | null;
  }

  if (
    globalThis.__alohaPgPool__ &&
    globalThis.__alohaPgConnectionString__ !== connectionString
  ) {
    recyclePool();
  }

  if (!globalThis.__alohaPgPool__) {
    const pool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      query_timeout: 8_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      ssl: { rejectUnauthorized: false }
    });
    pool.on("error", (error) => {
      console.error("[admin-db-pool]", error.message);
      if (globalThis.__alohaPgPool__ === pool) {
        recyclePool();
      }
    });
    globalThis.__alohaPgPool__ = pool;
    globalThis.__alohaPgConnectionString__ = connectionString;
  }

  return globalThis.__alohaPgPool__;
}

async function ensureSchema(pool: Pool) {
  if (globalThis.__alohaPgSchemaReady__) {
    return;
  }

  await pool.query(`
    create table if not exists clone_posts (
      id bigserial primary key,
      slug text not null,
      path text not null unique,
      title text not null,
      excerpt_html text not null default '',
      content_html text not null default '',
      published_at timestamptz not null default now(),
      visibility text not null default 'public' check (visibility in ('public', 'hidden', 'private', 'password')),
      access_password text,
      listed_in_archive boolean not null default true,
      publication_status text not null default 'published' check (publication_status in ('draft', 'published')),
      listed_in_search boolean not null default true,
      allow_indexing boolean not null default true,
      content_type text not null default 'post' check (content_type in ('post', 'page')),
      source_id bigint,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table if exists clone_posts
      add column if not exists publication_status text not null default 'published';
    alter table if exists clone_posts
      add column if not exists listed_in_search boolean not null default true;
    alter table if exists clone_posts
      add column if not exists allow_indexing boolean not null default true;
    alter table if exists clone_posts
      add column if not exists content_type text not null default 'post';
    alter table if exists clone_posts
      add column if not exists source_id bigint;

    create unique index if not exists clone_posts_source_unique
      on clone_posts (content_type, source_id)
      where source_id is not null;

    create table if not exists clone_products (
      id bigserial primary key,
      source_product_id bigint unique,
      slug text not null unique,
      title text,
      excerpt_html text,
      content_html text,
      image_url text,
      regular_price bigint,
      sale_price bigint,
      visibility text not null default 'public' check (visibility in ('public', 'hidden', 'private')),
      stock_state text not null default 'available' check (stock_state in ('available', 'reserved', 'soldout')),
      updated_at timestamptz not null default now()
    );

    create table if not exists clone_assets (
      id bigserial primary key,
      public_id text not null unique,
      secure_url text not null,
      original_filename text,
      created_at timestamptz not null default now()
    );

    create table if not exists clone_settings (
      key text primary key,
      value text not null default '',
      updated_at timestamptz not null default now()
    );

    create table if not exists clone_orders (
      id text primary key,
      order_key text not null unique,
      created_at timestamptz not null default now(),
      customer_name text not null default '',
      email text not null default '',
      phone text not null default '',
      memo text not null default '',
      total_value bigint not null default 0,
      total_text text not null default '',
      status text not null default 'pending' check (status in ('pending', 'paid', 'done', 'cancelled'))
    );

    create table if not exists clone_order_items (
      id bigserial primary key,
      order_id text not null references clone_orders(id) on delete cascade,
      product_id bigint,
      slug text not null,
      title text not null,
      excerpt text not null default '',
      price_text text,
      price_value bigint,
      image_url text,
      review_count integer not null default 0,
      stock_state text check (stock_state in ('available', 'reserved', 'soldout')),
      quantity integer not null default 1,
      line_total bigint not null default 0
    );

    alter table if exists public.clone_posts enable row level security;
    alter table if exists public.clone_products enable row level security;
    alter table if exists public.clone_assets enable row level security;
    alter table if exists public.clone_settings enable row level security;
    alter table if exists public.clone_orders enable row level security;
    alter table if exists public.clone_order_items enable row level security;

    revoke all on table public.clone_posts from anon, authenticated;
    revoke all on table public.clone_products from anon, authenticated;
    revoke all on table public.clone_assets from anon, authenticated;
    revoke all on table public.clone_settings from anon, authenticated;
    revoke all on table public.clone_orders from anon, authenticated;
    revoke all on table public.clone_order_items from anon, authenticated;

    revoke all on all sequences in schema public from anon, authenticated;
    alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
    alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
  `);

  globalThis.__alohaPgSchemaReady__ = true;
}

async function runWithConnectionRetry<T>(work: (pool: Pool) => Promise<T>, preflight: boolean) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const pool = getPool();
    if (!pool) {
      throw new Error("Admin database is not configured.");
    }

    try {
      if (preflight) {
        await pool.query("select 1");
      }
      await ensureSchema(pool);
      return await work(pool);
    } catch (error) {
      lastError = error;
      if (attempt === 0 && isRetryableConnectionError(error)) {
        recyclePool();
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export async function withAdminDb<T>(work: (pool: Pool) => Promise<T>, fallback: T) {
  if ((globalThis.__alohaPgRetryAt__ ?? 0) > Date.now()) {
    return fallback;
  }
  if (!getConnectionString() || process.env.ALOHA_SKIP_ADMIN_DB === "1") {
    return fallback;
  }

  try {
    const result = await runWithConnectionRetry(work, false);
    globalThis.__alohaPgRetryAt__ = undefined;
    globalThis.__alohaPgErrorLogged__ = false;
    return result;
  } catch (error) {
    globalThis.__alohaPgRetryAt__ = Date.now() + 15_000;
    if (!globalThis.__alohaPgErrorLogged__) {
      console.error("[admin-db]", error);
      globalThis.__alohaPgErrorLogged__ = true;
    }
    return fallback;
  }
}

export async function withRequiredAdminDb<T>(work: (pool: Pool) => Promise<T>) {
  try {
    const result = await runWithConnectionRetry(work, true);
    globalThis.__alohaPgRetryAt__ = undefined;
    globalThis.__alohaPgErrorLogged__ = false;
    return result;
  } catch (error) {
    globalThis.__alohaPgRetryAt__ = Date.now() + 15_000;
    throw error;
  }
}

export type AdminDbHealthStatus = {
  available: boolean;
  checkedAt: string;
  lastCronSuccessAt: string | null;
  connectionMode: "supavisor-transaction" | "supavisor-session" | "direct" | "unconfigured";
};

function getConnectionMode(): AdminDbHealthStatus["connectionMode"] {
  const connectionString = getConnectionString();
  if (!connectionString) return "unconfigured";

  try {
    const parsed = new URL(connectionString);
    if (parsed.hostname.includes("pooler.supabase.com") && parsed.port === "6543") {
      return "supavisor-transaction";
    }
    if (parsed.hostname.includes("pooler.supabase.com")) {
      return "supavisor-session";
    }
  } catch {}

  return "direct";
}

export async function recordAdminDbHeartbeat() {
  const checkedAt = new Date().toISOString();
  return withRequiredAdminDb(async (pool) => {
    await pool.query("select id from clone_products limit 1");
    await pool.query("select id from clone_posts limit 1");
    await pool.query(
      `
        insert into clone_settings (key, value, updated_at)
        values ('supabase_health_last_success', $1, now())
        on conflict (key) do update
        set value = excluded.value, updated_at = now()
      `,
      [checkedAt]
    );

    return {
      ok: true as const,
      checkedAt,
      connectionMode: getConnectionMode()
    };
  });
}

export async function getAdminDbHealthStatus(): Promise<AdminDbHealthStatus> {
  const checkedAt = new Date().toISOString();
  const connectionMode = getConnectionMode();
  const fallback: AdminDbHealthStatus = {
    available: false,
    checkedAt,
    lastCronSuccessAt: null,
    connectionMode
  };

  return withAdminDb(async (pool) => {
    await pool.query("select 1");
    const result = await pool.query(
      "select value from clone_settings where key = 'supabase_health_last_success' limit 1"
    );
    const value = result.rows[0]?.value;
    const lastCronSuccessAt =
      typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

    return {
      available: true,
      checkedAt,
      lastCronSuccessAt,
      connectionMode
    };
  }, fallback);
}

````

</details>

<details><summary><code>lib/admin-store.ts</code> — 전체 754줄</summary>

````ts
import { withAdminDb, withRequiredAdminDb } from "@/lib/admin-db";
import type { StoredOrder, StoredOrderItem } from "@/lib/purchase-flow";

export type AdminPostRecord = {
  id: number;
  contentType: "post" | "page";
  sourceId: number | null;
  slug: string;
  path: string;
  title: string;
  excerptHtml: string;
  contentHtml: string;
  publishedAt: string;
  visibility: "public" | "hidden" | "private" | "password";
  accessPassword: string | null;
  listedInArchive: boolean;
  publicationStatus: "draft" | "published";
  listedInSearch: boolean;
  allowIndexing: boolean;
  updatedAt: string;
};

export type AdminProductOverride = {
  id: number;
  sourceProductId: number | null;
  slug: string;
  title: string | null;
  excerptHtml: string | null;
  contentHtml: string | null;
  imageUrl: string | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
  visibility: "public" | "hidden" | "private";
  stockState: "available" | "reserved" | "soldout";
  updatedAt: string | null;
};

export type AdminAssetRecord = {
  id: number;
  publicId: string;
  secureUrl: string;
  originalFilename: string | null;
  createdAt: string;
};

export type AdminSettingRecord = {
  key: string;
  value: string;
  updatedAt: string | null;
};

export type AdminOrderRecord = StoredOrder & {
  status: "pending" | "paid" | "done" | "cancelled";
};

export type AdminPostInput = Omit<AdminPostRecord, "id" | "updatedAt"> & {
  id?: number | null;
};
type AdminProductInput = Omit<AdminProductOverride, "id" | "updatedAt"> & {
  id?: number | null;
};
type AdminOrderInput = StoredOrder & {
  status?: AdminOrderRecord["status"];
};

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapAdminPost(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    contentType: row.content_type === "page" ? "page" : "post",
    sourceId: row.source_id === null || row.source_id === undefined ? null : Number(row.source_id),
    slug: String(row.slug),
    path: String(row.path),
    title: String(row.title),
    excerptHtml: String(row.excerpt_html ?? ""),
    contentHtml: String(row.content_html ?? ""),
    publishedAt: row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at),
    visibility: row.visibility as AdminPostRecord["visibility"],
    accessPassword: row.access_password === null ? null : String(row.access_password),
    listedInArchive: Boolean(row.listed_in_archive),
    publicationStatus: row.publication_status === "draft" ? "draft" : "published",
    listedInSearch: Boolean(row.listed_in_search),
    allowIndexing: Boolean(row.allow_indexing),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
  } as AdminPostRecord;
}

function toNumberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapAdminProductOverride(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    sourceProductId: row.source_product_id === null ? null : Number(row.source_product_id),
    slug: String(row.slug),
    title: row.title === null ? null : String(row.title),
    excerptHtml: row.excerpt_html === null ? null : String(row.excerpt_html),
    contentHtml: row.content_html === null ? null : String(row.content_html),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    regularPriceValue: row.regular_price === null ? null : Number(row.regular_price),
    salePriceValue: row.sale_price === null ? null : Number(row.sale_price),
    visibility: row.visibility as AdminProductOverride["visibility"],
    stockState: row.stock_state as AdminProductOverride["stockState"],
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
  } as AdminProductOverride;
}

function mapStoredOrderItem(row: Record<string, unknown>) {
  return {
    id: row.product_id === null ? 0 : Number(row.product_id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    priceText: row.price_text === null ? null : String(row.price_text),
    priceValue: row.price_value === null ? null : Number(row.price_value),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    reviewCount: Number(row.review_count ?? 0),
    stockState:
      row.stock_state === "available" || row.stock_state === "reserved" || row.stock_state === "soldout"
        ? row.stock_state
        : undefined,
    quantity: Number(row.quantity ?? 1),
    lineTotal: Number(row.line_total ?? 0)
  } as StoredOrderItem;
}

function mapStoredOrder(
  row: Record<string, unknown>,
  items: StoredOrderItem[],
  statusOverride?: AdminOrderRecord["status"]
) {
  return {
    id: String(row.id),
    key: String(row.order_key),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    customerName: String(row.customer_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    memo: String(row.memo ?? ""),
    items,
    totalValue: Number(row.total_value ?? 0),
    totalText: String(row.total_text ?? ""),
    status:
      statusOverride ??
      (row.status === "paid" || row.status === "done" || row.status === "cancelled" ? row.status : "pending")
  } as AdminOrderRecord;
}

async function listAdminContentByType(contentType?: AdminPostRecord["contentType"]) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, content_type, source_id, slug, path, title, excerpt_html, content_html, published_at,
               visibility, access_password, listed_in_archive, publication_status, listed_in_search,
               allow_indexing, updated_at
        from clone_posts
        where ($1::text is null or content_type = $1)
        order by published_at desc, id desc
      `,
      [contentType ?? null]
    );

    return result.rows.map(mapAdminPost);
  }, [] as AdminPostRecord[]);
}

async function listAdminContentByTypeRequired(contentType?: AdminPostRecord["contentType"]) {
  return withRequiredAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, content_type, source_id, slug, path, title, excerpt_html, content_html, published_at,
               visibility, access_password, listed_in_archive, publication_status, listed_in_search,
               allow_indexing, updated_at
        from clone_posts
        where ($1::text is null or content_type = $1)
        order by published_at desc, id desc
      `,
      [contentType ?? null]
    );

    return result.rows.map(mapAdminPost);
  });
}

export async function listAdminContent() {
  return listAdminContentByType();
}

export async function listAdminContentRequired() {
  return listAdminContentByTypeRequired();
}

export async function listAdminPosts() {
  return listAdminContentByType("post");
}

export async function listAdminPostsRequired() {
  return listAdminContentByTypeRequired("post");
}

export async function listAdminPages() {
  return listAdminContentByType("page");
}

export async function listAdminPagesRequired() {
  return listAdminContentByTypeRequired("page");
}

export async function getAdminPostById(id: number) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, content_type, source_id, slug, path, title, excerpt_html, content_html, published_at,
               visibility, access_password, listed_in_archive, publication_status, listed_in_search,
               allow_indexing, updated_at
        from clone_posts
        where id = $1
        limit 1
      `,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null as AdminPostRecord | null;
    return mapAdminPost(row);
  }, null as AdminPostRecord | null);
}

export async function getAdminPostByPathRequired(pathname: string) {
  const normalizedPath = pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}`;
  const pathVariants = normalizedPath === "/" ? [normalizedPath] : [normalizedPath, `${normalizedPath}/`];
  const slug = normalizedPath.split("/").filter(Boolean).at(-1) ?? "";

  return withRequiredAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, content_type, source_id, slug, path, title, excerpt_html, content_html, published_at,
               visibility, access_password, listed_in_archive, publication_status, listed_in_search,
               allow_indexing, updated_at
        from clone_posts
        where path = any($1::text[]) or ($2 <> '' and slug = $2)
        order by case when path = any($1::text[]) then 0 else 1 end, id desc
        limit 1
      `,
      [pathVariants, slug]
    );
    const row = result.rows[0];
    return row ? mapAdminPost(row) : null;
  });
}

export async function saveAdminPost(input: AdminPostInput) {
  return withAdminDb(async (pool) => {
    const values = [
      input.slug,
      input.path,
      input.title,
      input.excerptHtml,
      input.contentHtml,
      input.publishedAt,
      input.visibility,
      normalizeNullableText(input.accessPassword),
      input.listedInArchive,
      input.publicationStatus,
      input.listedInSearch,
      input.allowIndexing,
      input.contentType,
      input.sourceId
    ];
    const result = input.id
      ? await pool.query(
          `
            update clone_posts
            set slug = $1,
                path = $2,
                title = $3,
                excerpt_html = $4,
                content_html = $5,
                published_at = $6,
                visibility = $7,
                access_password = $8,
                listed_in_archive = $9,
                publication_status = $10,
                listed_in_search = $11,
                allow_indexing = $12,
                content_type = $13,
                source_id = $14,
                updated_at = now()
            where id = $15
            returning id, content_type, source_id, slug, path, title, excerpt_html, content_html,
                      published_at, visibility, access_password, listed_in_archive, publication_status,
                      listed_in_search, allow_indexing, updated_at
          `,
          [...values, input.id]
        )
      : await pool.query(
          `
        insert into clone_posts (
          slug, path, title, excerpt_html, content_html, published_at, visibility, access_password,
          listed_in_archive, publication_status, listed_in_search, allow_indexing, content_type, source_id, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
        on conflict (path) do update
        set
          slug = excluded.slug,
          title = excluded.title,
          excerpt_html = excluded.excerpt_html,
          content_html = excluded.content_html,
          published_at = excluded.published_at,
          visibility = excluded.visibility,
          access_password = excluded.access_password,
          listed_in_archive = excluded.listed_in_archive,
          publication_status = excluded.publication_status,
          listed_in_search = excluded.listed_in_search,
          allow_indexing = excluded.allow_indexing,
          content_type = excluded.content_type,
          source_id = coalesce(clone_posts.source_id, excluded.source_id),
          updated_at = now()
        returning id, content_type, source_id, slug, path, title, excerpt_html, content_html,
                  published_at, visibility, access_password, listed_in_archive, publication_status,
                  listed_in_search, allow_indexing, updated_at
      `,
          values
        );

    const row = result.rows[0];
    return mapAdminPost(row);
  }, null as AdminPostRecord | null);
}

export async function seedAdminContent(inputs: AdminPostInput[]) {
  if (inputs.length === 0) return 0;

  return withRequiredAdminDb(async (pool) => {
    const client = await pool.connect();
    let inserted = 0;
    try {
      await client.query("begin");
      for (const input of inputs) {
        const result = await client.query(
          `
            insert into clone_posts (
              slug, path, title, excerpt_html, content_html, published_at, visibility, access_password,
              listed_in_archive, publication_status, listed_in_search, allow_indexing,
              content_type, source_id, updated_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
            on conflict do nothing
            returning id
          `,
          [
            input.slug,
            input.path,
            input.title,
            input.excerptHtml,
            input.contentHtml,
            input.publishedAt,
            input.visibility,
            normalizeNullableText(input.accessPassword),
            input.listedInArchive,
            input.publicationStatus,
            input.listedInSearch,
            input.allowIndexing,
            input.contentType,
            input.sourceId
          ]
        );
        inserted += result.rowCount ?? 0;
      }
      await client.query("commit");
      return inserted;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });
}

export async function listAdminProductOverrides() {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, source_product_id, slug, title, excerpt_html, content_html, image_url, regular_price, sale_price, visibility, stock_state, updated_at
        from clone_products
        order by slug asc
      `
    );

    return result.rows.map(mapAdminProductOverride);
  }, [] as AdminProductOverride[]);
}

export async function listAdminProductOverridesRequired() {
  return withRequiredAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, source_product_id, slug, title, excerpt_html, content_html, image_url, regular_price, sale_price, visibility, stock_state, updated_at
        from clone_products
        order by slug asc
      `
    );

    return result.rows.map(mapAdminProductOverride);
  });
}

export async function saveAdminProductOverride(input: AdminProductInput) {
  return withRequiredAdminDb(async (pool) => {
    const values = [
      input.sourceProductId,
      input.slug,
      normalizeNullableText(input.title),
      normalizeNullableText(input.excerptHtml),
      normalizeNullableText(input.contentHtml),
      normalizeNullableText(input.imageUrl),
      toNumberOrNull(input.regularPriceValue),
      toNumberOrNull(input.salePriceValue),
      input.visibility,
      input.stockState
    ];
    const result = input.id
      ? await pool.query(
          `
            update clone_products
            set source_product_id = $1,
                slug = $2,
                title = $3,
                excerpt_html = $4,
                content_html = $5,
                image_url = $6,
                regular_price = $7,
                sale_price = $8,
                visibility = $9,
                stock_state = $10,
                updated_at = now()
            where id = $11
            returning id, source_product_id, slug, title, excerpt_html, content_html, image_url,
                      regular_price, sale_price, visibility, stock_state, updated_at
          `,
          [...values, input.id]
        )
      : await pool.query(
          `
        insert into clone_products (
          source_product_id, slug, title, excerpt_html, content_html, image_url,
          regular_price, sale_price, visibility, stock_state, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        on conflict (slug) do update
        set
          source_product_id = excluded.source_product_id,
          title = excluded.title,
          excerpt_html = excluded.excerpt_html,
          content_html = excluded.content_html,
          image_url = excluded.image_url,
          regular_price = excluded.regular_price,
          sale_price = excluded.sale_price,
          visibility = excluded.visibility,
          stock_state = excluded.stock_state,
          updated_at = now()
        returning id, source_product_id, slug, title, excerpt_html, content_html, image_url,
                  regular_price, sale_price, visibility, stock_state, updated_at
      `,
          values
        );

    const row = result.rows[0];
    if (!row) throw new Error("Product override was not saved.");
    return mapAdminProductOverride(row);
  });
}

export async function listAdminAssets() {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, public_id, secure_url, original_filename, created_at
        from clone_assets
        order by created_at desc, id desc
        limit 40
      `
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      publicId: row.public_id,
      secureUrl: row.secure_url,
      originalFilename: row.original_filename,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    })) as AdminAssetRecord[];
  }, [] as AdminAssetRecord[]);
}

export async function listAdminAssetsRequired() {
  return withRequiredAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, public_id, secure_url, original_filename, created_at
        from clone_assets
        order by created_at desc, id desc
        limit 40
      `
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      publicId: row.public_id,
      secureUrl: row.secure_url,
      originalFilename: row.original_filename,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    })) as AdminAssetRecord[];
  });
}

export async function saveAdminAsset(input: {
  publicId: string;
  secureUrl: string;
  originalFilename: string | null;
}) {
  return withRequiredAdminDb(async (pool) => {
    const result = await pool.query(
      `
        insert into clone_assets (public_id, secure_url, original_filename)
        values ($1, $2, $3)
        on conflict (public_id) do update
        set secure_url = excluded.secure_url,
            original_filename = excluded.original_filename
        returning id, public_id, secure_url, original_filename, created_at
      `,
      [input.publicId, input.secureUrl, normalizeNullableText(input.originalFilename)]
    );

    const row = result.rows[0];
    return {
      id: Number(row.id),
      publicId: row.public_id,
      secureUrl: row.secure_url,
      originalFilename: row.original_filename,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    } as AdminAssetRecord;
  });
}

export async function getAdminSetting(key: string) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select key, value, updated_at
        from clone_settings
        where key = $1
        limit 1
      `,
      [key]
    );

    const row = result.rows[0];
    if (!row) {
      return null as AdminSettingRecord | null;
    }

    return {
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    } as AdminSettingRecord;
  }, null as AdminSettingRecord | null);
}

export async function saveAdminSetting(input: { key: string; value: string }) {
  return withRequiredAdminDb(async (pool) => {
    const result = await pool.query(
      `
        insert into clone_settings (key, value, updated_at)
        values ($1, $2, now())
        on conflict (key) do update
        set value = excluded.value,
            updated_at = now()
        returning key, value, updated_at
      `,
      [input.key, input.value]
    );

    const row = result.rows[0];
    return {
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    } as AdminSettingRecord;
  });
}

export async function saveAdminOrder(input: AdminOrderInput) {
  return withAdminDb(async (pool) => {
    const client = await pool.connect();

    try {
      await client.query("begin");

      const orderResult = await client.query(
        `
          insert into clone_orders (
            id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          on conflict (id) do update
          set
            order_key = excluded.order_key,
            created_at = excluded.created_at,
            customer_name = excluded.customer_name,
            email = excluded.email,
            phone = excluded.phone,
            memo = excluded.memo,
            total_value = excluded.total_value,
            total_text = excluded.total_text,
            status = excluded.status
          returning id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
        `,
        [
          input.id,
          input.key,
          input.createdAt,
          input.customerName,
          input.email,
          input.phone,
          input.memo,
          input.totalValue,
          input.totalText,
          input.status ?? "pending"
        ]
      );

      await client.query(`delete from clone_order_items where order_id = $1`, [input.id]);

      for (const item of input.items) {
        await client.query(
          `
            insert into clone_order_items (
              order_id, product_id, slug, title, excerpt, price_text, price_value, image_url,
              review_count, stock_state, quantity, line_total
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,
          [
            input.id,
            item.id || null,
            item.slug,
            item.title,
            item.excerpt,
            item.priceText,
            item.priceValue,
            item.imageUrl,
            item.reviewCount,
            item.stockState ?? null,
            item.quantity,
            item.lineTotal
          ]
        );
      }

      await client.query("commit");
      return mapStoredOrder(orderResult.rows[0], input.items, input.status ?? "pending");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }, null as AdminOrderRecord | null);
}

export async function listAdminOrders(limit = 40) {
  return withAdminDb(async (pool) => {
    const orderResult = await pool.query(
      `
        select id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
        from clone_orders
        order by created_at desc, id desc
        limit $1
      `,
      [limit]
    );

    const orders = orderResult.rows;
    if (orders.length === 0) {
      return [] as AdminOrderRecord[];
    }

    const ids = orders.map((row) => String(row.id));
    const itemResult = await pool.query(
      `
        select order_id, product_id, slug, title, excerpt, price_text, price_value, image_url,
               review_count, stock_state, quantity, line_total
        from clone_order_items
        where order_id = any($1::text[])
        order by id asc
      `,
      [ids]
    );

    const itemsByOrderId = new Map<string, StoredOrderItem[]>();
    for (const row of itemResult.rows) {
      const orderId = String(row.order_id);
      const current = itemsByOrderId.get(orderId) ?? [];
      current.push(mapStoredOrderItem(row));
      itemsByOrderId.set(orderId, current);
    }

    return orders.map((row) => mapStoredOrder(row, itemsByOrderId.get(String(row.id)) ?? []));
  }, [] as AdminOrderRecord[]);
}

export async function getAdminOrderById(orderId: string) {
  return withAdminDb(async (pool) => {
    const orderResult = await pool.query(
      `
        select id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
        from clone_orders
        where id = $1
        limit 1
      `,
      [orderId]
    );

    const orderRow = orderResult.rows[0];
    if (!orderRow) {
      return null as AdminOrderRecord | null;
    }

    const itemResult = await pool.query(
      `
        select order_id, product_id, slug, title, excerpt, price_text, price_value, image_url,
               review_count, stock_state, quantity, line_total
        from clone_order_items
        where order_id = $1
        order by id asc
      `,
      [orderId]
    );

    return mapStoredOrder(orderRow, itemResult.rows.map((row) => mapStoredOrderItem(row)));
  }, null as AdminOrderRecord | null);
}

````

</details>

<details><summary><code>lib/admin-uploads.ts</code> — 전체 113줄</summary>

````ts
import { v2 as cloudinary } from "cloudinary";

import { saveAdminAsset } from "@/lib/admin-store";
import { cloudinaryFolder } from "@/lib/project-config";
import { getServerEnv } from "@/lib/server-env";

export type UploadableFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type UploadedAdminAsset = {
  id: number;
  publicId: string;
  secureUrl: string;
  originalFilename: string | null;
  resourceType: string;
};

export function isUploadableFile(value: unknown): value is UploadableFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function" &&
      "size" in value &&
      typeof value.size === "number" &&
      "name" in value &&
      typeof value.name === "string"
  );
}

function getCloudinaryApiSecret() {
  const directSecret = getServerEnv("CLOUDINARY_API_SECRET");
  if (directSecret) {
    return directSecret;
  }

  const cloudinaryUrl = getServerEnv("CLOUDINARY_URL");
  if (!cloudinaryUrl) {
    throw new Error("Missing Cloudinary credentials.");
  }

  const parsed = new URL(cloudinaryUrl);
  return parsed.password;
}

function configureCloudinary() {
  const cloudName = getServerEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getServerEnv("CLOUDINARY_API_KEY");
  const apiSecret = getCloudinaryApiSecret();

  if (!cloudName || !apiKey) {
    throw new Error("Cloudinary credentials are incomplete.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

export async function uploadAdminFiles(files: UploadableFile[], folderOverride?: string) {
  const validFiles = files.filter((file) => file.size > 0);
  if (validFiles.length === 0) {
    return [] as UploadedAdminAsset[];
  }

  configureCloudinary();
  const targetFolder = folderOverride?.trim() || cloudinaryFolder;
  const uploads: UploadedAdminAsset[] = [];

  for (const file of validFiles) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: targetFolder,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });

    let saved;
    try {
      saved = await saveAdminAsset({
        publicId: upload.public_id,
        secureUrl: upload.secure_url,
        originalFilename: file.name || null
      });
    } catch (error) {
      console.error("[admin-upload-db]", error instanceof Error ? error.message : "Unknown database error");
      throw new Error(
        "Cloudinary 업로드는 완료됐지만 Supabase DB 기록 저장에 실패했습니다. 같은 파일을 다시 올리기 전에 Cloudinary에서 확인해 주세요."
      );
    }

    uploads.push({
      id: saved.id,
      publicId: upload.public_id,
      secureUrl: upload.secure_url,
      originalFilename: file.name || null,
      resourceType: upload.resource_type
    });
  }

  return uploads;
}

````

</details>

<details><summary><code>lib/asset-map.ts</code> — 전체 152줄</summary>

````ts
import { readFile } from "node:fs/promises";
import { cache } from "react";

import { assetManifestPath, assetUrlVariants, normalizeAssetUrl } from "@/lib/asset-utils";
import { sourceHost, sourceUploadsAliasHosts } from "@/lib/project-config";

export type AssetRecord = {
  originalUrl: string;
  normalizedUrl: string;
  variantUrls?: string[];
  cloudinaryUrl: string;
  localPath: string;
  sourceRefs: string[];
  publicId: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  contentType: string | null;
};

type AssetManifest = {
  capturedAt: string;
  total: number;
  assets: AssetRecord[];
  skipped?: Array<{
    normalizedUrl: string;
    variantUrls?: string[];
  }>;
};

const getAssetManifest = cache(async (): Promise<AssetManifest | null> => {
  try {
    const raw = await readFile(assetManifestPath, "utf8");
    return JSON.parse(raw) as AssetManifest;
  } catch {
    return null;
  }
});

export const getAssetUrlLookup = cache(async () => {
  const manifest = await getAssetManifest();
  const lookup = new Map<string, string>();

  for (const asset of manifest?.assets ?? []) {
    for (const variant of assetUrlVariants(asset.originalUrl)) {
      lookup.set(variant, asset.cloudinaryUrl);
    }
    for (const variant of assetUrlVariants(asset.normalizedUrl)) {
      lookup.set(variant, asset.cloudinaryUrl);
    }
    for (const variantUrl of asset.variantUrls ?? []) {
      for (const variant of assetUrlVariants(variantUrl)) {
        lookup.set(variant, asset.cloudinaryUrl);
      }
    }
  }

  return lookup;
});

const getSkippedAssetUrls = cache(async () => {
  const manifest = await getAssetManifest();
  const skipped = new Set<string>();

  for (const asset of manifest?.skipped ?? []) {
    for (const url of [asset.normalizedUrl, ...(asset.variantUrls ?? [])]) {
      if (url.includes("&quot;")) {
        continue;
      }
      for (const variant of assetUrlVariants(url)) {
        skipped.add(variant);
      }
    }
  }

  return skipped;
});

export async function resolveAssetUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const normalized = normalizeAssetUrl(url);
  const lookup = await getAssetUrlLookup();
  return lookup.get(url) ?? lookup.get(normalized) ?? normalized;
}

function rewriteSrcsetAssetUrls(html: string, lookup: Map<string, string>) {
  return html.replace(/\ssrcset=(["'])([^"']*)\1/gi, (_attribute, quote: string, value: string) => {
    const rewrittenValue = value
      .split(",")
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) {
          return trimmed;
        }

        const [sourceUrl, ...descriptorParts] = trimmed.split(/\s+/);
        const decodedUrl = sourceUrl.replaceAll("&amp;", "&");
        const normalizedUrl = normalizeAssetUrl(decodedUrl);
        const targetUrl =
          lookup.get(sourceUrl) ?? lookup.get(decodedUrl) ?? lookup.get(normalizedUrl) ?? normalizedUrl;
        const descriptor = descriptorParts.join(" ");

        return descriptor ? `${targetUrl} ${descriptor}` : targetUrl;
      })
      .join(", ");

    return ` srcset=${quote}${rewrittenValue}${quote}`;
  });
}

function removeSkippedImageTags(html: string, skipped: Set<string>) {
  if (!skipped.size) {
    return html;
  }

  return html.replace(/<img\b[^>]*\ssrc=(["'])([^"']+)\1[^>]*>/gi, (tag, _quote: string, value: string) => {
    const decodedUrl = value.replaceAll("&amp;", "&");
    const shouldRemove = assetUrlVariants(decodedUrl).some((variant) => skipped.has(variant));
    return shouldRemove ? "" : tag;
  });
}

export async function rewriteHtmlAssetUrls(html: string) {
  if (!html) {
    return html;
  }

  let rewritten = html;
  for (const host of sourceUploadsAliasHosts) {
    rewritten = rewritten
      .replaceAll(`http://${host}/wp-content/uploads/`, `https://${sourceHost}/wp-content/uploads/`)
      .replaceAll(`https://${host}/wp-content/uploads/`, `https://${sourceHost}/wp-content/uploads/`);
  }

  const [lookup, skipped] = await Promise.all([getAssetUrlLookup(), getSkippedAssetUrls()]);
  if (!lookup.size) {
    return removeSkippedImageTags(rewritten, skipped);
  }

  const replacements = [...lookup.entries()].sort((left, right) => right[0].length - left[0].length);

  for (const [sourceUrl, targetUrl] of replacements) {
    rewritten = rewritten.split(sourceUrl).join(targetUrl);
  }

  return removeSkippedImageTags(rewriteSrcsetAssetUrls(rewritten, lookup), skipped);
}

````

</details>

<details><summary><code>lib/asset-utils.ts</code> — 전체 140줄</summary>

````ts
import path from "node:path";

import { sourceHost, sourceUploadsAliasHosts } from "@/lib/project-config";

const projectRoot = process.cwd();

export const assetDataDir = path.join(projectRoot, "data", "assets");
export const assetRawDir = path.join(assetDataDir, "raw");
export const assetManifestPath = path.join(assetDataDir, "manifest.json");

function canonicalizeUploadPathname(pathname: string) {
  if (!pathname.startsWith("/wp-content/uploads/")) {
    return pathname;
  }

  return pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
}

export function normalizeAssetUrl(url: string, options?: { keepSizeSuffix?: boolean }) {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";

    if (sourceUploadsAliasHosts.includes(parsed.hostname) && parsed.pathname.startsWith("/wp-content/uploads/")) {
      parsed.protocol = "https:";
      parsed.hostname = sourceHost;
      parsed.port = "";
    }

    if (!options?.keepSizeSuffix) {
      parsed.pathname = canonicalizeUploadPathname(parsed.pathname);
    }

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function assetUrlVariants(url: string) {
  const normalized = normalizeAssetUrl(url);
  const normalizedWithSizeSuffix = normalizeAssetUrl(url, { keepSizeSuffix: true });
  const variants = new Set<string>([url, normalized]);
  variants.add(normalizedWithSizeSuffix);

  try {
    variants.add(decodeURI(url));
  } catch {}

  try {
    variants.add(decodeURI(normalized));
  } catch {}

  try {
    variants.add(decodeURI(normalizedWithSizeSuffix));
  } catch {}

  try {
    const parsed = new URL(normalizedWithSizeSuffix);
    parsed.search = "";
    variants.add(parsed.toString());
    try {
      variants.add(decodeURI(parsed.toString()));
    } catch {}

    if (parsed.hostname === sourceHost) {
      const httpVariant = new URL(parsed.toString());
      httpVariant.protocol = "http:";
      variants.add(httpVariant.toString());
      try {
        variants.add(decodeURI(httpVariant.toString()));
      } catch {}

      if (parsed.pathname.startsWith("/wp-content/uploads/")) {
        for (const aliasHost of sourceUploadsAliasHosts) {
          if (aliasHost === sourceHost) {
            continue;
          }
          for (const protocol of ["http:", "https:"]) {
            const aliasVariant = new URL(parsed.toString());
            aliasVariant.protocol = protocol;
            aliasVariant.hostname = aliasHost;
            variants.add(aliasVariant.toString());
            try {
              variants.add(decodeURI(aliasVariant.toString()));
            } catch {}
          }
        }
      }
    }
  } catch {
    return [...variants];
  }

  return [...variants];
}

export function sanitizeAssetPath(url: string) {
  const parsed = new URL(normalizeAssetUrl(url));
  const base = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+/, "");
  const safe = base
    .replace(/[^a-zA-Z0-9/._-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+/, "");
  return safe || "asset.bin";
}

export function collectAssetUrlsFromHtml(html: string) {
  const urls = new Set<string>();
  const patterns = [
    /\ssrc=["']([^"']+)["']/gi,
    /\ssrcset=["']([^"']+)["']/gi,
    /\shref=["']([^"']+)["']/gi,
    /https?:\/\/[^"'()\s>]+/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1] ?? match[0] ?? "";
      const candidates = pattern.source.includes("srcset")
        ? value.split(",").map((entry) => entry.trim().split(/\s+/)[0] ?? "")
        : [value];

      for (const candidate of candidates) {
        if (!candidate.startsWith("http")) {
          continue;
        }

        if (!/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(candidate)) {
          continue;
        }

        urls.add(normalizeAssetUrl(candidate));
      }
    }
  }

  return [...urls];
}

````

</details>

<details><summary><code>lib/html-utils.ts</code> — 전체 29줄</summary>

````ts
function normalizeComparablePathname(value: string) {
  return value.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
}

function normalizeComparableUrl(value: string) {
  try {
    const parsed = new URL(value.replaceAll("&amp;", "&").trim());
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = normalizeComparablePathname(parsed.pathname);
    return parsed.pathname;
  } catch {
    return normalizeComparablePathname(value.replaceAll("&amp;", "&").trim().split(/[?#]/, 1)[0]);
  }
}

export function htmlHasLeadingImage(html: string, imageUrl: string | null | undefined) {
  if (!html || !imageUrl) {
    return false;
  }

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match?.[1]) {
    return false;
  }

  return normalizeComparableUrl(match[1]) === normalizeComparableUrl(imageUrl);
}

````

</details>

<details><summary><code>lib/product-pricing.ts</code> — 전체 17줄</summary>

````ts
export function hasSalePrice(regularPriceValue: number | null, salePriceValue: number | null) {
  return (
    salePriceValue !== null &&
    regularPriceValue !== null &&
    salePriceValue > 0 &&
    salePriceValue < regularPriceValue
  );
}

export function getDisplayPriceValue(options: {
  priceValue: number | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
}) {
  return options.salePriceValue ?? options.regularPriceValue ?? options.priceValue;
}

````

</details>

<details><summary><code>lib/project-config.ts</code> — 전체 20줄</summary>

````ts
const defaultSourceBaseUrl = "https://aloha-yt.xyz";
const normalizedSourceBaseUrl = (process.env.SOURCE_BASE_URL ?? defaultSourceBaseUrl).replace(/\/+$/, "");

const parsedSourceUrl = new URL(normalizedSourceBaseUrl);

export const projectRoot = process.cwd();
export const sourceBaseUrl = parsedSourceUrl.toString();
export const sourceOrigin = parsedSourceUrl.origin;
export const sourceHost = parsedSourceUrl.hostname;
export const sourceAdminBaseUrl = new URL("/wp-admin/", sourceOrigin).toString().replace(/\/+$/, "");
export const sourceUploadsAliasHosts = [
  sourceHost,
  ...((process.env.SOURCE_UPLOADS_ALIAS_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean))
];
export const cloudinaryFolder = process.env.CLOUDINARY_FOLDER ?? "aloha-clone";
export const siteStoragePrefix = process.env.SITE_STORAGE_PREFIX ?? "aloha-clone";

````

</details>

<details><summary><code>lib/purchase-flow.ts</code> — 전체 57줄</summary>

````ts
export type PurchaseProduct = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  priceText: string | null;
  priceValue: number | null;
  imageUrl: string | null;
  reviewCount: number;
  stockState?: "available" | "reserved" | "soldout";
};

export type StoredCartItem = {
  productId: number;
  quantity: number;
};

export type StoredOrderItem = PurchaseProduct & {
  quantity: number;
  lineTotal: number;
};

export type StoredOrder = {
  id: string;
  key: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  memo: string;
  items: StoredOrderItem[];
  totalValue: number;
  totalText: string;
};

export const bankTransferAccount = {
  bankName: "카카오뱅크",
  accountHolder: "안*리",
  accountNumber: "[REDACTED_PUBLIC_ACCOUNT_NUMBER]"
} as const;

export const checkoutFieldLabels = [
  "주문자 성함(입금자명과 같아야 합니다.)",
  "이메일 주소",
  "연락처",
  "주문 메모"
] as const;

export const checkoutBoxNotes = [
  "성함과 이메일 주소를 정확히 입력해 주세요.",
  "입금 확인 후 순차적으로 주문 안내가 진행됩니다."
] as const;

export function formatWon(value: number) {
  return `₩${new Intl.NumberFormat("ko-KR").format(value)}`;
}

````

</details>

<details><summary><code>lib/server-env.ts</code> — 전체 80줄</summary>

````ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const envFilePaths = [".local/supabase.env", ".local/cloudinary.env", ".local/admin.env"];

let cachedLocalEnv: Record<string, string> | null = null;

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(content: string) {
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(normalized.slice(separatorIndex + 1).trim());
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function loadLocalEnv() {
  if (cachedLocalEnv) {
    return cachedLocalEnv;
  }

  cachedLocalEnv = {};
  const projectRoot = process.cwd();

  for (const relativePath of envFilePaths) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }

    Object.assign(cachedLocalEnv, parseEnvFile(readFileSync(absolutePath, "utf8")));
  }

  return cachedLocalEnv;
}

export function getServerEnv(key: string) {
  return process.env[key] ?? loadLocalEnv()[key];
}

export function hasServerEnv(key: string) {
  return Boolean(getServerEnv(key));
}

export function requireServerEnv(key: string) {
  const value = getServerEnv(key);
  if (!value) {
    throw new Error(`Missing required server env: ${key}`);
  }

  return value;
}

````

</details>

<details><summary><code>lib/site-data.ts</code> — 전체 1234줄</summary>

````ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  getAdminSetting,
  listAdminContentRequired,
  listAdminPages,
  listAdminPagesRequired,
  listAdminPosts,
  listAdminPostsRequired,
  listAdminProductOverrides,
  listAdminProductOverridesRequired,
  seedAdminContent,
  type AdminPostInput,
  type AdminPostRecord,
  type AdminProductOverride
} from "@/lib/admin-store";
import { resolveAssetUrl, rewriteHtmlAssetUrls } from "@/lib/asset-map";
import { getDisplayPriceValue } from "@/lib/product-pricing";

const projectRoot = process.cwd();
const exportDir = path.join(projectRoot, "data", "public-wp-export");
const adminExportDir = path.join(projectRoot, "data", "admin-wp-export");

type WpRendered = {
  rendered: string;
  protected?: boolean;
};

type WpPaged<T> = {
  total: number;
  totalPages: number;
  records: T[];
};

type RawPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  categories?: number[];
  sticky?: boolean;
};

type RawCategory = {
  id: number;
  count: number;
  slug: string;
  name: string;
  parent: number;
};

type RawComment = {
  id: number;
  post: number;
  parent: number;
  author_name: string;
  date: string;
  content: WpRendered;
  link: string;
  status: string;
  type: string;
};

type RawProductDetail = {
  id: number;
  slug: string;
  link: string;
  title: string;
  schema: {
    description?: string;
    image?: string | string[];
    aggregateRating?: {
      ratingValue?: string;
      reviewCount?: number | string;
    };
    review?: Array<{
      author?: { name?: string };
      datePublished?: string;
      reviewBody?: string;
      reviewRating?: { ratingValue?: number | string };
    }>;
    offers?: Array<{
      price?: string | number;
      priceCurrency?: string;
      availability?: string;
    }>;
  } | null;
  extractedReviews: Array<{
    author: string;
    date: string;
    body: string;
    rating: string;
  }>;
  publicSignals: {
    hasRefundText: boolean;
    hasGmailDeliveryText: boolean;
    hasPdfOptionText: boolean;
    hasBankTransferText: boolean;
  };
};

type RawProtectedPost = {
  id: number;
  date: string;
  slug: string;
  rawSlug: string;
  link: string;
  status: string;
  visibility: "password" | "private" | "draft";
  password: string;
  title: string;
  contentHtml: string;
  excerptHtml: string;
  categoryIds: number[];
  categoryNames: string[];
  directPath: string;
  listedInArchive: boolean;
};

type ProtectedPostPayload = {
  capturedAt: string;
  protectedPosts: RawProtectedPost[];
  adminOnlyPosts: RawProtectedPost[];
};

type ShopVisibilityPayload = {
  capturedAt: string;
  visibleSlugs: string[];
  pages: Array<{
    page: number;
    count: number;
    slugs: string[];
  }>;
};

export type CommentNode = {
  id: number;
  authorName: string;
  date: string;
  contentHtml: string;
  link: string;
  children: CommentNode[];
};

export type HomeCommentEntry = {
  id: number;
  postId: number;
  postTitle: string;
  postPath: string;
  commentPath: string;
  authorName: string;
  date: string;
  excerpt: string;
};

export type PostEntry = {
  id: number;
  date: string;
  slug: string;
  legacyPath: string;
  aliasPaths: string[];
  pathSegments: string[];
  link: string;
  title: string;
  excerpt: string;
  excerptHtml: string;
  contentHtml: string;
  coverImageUrl: string | null;
  categoryNames: string[];
  commentCount: number;
  sticky: boolean;
  visibility: "public" | "password" | "hidden" | "private";
  accessPassword: string | null;
  listedInArchive: boolean;
  publicationStatus: "draft" | "published";
  listedInSearch: boolean;
  allowIndexing: boolean;
  updatedAt: string;
};

export type ProductReview = {
  author: string;
  date: string;
  body: string;
  rating: string;
};

export type ProductEntry = {
  id: number;
  overrideId: number | null;
  sourceProductId: number | null;
  date: string;
  slug: string;
  link: string;
  title: string;
  excerpt: string;
  excerptHtml: string;
  contentHtml: string;
  priceText: string | null;
  priceValue: number | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
  imageUrl: string | null;
  description: string;
  ratingValue: string | null;
  reviewCount: number;
  reviews: ProductReview[];
  visibility: "public" | "hidden" | "private";
  stockState: "available" | "reserved" | "soldout";
  publicSignals: RawProductDetail["publicSignals"];
};

export type PageEntry = {
  id: number;
  date: string;
  slug: string;
  legacyPath: string;
  pathSegments: string[];
  link: string;
  title: string;
  excerptHtml: string;
  contentHtml: string;
  visibility: AdminPostRecord["visibility"];
  accessPassword: string | null;
  publicationStatus: AdminPostRecord["publicationStatus"];
  listedInSearch: boolean;
  allowIndexing: boolean;
  updatedAt: string;
};

type SiteManifest = {
  capturedAt: string;
  baseUrl: string;
  counts: {
    posts: number;
    pages: number;
    products: number;
    categories: number;
    productCategories: number;
    comments: number;
  };
};

export type SiteMeta = {
  name: string;
  description: string;
  home: string;
  site_icon_url?: string;
};

const productCommonIntroSettingKey = "product_common_intro_html";

function allowStaticAdminDbFallback() {
  return process.env.ALOHA_SKIP_ADMIN_DB === "1";
}

function listPublicAdminPosts() {
  return allowStaticAdminDbFallback() ? listAdminPosts() : listAdminPostsRequired();
}

function listPublicAdminPages() {
  return allowStaticAdminDbFallback() ? listAdminPages() : listAdminPagesRequired();
}

function listPublicAdminProductOverrides() {
  return allowStaticAdminDbFallback()
    ? listAdminProductOverrides()
    : listAdminProductOverridesRequired();
}

const readJson = cache(async <T>(filename: string): Promise<T> => {
  const raw = await readFile(`${exportDir}/${filename}`, "utf8");
  return JSON.parse(raw) as T;
});

const readAdminJson = cache(async <T>(filename: string): Promise<T> => {
  const raw = await readFile(`${adminExportDir}/${filename}`, "utf8");
  return JSON.parse(raw) as T;
});

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeProtectedTitle(value: string) {
  return decodeHtmlEntities(value).replace(/^보호된 글:\s*/u, "").trim();
}

function extractFirstImageUrl(value: string) {
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function normalizeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(value: string) {
  const compact = value.replace(/\/+$/, "");
  if (!compact) {
    return "/";
  }

  return `/${compact
    .split("/")
    .filter(Boolean)
    .map((segment) => normalizeSlug(segment))
    .join("/")}`;
}

function pathFromLink(value: string) {
  try {
    return normalizePath(new URL(value).pathname);
  } catch {
    return normalizePath(value.startsWith("/") ? value : `/${value}`);
  }
}

function pathToSegments(value: string) {
  return pathFromLink(value).split("/").filter(Boolean);
}

function deriveStockState(title: string, availability?: string) {
  if (title.includes("예약중") || title.includes("예약")) {
    return "reserved" as const;
  }

  if (title.includes("판매완료") || title.includes("품절") || availability?.includes("OutOfStock")) {
    return "soldout" as const;
  }

  return "available" as const;
}

function extractRegularPriceValue(...values: Array<string | null | undefined>) {
  const normalized = decodeHtmlEntities(values.filter(Boolean).join(" "))
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/,/g, "");

  const patterns = [
    /원(?:래)? 가격(?:은)?\s*([0-9]+(?:\.[0-9]+)?)\s*만원/iu,
    /정가(?:는)?\s*([0-9]+(?:\.[0-9]+)?)\s*만원/iu,
    /원(?:래)? 가격(?:은)?\s*([0-9]+)\s*원/iu,
    /정가(?:는)?\s*([0-9]+)\s*원/iu
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const numeric = Number(match[1]);
    if (!Number.isFinite(numeric)) {
      continue;
    }

    return pattern.source.includes("만원") ? Math.round(numeric * 10_000) : Math.round(numeric);
  }

  return null;
}

function findProductIntroBoundary(value: string) {
  const match = value.match(/<h[1-6][^>]*>\s*채널 소개\s*<\/h[1-6]>/i);
  return match?.index ?? -1;
}

function splitProductContentSections(value: string) {
  const boundary = findProductIntroBoundary(value);
  if (boundary < 0) {
    return {
      commonIntroHtml: "",
      bodyHtml: value.trim()
    };
  }

  return {
    commonIntroHtml: value.slice(0, boundary).trim(),
    bodyHtml: value.slice(boundary).trim()
  };
}

function formatPrice(price?: string | number | null, currency?: string) {
  if (price === undefined || price === null || price === "") {
    return null;
  }

  const numeric = Number(price);
  if (Number.isNaN(numeric)) {
    return String(price);
  }

  const formatted = new Intl.NumberFormat("ko-KR").format(numeric);
  return currency === "KRW" || !currency ? `₩${formatted}` : `${formatted} ${currency}`;
}

function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

function sortPostsForHome<T extends { date: string; sticky: boolean }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.sticky !== right.sticky) {
      return Number(right.sticky) - Number(left.sticky);
    }

    return Date.parse(right.date) - Date.parse(left.date);
  });
}

export async function getSiteManifest() {
  return readJson<SiteManifest>("manifest.json");
}

export async function getSiteMeta() {
  const meta = await readJson<SiteMeta>("site-meta.json");
  const originalIconUrl = meta.site_icon_url;
  const resolvedIconUrl = originalIconUrl ? await resolveAssetUrl(originalIconUrl) : null;
  const sourceHost = new URL(meta.home).hostname;
  const resolvedIconHost = resolvedIconUrl ? new URL(resolvedIconUrl, meta.home).hostname : null;
  return {
    ...meta,
    site_icon_url:
      resolvedIconUrl && resolvedIconHost !== sourceHost
        ? resolvedIconUrl
        : "/icon.png"
  };
}

const getShopVisibility = cache(async (): Promise<ShopVisibilityPayload | null> => {
  try {
    return await readJson<ShopVisibilityPayload>("shop-visibility.json");
  } catch {
    return null;
  }
});

const getSourcePosts = cache(async (): Promise<PostEntry[]> => {
  const [postsPayload, categoriesPayload, commentsPayload] = await Promise.all([
    readJson<WpPaged<RawPost>>("posts.json"),
    readJson<WpPaged<RawCategory>>("categories.json"),
    readJson<WpPaged<RawComment>>("comments.json")
  ]);

  const categoryMap = new Map(
    categoriesPayload.records.map((category) => [category.id, decodeHtmlEntities(category.name)])
  );

  const commentCountByPost = new Map<number, number>();
  for (const comment of commentsPayload.records) {
    commentCountByPost.set(comment.post, (commentCountByPost.get(comment.post) ?? 0) + 1);
  }

  return Promise.all(
    sortByDateDesc(postsPayload.records).map(async (post) => {
      const excerptHtml = await rewriteHtmlAssetUrls(post.excerpt.rendered);
      const contentHtml = await rewriteHtmlAssetUrls(post.content.rendered);

      return {
        id: post.id,
        date: post.date,
        slug: normalizeSlug(post.slug),
        legacyPath: pathFromLink(post.link),
        aliasPaths: [],
        pathSegments: pathToSegments(post.link),
        link: post.link,
        title: decodeHtmlEntities(post.title.rendered),
        excerpt: stripHtml(post.excerpt.rendered),
        excerptHtml,
        contentHtml,
        coverImageUrl: extractFirstImageUrl(contentHtml) ?? extractFirstImageUrl(excerptHtml),
        categoryNames: (post.categories ?? []).map((categoryId) => categoryMap.get(categoryId) ?? `#${categoryId}`),
        commentCount: commentCountByPost.get(post.id) ?? 0,
        sticky: post.sticky ?? false,
        visibility: "public" as const,
        accessPassword: null,
        listedInArchive: true,
        publicationStatus: "published" as const,
        listedInSearch: true,
        allowIndexing: true,
        updatedAt: post.date
      };
    })
  );
});

const getSourceProtectedPosts = cache(async (): Promise<PostEntry[]> => {
  let payload: ProtectedPostPayload;

  try {
    payload = await readAdminJson<ProtectedPostPayload>("protected-posts.json");
  } catch {
    return [];
  }

  const categoriesPayload = await readJson<WpPaged<RawCategory>>("categories.json");
  const categoryMap = new Map(
    categoriesPayload.records.map((category) => [category.id, decodeHtmlEntities(category.name)])
  );

  return Promise.all(
    sortByDateDesc(payload.protectedPosts).map(async (post) => {
      const excerptHtml = await rewriteHtmlAssetUrls(post.excerptHtml);
      const contentHtml = await rewriteHtmlAssetUrls(post.contentHtml);
      const primaryPath = pathFromLink(post.link);
      const directPath = normalizePath(post.directPath || `/${post.id}`);
      const shortPath = normalizePath(`/${post.rawSlug || post.slug}`);

      return {
        id: post.id,
        date: post.date,
        slug: normalizeSlug(post.slug),
        legacyPath: primaryPath,
        aliasPaths: [...new Set([directPath, shortPath].filter((path) => path !== primaryPath))],
        pathSegments: pathToSegments(primaryPath),
        link: post.link,
        title: normalizeProtectedTitle(post.title),
        excerpt: stripHtml(post.excerptHtml || post.contentHtml),
        excerptHtml,
        contentHtml,
        coverImageUrl: extractFirstImageUrl(contentHtml) ?? extractFirstImageUrl(excerptHtml),
        categoryNames:
          post.categoryIds.length > 0
            ? post.categoryIds.map((categoryId) => categoryMap.get(categoryId) ?? `#${categoryId}`)
            : post.categoryNames,
        commentCount: 0,
        sticky: false,
        visibility: "password",
        accessPassword: post.password || null,
        listedInArchive: post.listedInArchive,
        publicationStatus: "published" as const,
        listedInSearch: false,
        allowIndexing: false,
        updatedAt: post.date
      };
    })
  );
});

function mapAdminPostToEntry(post: AdminPostRecord): PostEntry {
  return {
    id: -post.id,
    date: post.publishedAt,
    slug: post.slug,
    legacyPath: normalizePath(post.path),
    aliasPaths: [],
    pathSegments: pathToSegments(post.path),
    link: post.path,
    title: post.title,
    excerpt: stripHtml(post.excerptHtml || post.contentHtml),
    excerptHtml: post.excerptHtml,
    contentHtml: post.contentHtml,
    coverImageUrl: extractFirstImageUrl(post.contentHtml) ?? extractFirstImageUrl(post.excerptHtml),
    categoryNames: [],
    commentCount: 0,
    sticky: false,
    visibility: post.visibility,
    accessPassword: post.visibility === "password" ? post.accessPassword : null,
    listedInArchive: post.listedInArchive,
    publicationStatus: post.publicationStatus,
    listedInSearch: post.listedInSearch,
    allowIndexing: post.allowIndexing,
    updatedAt: post.updatedAt
  };
}

const getMergedPosts = cache(async () => {
  const [sourcePosts, protectedPosts, adminPosts] = await Promise.all([
    getSourcePosts(),
    getSourceProtectedPosts(),
    listPublicAdminPosts()
  ]);

  const adminEntries = adminPosts.map(mapAdminPostToEntry);
  const overriddenSourceIds = new Set(
    adminPosts.flatMap((post) => (post.sourceId === null ? [] : [post.sourceId]))
  );
  const ordered = [...adminEntries, ...protectedPosts, ...sourcePosts];
  const seenIds = new Set<number>();
  const seenPaths = new Set<string>();
  const merged: PostEntry[] = [];

  for (const post of ordered) {
    if (post.id > 0 && overriddenSourceIds.has(post.id)) {
      continue;
    }
    if (seenIds.has(post.id) || seenPaths.has(post.legacyPath)) {
      continue;
    }

    merged.push(post);
    seenIds.add(post.id);
    seenPaths.add(post.legacyPath);
  }

  return merged;
});

function isPostLive(post: PostEntry) {
  return post.publicationStatus === "published" && Date.parse(post.date) <= Date.now();
}

export async function getPosts() {
  const posts = await getMergedPosts();
  return sortPostsForHome(
    posts.filter(
      (post) =>
        isPostLive(post) &&
        post.listedInArchive &&
        post.visibility !== "hidden" &&
        post.visibility !== "private"
    )
  );
}

export async function searchPosts(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return [];
  const [posts, pages] = await Promise.all([getMergedPosts(), getPages()]);
  const searchablePages: PostEntry[] = pages.map((page) => ({
    id: -2_000_000_000 - Math.abs(page.id),
    date: page.date,
    slug: page.slug,
    legacyPath: page.legacyPath,
    aliasPaths: [],
    pathSegments: page.pathSegments,
    link: page.link,
    title: page.title,
    excerpt: stripHtml(page.excerptHtml || page.contentHtml),
    excerptHtml: page.excerptHtml,
    contentHtml: page.contentHtml,
    coverImageUrl: extractFirstImageUrl(page.contentHtml) ?? extractFirstImageUrl(page.excerptHtml),
    categoryNames: ["페이지"],
    commentCount: 0,
    sticky: false,
    visibility: page.visibility,
    accessPassword: page.accessPassword,
    listedInArchive: false,
    publicationStatus: page.publicationStatus,
    listedInSearch: page.listedInSearch,
    allowIndexing: page.allowIndexing,
    updatedAt: page.updatedAt
  }));
  return sortPostsForHome(
    [...posts, ...searchablePages].filter((post) => {
      if (
        !isPostLive(post) ||
        !post.listedInSearch ||
        post.visibility === "private" ||
        post.visibility === "password"
      ) {
        return false;
      }
      return `${post.title} ${post.excerpt} ${stripHtml(post.contentHtml)}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalizedQuery);
    })
  ).slice(0, 50);
}

export async function getProtectedPosts() {
  const posts = await getMergedPosts();
  return posts.filter((post) => isPostLive(post) && post.visibility === "password");
}

export async function getPostById(id: number) {
  const posts = await getMergedPosts();
  const match = posts.find((post) => post.id === id) ?? null;
  if (!match || !isPostLive(match) || match.visibility === "private") {
    return null;
  }
  return match;
}

export async function getPostBySlug(slug: string) {
  const posts = await getMergedPosts();
  const normalizedSlug = normalizeSlug(slug);
  const match = posts.find((post) => post.slug === normalizedSlug) ?? null;
  if (!match || !isPostLive(match) || match.visibility === "private") {
    return null;
  }
  return match;
}

export async function getPostByPath(path: string) {
  const posts = await getMergedPosts();
  const normalizedPath = normalizePath(path);
  const match =
    posts.find((post) => post.legacyPath === normalizedPath || post.aliasPaths.includes(normalizedPath)) ?? null;
  if (!match || !isPostLive(match) || match.visibility === "private") {
    return null;
  }
  return match;
}

export const getPostComments = cache(async (postId: number): Promise<CommentNode[]> => {
  const commentsPayload = await readJson<WpPaged<RawComment>>("comments.json");
  const relevant = commentsPayload.records.filter((comment) => comment.post === postId);
  const rewrittenContent = new Map(
    await Promise.all(relevant.map(async (comment) => [comment.id, await rewriteHtmlAssetUrls(comment.content.rendered)] as const))
  );

  const byParent = new Map<number, RawComment[]>();
  for (const comment of relevant) {
    const bucket = byParent.get(comment.parent) ?? [];
    bucket.push(comment);
    byParent.set(comment.parent, bucket);
  }

  const buildTree = (parentId: number): CommentNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
      .map((comment) => ({
        id: comment.id,
        authorName: decodeHtmlEntities(comment.author_name),
        date: comment.date,
        contentHtml: rewrittenContent.get(comment.id) ?? comment.content.rendered,
        link: comment.link,
        children: buildTree(comment.id)
      }));

  return buildTree(0);
});

async function mapSourceProduct(
  product: RawPost,
  detail: RawProductDetail | undefined,
  visibleSlugs: Set<string> | null
): Promise<ProductEntry> {
  const normalizedSlug = normalizeSlug(product.slug);
  const schema = detail?.schema;
  const primaryOffer = schema?.offers?.[0];
  const numericPrice = Number(primaryOffer?.price);
  const schemaReviews =
    schema?.review?.map((review) => ({
      author: decodeHtmlEntities(review.author?.name ?? ""),
      date: review.datePublished ?? "",
      body: decodeHtmlEntities(review.reviewBody ?? "").trim(),
      rating: String(review.reviewRating?.ratingValue ?? "")
    })) ?? [];
  const extractedReviews = detail?.extractedReviews.map((review) => ({
    author: decodeHtmlEntities(review.author),
    date: review.date,
    body: decodeHtmlEntities(review.body),
    rating: review.rating
  })) ?? [];
  const reviews = extractedReviews.length >= schemaReviews.length ? extractedReviews : schemaReviews;
  const rawReviewCount = schema?.aggregateRating?.reviewCount ?? reviews.length;
  const reviewCount = Number(rawReviewCount) || reviews.length;
  const decodedTitle = decodeHtmlEntities(product.title.rendered);
  const stockState = deriveStockState(decodedTitle, primaryOffer?.availability);
  const fullContentHtml = await rewriteHtmlAssetUrls(product.content.rendered);
  const { bodyHtml } = splitProductContentSections(fullContentHtml);
  const regularPriceValue = extractRegularPriceValue(schema?.description, product.excerpt.rendered, product.content.rendered);
  const resolvedRegularPriceValue =
    regularPriceValue !== null && Number.isFinite(numericPrice) && regularPriceValue > numericPrice ? regularPriceValue : null;
  const salePriceValue = resolvedRegularPriceValue !== null && Number.isFinite(numericPrice) ? numericPrice : null;
  const currentPriceValue = getDisplayPriceValue({
    priceValue: Number.isFinite(numericPrice) ? numericPrice : null,
    regularPriceValue: resolvedRegularPriceValue ?? (Number.isFinite(numericPrice) ? numericPrice : null),
    salePriceValue
  });

  return {
    id: product.id,
    overrideId: null,
    sourceProductId: product.id,
    date: product.date,
    slug: normalizedSlug,
    link: product.link,
    title: decodedTitle,
    excerpt: stripHtml(product.excerpt.rendered),
    excerptHtml: await rewriteHtmlAssetUrls(product.excerpt.rendered),
    contentHtml: bodyHtml,
    priceText: formatPrice(currentPriceValue, primaryOffer?.priceCurrency),
    priceValue: currentPriceValue,
    regularPriceValue: resolvedRegularPriceValue ?? (Number.isFinite(numericPrice) ? numericPrice : null),
    salePriceValue,
    imageUrl: await resolveAssetUrl(
      Array.isArray(schema?.image)
        ? schema.image[0] ?? extractFirstImageUrl(product.content.rendered)
        : schema?.image ?? extractFirstImageUrl(product.content.rendered)
    ),
    description: decodeHtmlEntities(schema?.description ?? ""),
    ratingValue: schema?.aggregateRating?.ratingValue ?? null,
    reviewCount,
    reviews,
    visibility: visibleSlugs && !visibleSlugs.has(normalizedSlug) ? "hidden" : "public",
    stockState,
    publicSignals: detail?.publicSignals ?? {
      hasRefundText: false,
      hasGmailDeliveryText: false,
      hasPdfOptionText: false,
      hasBankTransferText: false
    }
  };
}

function mergeProductOverride(product: ProductEntry, override?: AdminProductOverride): ProductEntry {
  const regularPriceValue = override?.regularPriceValue ?? product.regularPriceValue;
  const salePriceValue = override?.salePriceValue ?? product.salePriceValue;
  const displayValue = getDisplayPriceValue({
    priceValue: product.priceValue,
    regularPriceValue,
    salePriceValue
  });
  const mergedContentHtml = override?.contentHtml ?? product.contentHtml;
  const { bodyHtml } = splitProductContentSections(mergedContentHtml);
  const slug = normalizeSlug(override?.slug ?? product.slug);
  return {
    ...product,
    overrideId: override?.id ?? product.overrideId,
    sourceProductId: override?.sourceProductId ?? product.sourceProductId,
    slug,
    link: `/product/${slug}`,
    title: override?.title ?? product.title,
    excerptHtml: override?.excerptHtml ?? product.excerptHtml,
    contentHtml: bodyHtml,
    excerpt: stripHtml(override?.excerptHtml ?? product.excerptHtml),
    imageUrl: override?.imageUrl ?? product.imageUrl,
    priceValue: displayValue,
    priceText: displayValue !== null ? formatPrice(displayValue, "KRW") : product.priceText,
    regularPriceValue,
    salePriceValue,
    visibility: override?.visibility ?? product.visibility,
    stockState: override?.stockState ?? product.stockState
  };
}

function mapStandaloneProduct(override: AdminProductOverride): ProductEntry {
  const regularPriceValue = override.regularPriceValue;
  const salePriceValue = override.salePriceValue;
  const priceValue = getDisplayPriceValue({
    priceValue: salePriceValue ?? regularPriceValue,
    regularPriceValue,
    salePriceValue
  });
  const excerptHtml = override.excerptHtml ?? "";
  const { bodyHtml } = splitProductContentSections(override.contentHtml ?? "");
  const slug = normalizeSlug(override.slug);

  return {
    id: -override.id,
    overrideId: override.id,
    sourceProductId: override.sourceProductId,
    date: override.updatedAt ?? new Date(0).toISOString(),
    slug,
    link: `/product/${slug}`,
    title: override.title ?? slug,
    excerpt: stripHtml(excerptHtml),
    excerptHtml,
    contentHtml: bodyHtml,
    priceText: priceValue !== null ? formatPrice(priceValue, "KRW") : null,
    priceValue,
    regularPriceValue,
    salePriceValue,
    imageUrl: override.imageUrl,
    description: "",
    ratingValue: null,
    reviewCount: 0,
    reviews: [],
    visibility: override.visibility,
    stockState: override.stockState,
    publicSignals: {
      hasRefundText: false,
      hasGmailDeliveryText: false,
      hasPdfOptionText: false,
      hasBankTransferText: false
    }
  };
}

const getSourceProductData = cache(async () => {
  const [productsPayload, productDetails] = await Promise.all([
    readJson<WpPaged<RawPost>>("products.json"),
    readJson<RawProductDetail[]>("product-details.json")
  ]);

  const detailsBySlug = new Map(productDetails.map((detail) => [normalizeSlug(detail.slug), detail]));
  const visibilityPayload = await getShopVisibility();
  const visibleSlugs = visibilityPayload ? new Set(visibilityPayload.visibleSlugs.map((slug) => normalizeSlug(slug))) : null;

  return { productsPayload, detailsBySlug, visibleSlugs };
});

const getSourceProducts = cache(async (): Promise<ProductEntry[]> => {
  const { productsPayload, detailsBySlug, visibleSlugs } = await getSourceProductData();

  return Promise.all(
    sortByDateDesc(productsPayload.records).map((product) =>
      mapSourceProduct(product, detailsBySlug.get(normalizeSlug(product.slug)), visibleSlugs)
    )
  );
});

export async function getProducts(options?: {
  includeHidden?: boolean;
  includePrivate?: boolean;
  allowAdminDbFallback?: boolean;
}): Promise<ProductEntry[]> {
  const [products, overrides] = await Promise.all([
    getSourceProducts(),
    options?.allowAdminDbFallback ? listAdminProductOverrides() : listPublicAdminProductOverrides()
  ]);
  const overrideBySourceId = new Map(
    overrides
      .filter((override) => override.sourceProductId !== null)
      .map((override) => [override.sourceProductId as number, override])
  );
  const overrideBySlug = new Map(overrides.map((override) => [normalizeSlug(override.slug), override]));
  const sourceIds = new Set(products.map((product) => product.id));

  const merged = [
    ...products.map((product) =>
      mergeProductOverride(product, overrideBySourceId.get(product.id) ?? overrideBySlug.get(product.slug))
    ),
    ...overrides
      .filter((override) => override.sourceProductId === null || !sourceIds.has(override.sourceProductId))
      .map(mapStandaloneProduct)
  ];

  return merged.filter((product) => {
    if (product.visibility === "private") {
      return options?.includePrivate ?? false;
    }

    if (product.visibility === "hidden") {
      return options?.includeHidden ?? false;
    }

    return true;
  });
}

export async function getProductBySlug(slug: string, options?: {
  includeHidden?: boolean;
  includePrivate?: boolean;
}) {
  const normalizedSlug = normalizeSlug(slug);
  const [{ productsPayload, detailsBySlug, visibleSlugs }, overrides] = await Promise.all([
    getSourceProductData(),
    listPublicAdminProductOverrides()
  ]);
  const requestedOverride = overrides.find((override) => normalizeSlug(override.slug) === normalizedSlug);
  const sourceRecord = requestedOverride?.sourceProductId
    ? productsPayload.records.find((product) => product.id === requestedOverride.sourceProductId)
    : productsPayload.records.find((product) => normalizeSlug(product.slug) === normalizedSlug);
  const source = sourceRecord
    ? await mapSourceProduct(
        sourceRecord,
        detailsBySlug.get(normalizeSlug(sourceRecord.slug)),
        visibleSlugs
      )
    : null;
  const linkedOverride = sourceRecord
    ? overrides.find((override) => override.sourceProductId === sourceRecord.id) ?? requestedOverride
    : requestedOverride;
  const merged = source
    ? mergeProductOverride(source, linkedOverride)
    : requestedOverride
      ? mapStandaloneProduct(requestedOverride)
      : null;
  if (!merged) return null;
  if (merged.visibility === "private" && !options?.includePrivate) return null;
  if (merged.visibility === "hidden" && !options?.includeHidden) return null;
  return merged;
}

export async function getProductAliasTarget(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const productsPayload = await readJson<WpPaged<RawPost>>("products.json");
  const overrides = await listPublicAdminProductOverrides();
  const source = productsPayload.records.find((product) => normalizeSlug(product.slug) === normalizedSlug);
  const override = source
    ? overrides.find((candidate) => candidate.sourceProductId === source.id) ??
      overrides.find((candidate) => normalizeSlug(candidate.slug) === normalizedSlug)
    : overrides.find((candidate) => normalizeSlug(candidate.slug) === normalizedSlug);

  if (!source && !override) return null;
  if (override?.visibility === "private") return null;
  return normalizeSlug(override?.slug ?? source?.slug ?? normalizedSlug);
}

const getDefaultProductCommonIntroHtml = cache(async () => {
  const productsPayload = await readJson<WpPaged<RawPost>>("products.json");
  const source = productsPayload.records.find((product) => normalizeSlug(product.slug) === "207") ?? productsPayload.records[0];
  if (!source) {
    return "";
  }

  const rewritten = await rewriteHtmlAssetUrls(source.content.rendered);
  return splitProductContentSections(rewritten).commonIntroHtml;
});

export async function getProductCommonIntroHtml() {
  const [defaultValue, override] = await Promise.all([
    getDefaultProductCommonIntroHtml(),
    getAdminSetting(productCommonIntroSettingKey)
  ]);

  return override?.value?.trim() ? override.value : defaultValue;
}

export async function getShopPageCount(pageSize = 16) {
  const products = await getProducts();
  return Math.max(1, Math.ceil(products.length / pageSize));
}

const getSourcePages = cache(async (): Promise<PageEntry[]> => {
  const payload = await readJson<WpPaged<RawPost>>("pages.json");

  return Promise.all(
    sortByDateDesc(payload.records).map(async (page) => ({
      id: page.id,
      date: page.date,
      slug: normalizeSlug(page.slug),
      legacyPath: pathFromLink(page.link),
      pathSegments: pathToSegments(page.link),
      link: page.link,
      title: decodeHtmlEntities(page.title.rendered),
      excerptHtml: await rewriteHtmlAssetUrls(page.excerpt.rendered),
      contentHtml: await rewriteHtmlAssetUrls(page.content.rendered),
      visibility: "public" as const,
      accessPassword: null,
      publicationStatus: "published" as const,
      listedInSearch: true,
      allowIndexing: true,
      updatedAt: page.date
    }))
  );
});

function mapAdminPageToEntry(page: AdminPostRecord): PageEntry {
  return {
    id: -page.id,
    date: page.publishedAt,
    slug: page.slug,
    legacyPath: normalizePath(page.path),
    pathSegments: pathToSegments(page.path),
    link: page.path,
    title: page.title,
    excerptHtml: page.excerptHtml,
    contentHtml: page.contentHtml,
    visibility: page.visibility,
    accessPassword: page.visibility === "password" ? page.accessPassword : null,
    publicationStatus: page.publicationStatus,
    listedInSearch: page.listedInSearch,
    allowIndexing: page.allowIndexing,
    updatedAt: page.updatedAt
  };
}

export const getPages = cache(async (): Promise<PageEntry[]> => {
  const [sourcePages, adminPages] = await Promise.all([getSourcePages(), listPublicAdminPages()]);
  const overriddenSourceIds = new Set(
    adminPages.flatMap((page) => (page.sourceId === null ? [] : [page.sourceId]))
  );
  const seenPaths = new Set<string>();
  const merged: PageEntry[] = [];

  for (const page of [
    ...adminPages.map(mapAdminPageToEntry),
    ...sourcePages.filter((page) => !overriddenSourceIds.has(page.id))
  ]) {
    if (seenPaths.has(page.legacyPath)) continue;
    seenPaths.add(page.legacyPath);
    merged.push(page);
  }

  return sortByDateDesc(merged);
});

function isPageLive(page: PageEntry) {
  return page.publicationStatus === "published" && Date.parse(page.date) <= Date.now();
}

export const getPageBySlug = cache(async (slug: string) => {
  const pages = await getPages();
  const normalizedSlug = normalizeSlug(slug);
  const match = pages.find((page) => page.slug === normalizedSlug) ?? null;
  return match && isPageLive(match) && match.visibility !== "private" ? match : null;
});

export const getPageByPath = cache(async (path: string) => {
  const pages = await getPages();
  const normalizedPath = normalizePath(path);
  const match = pages.find((page) => page.legacyPath === normalizedPath) ?? null;
  return match && isPageLive(match) && match.visibility !== "private" ? match : null;
});

const getSourceContentSeed = cache(async (): Promise<AdminPostInput[]> => {
  const [sourcePosts, protectedPosts, sourcePages] = await Promise.all([
    getSourcePosts(),
    getSourceProtectedPosts(),
    getSourcePages()
  ]);
  const protectedIds = new Set(protectedPosts.map((post) => post.id));
  const mergedPosts = [...protectedPosts, ...sourcePosts.filter((post) => !protectedIds.has(post.id))];

  const postInputs: AdminPostInput[] = mergedPosts.map((post) => ({
    contentType: "post",
    sourceId: post.id,
    slug: post.slug,
    path: post.legacyPath,
    title: post.title,
    excerptHtml: post.excerptHtml,
    contentHtml: post.contentHtml,
    publishedAt: post.date,
    visibility: post.visibility,
    accessPassword: post.accessPassword,
    listedInArchive: post.listedInArchive,
    publicationStatus: post.publicationStatus,
    listedInSearch: post.listedInSearch,
    allowIndexing: post.allowIndexing
  }));
  const pageInputs: AdminPostInput[] = sourcePages.map((page) => ({
    contentType: "page",
    sourceId: page.id,
    slug: page.slug,
    path: page.legacyPath,
    title: page.title,
    excerptHtml: page.excerptHtml,
    contentHtml: page.contentHtml,
    publishedAt: page.date,
    visibility: page.visibility,
    accessPassword: page.accessPassword,
    listedInArchive: false,
    publicationStatus: page.publicationStatus,
    listedInSearch: page.listedInSearch,
    allowIndexing: page.allowIndexing
  }));

  return [
    {
      contentType: "page",
      sourceId: 0,
      slug: "home",
      path: "/",
      title: "글 목록",
      excerptHtml: "",
      contentHtml: "",
      publishedAt: new Date(0).toISOString(),
      visibility: "public",
      accessPassword: null,
      listedInArchive: false,
      publicationStatus: "published",
      listedInSearch: false,
      allowIndexing: true
    },
    ...postInputs,
    ...pageInputs
  ];
});

export async function ensureAdminContentCatalog() {
  const [sourceContent, existing] = await Promise.all([getSourceContentSeed(), listAdminContentRequired()]);
  const existingSourceKeys = new Set(
    existing.flatMap((record) =>
      record.sourceId === null ? [] : [`${record.contentType}:${record.sourceId}`]
    )
  );
  const existingPaths = new Set(existing.map((record) => normalizePath(record.path)));
  const missing = sourceContent.filter(
    (record) =>
      record.sourceId !== null &&
      !existingSourceKeys.has(`${record.contentType}:${record.sourceId}`) &&
      !existingPaths.has(normalizePath(record.path))
  );

  if (missing.length === 0) return existing;
  await seedAdminContent(missing);
  return listAdminContentRequired();
}

export async function getHomeSnapshot() {
  const [manifest, posts, products, commentsPayload] = await Promise.all([
    getSiteManifest(),
    getPosts(),
    getProducts(),
    readJson<WpPaged<RawComment>>("comments.json")
  ]);
  const postsById = new Map(posts.map((post) => [post.id, post]));
  const latestComments: HomeCommentEntry[] = sortByDateDesc(commentsPayload.records)
    .map((comment) => {
      const post = postsById.get(comment.post);
      if (!post) {
        return null;
      }

      return {
        id: comment.id,
        postId: post.id,
        postTitle: post.title,
        postPath: post.legacyPath,
        commentPath: `${post.legacyPath}#comment-${comment.id}`,
        authorName: decodeHtmlEntities(comment.author_name),
        date: comment.date,
        excerpt: stripHtml(comment.content.rendered)
      };
    })
    .filter((comment): comment is HomeCommentEntry => comment !== null)
    .slice(0, 6);

  return {
    manifest,
    latestComments,
    posts: posts.slice(0, 8),
    products: products.slice(0, 6)
  };
}

````

</details>

<details><summary><code>lib/site-url.ts</code> — 전체 50줄</summary>

````ts
export type SiteUrlSource = "explicit" | "vercel-production" | "source-fallback";

export type SiteUrlInfo = {
  url: URL;
  source: SiteUrlSource;
};

function normalizeSiteUrl(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must use http or https.`);
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function getSiteUrlInfo(sourceFallback: string): SiteUrlInfo {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (explicit) {
    return { url: normalizeSiteUrl(explicit, "NEXT_PUBLIC_SITE_URL"), source: "explicit" };
  }

  const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionHost) {
    return {
      url: normalizeSiteUrl(`https://${vercelProductionHost}`, "VERCEL_PROJECT_PRODUCTION_URL"),
      source: "vercel-production"
    };
  }

  return { url: normalizeSiteUrl(sourceFallback, "site metadata home"), source: "source-fallback" };
}

export function getSiteUrl(sourceFallback: string) {
  return getSiteUrlInfo(sourceFallback).url;
}

export function toAbsoluteSiteUrl(pathname: string, sourceFallback: string) {
  return new URL(pathname, getSiteUrl(sourceFallback)).toString();
}

````

</details>

<details><summary><code>lib/text-format.ts</code> — 전체 16줄</summary>

````ts
export function normalizePlainText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\t+/g, "  ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

````

</details>

## G. 제품 목표와 기존 운영 문서

디자인 제안이 이미 확정된 운영·노출·성능 조건을 거스르지 않도록 핵심 문서를 원문으로 제공한다.

<details><summary><code>docs/project-brief.md</code> — 전체 27줄</summary>

````markdown
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

````

</details>

<details><summary><code>docs/clone-plan.md</code> — 전체 32줄</summary>

````markdown
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

````

</details>

<details><summary><code>docs/admin-editor.md</code> — 전체 92줄</summary>

````markdown
# Admin Editor and Content Publishing

- 글·페이지 목록은 `/loginpage/posts`, 새 콘텐츠는 `/loginpage/posts/new`, 한 콘텐츠 편집은 `/loginpage/posts/edit/[id]`를 사용한다.
- 상품 편집 화면은 `/loginpage/products/common`, `/loginpage/products/edit/[slug]` 기준으로 동일한 공용 에디터를 사용한다.
- 에디터 컴포넌트: `/home/ahn/aloha/components/admin-html-editor.tsx`
- 업로드 API: `/home/ahn/aloha/app/api/admin/uploads/route.ts`
- Cloudinary 업로드 헬퍼: `/home/ahn/aloha/lib/admin-uploads.ts`

## Editing Modes

- `기본 모드`: 서식이 적용된 상태로 직접 편집
- `HTML 모드`: raw HTML 직접 수정
- 툴바 지원: 굵게, 기울임, 밑줄, 문단, H2, H3, 목록, 번호 목록, 인용, 링크, 링크 해제
- 실행 취소, 다시 실행, 구분선, 서식 지우기, 글자 수, 브라우저 로컬 임시 저장과 복구 지원
- `/loginpage/products` 는 상품 목록, 페이지네이션, 일괄 상태 수정만 담당한다
- 상품 공통 도입부는 `/loginpage/products/common` 에서만 편집한다
- 개별 상품 본문/가격/공개상태 편집은 `/loginpage/products/edit/[slug]` 에서만 렌더링한다

## Upload Behavior

- 이미지/파일은 에디터 내부 `이미지 추가` 버튼 또는 드래그앤드롭으로 업로드 가능
- 여러 파일을 한 번에 처리한다
- 업로드 성공 시 현재 커서 위치에 자동 삽입된다
- API는 Cloudinary SDK 업로드 성공 응답일 때만 `provider: cloudinary`를 반환하며, 편집기는 이 값을 확인한다
- 상태 문구는 `Cloudinary 업로드 중` → `Cloudinary 업로드 완료·본문 삽입·상품 저장 필요` 순서로 표시한다
- 업로드 중에는 폼 제출을 막고 완료 후 다시 저장하도록 알린다
- 이미지: `<img>` 삽입
- 비이미지 파일: 링크 `<a>` 삽입

## Notes

- 로컬 DB가 일시적으로 불가해도 Cloudinary 업로드와 본문 삽입은 계속 동작한다
- 자산 이력 저장은 best-effort이며, DB unavailable 시 `clone_assets` 기록만 건너뛴다
- 상품 목록 페이지는 한 번에 24개씩만 렌더링한다
- 목록 페이지에서는 체크박스로 여러 상품을 선택해 공개범위와 판매 상태를 일괄 변경할 수 있다
- 편집기 HTML은 React 렌더를 기다리지 않고 숨은 폼 필드에 즉시 동기화하며, 제출 직전에도 DOM의 최신 값을 다시 기록한다
- 상품 DB 쓰기 실패는 성공으로 리디렉션하지 않고 오류를 표시한다. 읽기 오류도 서버 인스턴스 수명 전체를 비활성화하지 않고 15초 뒤 재시도한다

## Product Workflow

- 상품 목록의 `복사`는 본문, 요약, 이미지, 가격, 판매상태를 복제한 독립 DB 상품을 만들고 즉시 편집 화면으로 이동한다
- 고객에게 편집 전 복사본이 노출되지 않도록 공개범위만 `비공개`로 시작하며, 검토 후 운영자가 공개한다
- 복사본은 원본 WordPress 상품 ID에 연결하지 않으므로 이후 변경이 원본에 영향을 주지 않는다
- 상품 편집 화면에서 제목, 슬러그, 본문, 이미지 URL, 가격, 공개범위, 판매상태를 수정할 수 있다
- 상단 `공개 상품 보기`는 현재 클라이언트 주소를 새 탭에서 연다
- 원본 연결 상품의 슬러그를 바꾸면 예전 `/product/[slug]` 요청은 새 주소로 영구 이동하고 sitemap도 새 주소를 사용한다
- `링크로만 접근`은 상점·sitemap에서 숨지만 정확한 URL로 접근 가능하고, `비공개`는 정확한 URL을 알아도 404다
- 공개 상품 상세 조회는 전체 목록을 만들지 않고 요청한 원본 ID/슬러그 한 건만 병합해 복사·슬러그 기능이 페이지 로딩을 가중하지 않게 한다

### 227 저장 장애 원인 (2026-07-14)

- 최근 드래그앤드롭 이미지 2개는 Cloudinary `aloha-clone` 폴더에 정상 생성됐지만 `clone_products`에는 227 override가 생성되지 않았다
- 기존 저장 액션이 DB helper의 실패 fallback을 확인하지 않고 항상 `saved=1`로 이동해 실제 실패를 성공처럼 보였다
- DB helper는 한 번 오류가 나면 해당 서버 인스턴스에서 이후 DB 요청까지 영구 차단했다
- 필수 상품 쓰기를 예외 전파 방식으로 분리하고, 실패 UI·짧은 읽기 재시도·제출 직전 HTML 동기화를 적용했다

## Post Workflow

- 첫 관리자 진입 시 배포에 포함된 WordPress 원본 글 16개, 페이지 18개와 홈 설정을 `clone_posts`에 누락분만 편입한다.
- 편입은 `(content_type, source_id)`로 추적하며 기존 DB 경로나 사용자가 수정한 레코드는 덮어쓰지 않는다.
- `글`은 홈 아카이브 노출을 선택할 수 있고, `페이지`는 `/terms` 같은 고정 주소로 관리한다.
- 홈은 `페이지 · /` 레코드로 제목과 상단 안내 본문을 편집하며 글 목록 자체는 계속 자동 생성한다.
- 상품과 상점 상품 목록은 글·페이지 카탈로그에 섞지 않고 상품 관리에서 유지한다.
- 기존 WordPress 원본은 유형을 고정해 글↔페이지 전환으로 원본이 중복 복원되는 것을 방지한다. 새 콘텐츠와 복사본은 유형을 선택할 수 있다.
- 페이지 변경도 공개 화면, 사이트 검색, sitemap, robots metadata에 반영된다.

- `초안`: 관리자에서만 존재하며 URL을 알아도 공개 요청은 404
- `발행`: 발행일시가 현재 이전일 때 공개 가능
- `예약`: 발행 상태지만 발행일시가 미래인 글. 해당 시각 전까지 404
- 목록에서 수정, 복사, 초안/발행 전환 가능
- 복사본은 사고 방지를 위해 `완전 비공개 + 초안 + 목록/검색/색인 끔`으로 생성
- 글 목록에는 에디터를 렌더링하지 않고 한 글 편집 화면에만 에디터 2개를 로드해 관리자 페이지 부담을 제한

## Visibility Matrix

| 설정 | 정확한 URL | 홈/글 목록 | 사이트 검색 | 검색엔진 |
|---|---|---|---|---|
| 공개 | 허용 | 선택 | 선택 | 선택 |
| 링크 전용 | 허용 | 기본 비노출 | 선택 가능 | 강제 noindex |
| 비밀번호 | 서버 암호 확인 후 허용 | 선택 가능 | 강제 비노출 | 강제 noindex |
| 완전 비공개 | 404 | 비노출 | 비노출 | 비노출 |

- 검색 결과에만 표시: `링크 전용 + 홈·글 목록 끔 + 사이트 검색 켬`
- URL을 알아도 완전 차단: `완전 비공개` 또는 `초안`
- `allow_indexing`은 공개 글에서만 효력이 있으며 sitemap과 페이지 robots metadata에 함께 반영

## WordPress Comparison

- 현재 구현이 더 단순한 부분: 한 화면에서 접근/목록/검색/색인 정책을 명시적으로 분리하고, 복사본을 안전한 초안으로 만드는 흐름
- WordPress가 아직 우세한 부분: 서버측 자동 저장, 변경 이력/리비전 비교, 휴지통, 블록 변환, 분류/태그, 대표 이미지 전용 UI, 다중 사용자 승인 흐름
- 다음 우선순위: `clone_post_revisions` 스냅샷과 복원 UI, 휴지통/복구, 서버 자동저장. 이 셋은 운영 실수 복구 가치가 높고 공개 페이지 로딩에는 영향을 주지 않도록 관리자 요청에서만 동작시킨다.

````

</details>

<details><summary><code>docs/asset-pipeline.md</code> — 전체 39줄</summary>

````markdown
# Asset Pipeline

## Goal

- `aloha-yt.xyz` 의 공개 글/페이지/상품 및 보호글 이미지 자산을 Cloudinary로 재호스팅한다.
- WordPress가 생성한 `-300x...`, `-768x...` 썸네일 변형은 원본 단위로 정규화해 업로드 수를 줄인다.
- 런타임 HTML은 Cloudinary manifest를 우선 사용해 source 이미지 의존을 줄인다.

## Data Paths

- raw 다운로드 경로: `/home/vboxuser/aloha_clone/data/assets/raw`
- Cloudinary manifest: `/home/vboxuser/aloha_clone/data/assets/manifest.json`
- 실행 스크립트: `/home/vboxuser/aloha_clone/scripts/sync-assets.ts`

## Current Scope

- public posts/pages/products HTML
- product schema image
- admin export protected/admin-only posts HTML

## Current State

- 2026-07-14 증분 동기화 완료: Cloudinary 자산 `1107` → `1188` (`81`개 추가)
- 기존 외부 404 skip `2`건 유지, 신규 실패 `0`건
- 신규 자산은 모두 `res.cloudinary.com` 응답 200, 로컬 원본/public ID/바이트 기록 검증 완료
- 동일 명령 재실행 시 추가 업로드 없이 총계 `1188` 유지

## Runtime Wiring

- `/home/vboxuser/aloha_clone/lib/asset-utils.ts`
- `/home/vboxuser/aloha_clone/lib/asset-map.ts`
- `/home/vboxuser/aloha_clone/lib/site-data.ts`

## Notes

- 업로드 호스트 alias는 모두 `https://aloha-yt.xyz/wp-content/uploads/...` 로 정규화한다.
- srcset variant URL도 동일 Cloudinary 원본으로 매핑 가능하도록 manifest variant alias를 함께 저장한다.
- raw 다운로드 파일은 로컬 검증용이므로 gitignore 대상이다.

````

</details>

<details><summary><code>docs/browseros-qa.md</code> — 전체 38줄</summary>

````markdown
# BrowserOS Visual QA

## Scope

- BrowserOS 고정 프로필(`/home/vboxuser/web_clone/.browseros-profile`)의 CDP(`127.0.0.1:9100`)에 연결해 clone/source 페이지를 캡처한다.
- clone preview는 guarded `next start` 기준 `http://127.0.0.1:3000` 에서 검증한다.
- source 기준 URL은 기본 `https://aloha-yt.xyz` 이다.

## Target Pages

- clone: `/`, `/column`, `/2025/06/notice`, `/shop`, `/product/208`, `/product/207`, `/product/206`, `/product/205`, `/deposit`, `/my-account`, `/terms`, `/cart`, `/checkout`, `/checkout/order-received/[id]`
- source: `/`, `/2025/06/notice/`, `/shop/`, `/product/208/`, `/product/207/`, `/product/206/`, `/product/205/`, `/deposit/`, `/my-account/`, `/terms/`, `/checkout/`
- protected QA 별도 대상: `/352`, `/1422`, `/2373`

## Current Status

- 최신 local verified run:
- `/home/vboxuser/aloha_clone/artifacts/browseros-targeted-qa/2026-04-07T04-37-35-362Z/report.json`
- 최신 public verified run:
- `/home/vboxuser/aloha_clone/artifacts/browseros-targeted-qa/2026-04-07T04-41-55-951Z/report.json`
- 결과: `checksPassed=true`
- 확인 완료:
- 홈 `글 목록` 헤더, 사이드탭 제거, `/page/2` 페이지네이션
- `/shop` 16개 이하 카드, `/shop/page/2` 링크 존재, direct-only 상품 `207` 목록 숨김
- `/product/207` direct 접근 가능
- `/loginpage` 비밀번호 필드 노출, `/admin` 안내 문구 미노출
- `/352` 잠금/해제 모두 정상
- prerequisite:
- `npm run build:guarded`
- `npm run lint:guarded`
- local preview 기동
- `./scripts/run-guarded.sh npx tsx scripts/browseros-targeted-qa.ts`

## Notes

- source admin/session 확인이 필요한 작업은 BrowserOS에 이미 로그인된 WordPress admin 세션을 사용한다.
- clone 이슈가 없더라도 source 자체 broken image는 참고용으로 별도 기록한다.

````

</details>

<details><summary><code>docs/protected-posts.md</code> — 전체 32줄</summary>

````markdown
# Protected Posts

## Scope

- 기준 파일: `/home/vboxuser/aloha_clone/data/admin-wp-export/protected-posts.json`
- 수집 방식: BrowserOS의 WordPress admin 로그인 세션으로 `wp-admin/edit.php` 와 각 글 편집 화면을 열어 수집
- 목적: 공개 export에 빠지는 비밀번호 보호 글과 admin 전용 글을 별도 추적

## Current Audit

- 비밀번호 보호 + publish 상태 direct URL 대상: `3`건
- post IDs: `352`, `1422`, `2373`
- 동일 비밀번호 값은 `/home/vboxuser/aloha_clone/data/admin-wp-export/protected-posts.json` 에 함께 저장되어 있다.
- clone 반영 규칙:
- 홈/글 목록에는 노출하지 않음
- direct URL(`/{id}`)로만 접근 허용
- 비밀번호 게이트 문구와 잠금 해제 동작 유지
- 잠금 해제 후에는 front-end 렌더링 기준 본문 노출
- 초기 HTML/RSC에는 정답 비밀번호와 보호 본문을 전달하지 않음
- `/api/posts/unlock`에서 서버 검증에 성공한 요청에만 `private, no-store` 응답으로 본문 반환
- IP+경로 단위 10분 8회 실패 제한 적용. 서버리스 인스턴스별 메모리 제한이므로 강한 전역 제한이 필요하면 외부 KV로 이전

## Admin Only

- draft: `293`, `107`
- private: `150`, `142`
- 위 4건은 공개 direct URL parity 대상이 아니라 감사 기록만 유지

## Refresh Command

- `MAX_TREE_RSS_MB=1200 MIN_AVAILABLE_MB=800 ./scripts/run-guarded.sh npm run export:protected`

````

</details>

<details><summary><code>docs/purchase-flow.md</code> — 전체 33줄</summary>

````markdown
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
- 계좌: `[REDACTED_PUBLIC_ACCOUNT_NUMBER]`

## Product/Order Notes

- 상품은 숫자 slug 중심으로 다수 존재한다.
- 품절/예약중 판단은 schema보다 상품 제목 prefix를 더 신뢰한다.
- 주문은 Supabase에 우선 저장하고 localStorage는 동일 브라우저 복구용 보조 수단으로만 사용한다.
- 주문완료 조회는 UUID 주문 ID와 144-bit 무작위 order key가 모두 일치해야 개인정보를 표시한다.

## Admin Needs

- 가격/할인가 조정
- 공개/링크전용/비공개 전환
- 판매 가능/예약중/판매완료 전환

````

</details>

## 10. 리뷰 범위 밖이거나 의도적으로 미첨부한 항목

- `.env*`, `.local/*`, PAT, Vercel/Supabase/Cloudinary 실제 값: 디자인 리뷰에 필요하지 않은 비밀정보다.
- `package-lock.json`, `.next`, `node_modules`: 재현 가능한 의존성 산출물이며 UI 판단에 불필요하다.
- `data/public-wp-export/*.json` 전체: 수 MB 원문·댓글 개인정보·반복 HTML을 포함하므로 7절에 구조와 대표 샘플을 제공했다.
- `data/assets/raw/**`, 이미지 바이너리: 7절에 경로·용량·해시를 제공했고 실제 렌더링은 운영 URL에서 볼 수 있다.
- 배포/백업/DNS/SEO 런북: 시각 디자인과 직접 관련된 제약은 3절에 요약했다.

이 누락 목록 때문에 판단할 수 없는 항목이 있다면, 추측하지 말고 정확히 어떤 데이터가 왜 필요한지 답변 마지막에 별도로 적어 달라.
