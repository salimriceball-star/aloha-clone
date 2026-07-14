# Vercel Cutover and SEO Operations

## WordPress/Lightsail replacement status

| WordPress/Lightsail 기능 | 이 프로젝트 대응 |
|---|---|
| XML sitemap 플러그인/코어 | Next.js `/sitemap.xml` 자동 생성. 공개 글·페이지·상품·페이지네이션, canonical 절대 URL, `lastModified` 포함 |
| robots.txt | `/robots.txt` 자동 생성, sitemap 선언, 관리자·API·주문·검색 경로 crawl 제외 |
| 글/상품 SEO 메타 | 페이지별 title, description, canonical, Open Graph, Twitter, robots 정책 |
| Schema 플러그인 | 서버 HTML에 Organization, Article, Product/Offer JSON-LD 삽입 |
| permalink/301 | 기존 날짜 글 경로 유지, 숫자 상품 alias, 상품 slug 변경 redirect, WordPress sitemap 주소 redirect |
| RSS feed | `/feed.xml` 자동 생성, 기존 `/feed`는 영구 redirect |
| Apache 보안 헤더 | Vercel 응답에 nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy 적용 |
| 서버 cron | Vercel Cron이 Supabase 일일 health/keepalive 실행 |
| 코어/플러그인 업데이트 점검 | Dependabot이 npm 업데이트 PR을 매주 생성하고 Vercel이 배포 빌드를 검증 |
| 서버·DB 백업 | 소스는 GitHub, 이미지는 Cloudinary. Supabase Free DB dump는 별도 외부 백업 필요 |

사이트맵 파일을 디스크에 정기 생성할 필요는 없다. 검색봇이 `/sitemap.xml`을 요청할 때 현재 공개 데이터로 XML을 만들며, 관리자 저장 액션은 sitemap cache도 무효화한다. `robots.txt`가 sitemap의 위치를 자동 광고한다.

## Required production environment

Vercel Production 환경에 다음 값을 설정하고 새 production deployment를 실행한다.

```text
NEXT_PUBLIC_SITE_URL=https://aloha-yt.xyz
GOOGLE_SITE_VERIFICATION=<Search Console HTML tag content 값, 선택>
CRON_SECRET=<32-byte 이상 무작위 값>
SUPABASE_DATABASE_URL=<Supavisor transaction pooler :6543 URI, 권장 이름>
```

- `NEXT_PUBLIC_SITE_URL`이 없으면 Vercel의 가장 짧은 production custom domain을 사용한다.
- Vercel system domain도 없을 때만 수집 원본 `site-meta.home`으로 fallback한다.
- 관리자 대시보드에서 실제 SEO 기준 origin과 선택 출처를 확인할 수 있다.
- canonical, Open Graph, JSON-LD, robots sitemap은 모두 같은 origin resolver를 사용한다.

## Domain cutover

1. Vercel project Domains에 apex `aloha-yt.xyz`와 필요한 `www` host를 추가한다.
2. Vercel이 제시한 DNS A/CNAME 값을 DNS 제공자에 반영한다.
3. 한 host를 primary로 선택하고 나머지는 primary로 영구 redirect한다.
4. 전환 전 DNS TTL을 낮추고, 전환 후 HTTPS 인증서·홈·글·상품·checkout·robots·sitemap을 확인한다.
5. 기존 Lightsail은 즉시 삭제하지 말고 snapshot을 남긴 채 최소 2주 보관한다.

같은 도메인과 permalink를 유지하는 hosting-only 이전이면 Google Change of Address는 사용하지 않는다. 도메인 자체가 바뀌는 경우에만 이전/신규 Search Console 속성을 모두 확인하고 Change of Address를 진행한다.

## Search Console checklist

1. DNS TXT 방식으로 Domain property 소유권을 확인한다.
2. `https://aloha-yt.xyz/sitemap.xml`을 제출한다.
3. 이전에 제출한 `/wp-sitemap.xml` 또는 `/sitemap_index.xml`은 새 sitemap으로 308 redirect되는지 확인한다.
4. 홈, 대표 글, 대표 상품을 URL Inspection으로 live test 후 색인을 요청한다.
5. Page indexing, HTTPS, Core Web Vitals, Product snippets 보고서를 주기적으로 확인한다.

Sitemap 제출은 검색 노출 보장이 아니라 발견·canonical 힌트다. 실제 순위는 콘텐츠 품질, 내부 링크, 페이지 속도, 중복/오류 URL, 외부 신뢰 신호에도 좌우된다.

## Dependency security

2026-07-14 기준 호환 범위의 `npm audit fix`를 적용해 Next.js 15.5.20과 XML·네트워크 관련 패치 버전으로 갱신했다. 프로덕션 감사에는 Next 내부 빌드용 PostCSS에서 파생된 중간 위험 2건이 남아 있다. 현재 서비스는 사용자가 CSS를 입력하거나 빌드하지 않아 직접 노출 경로가 없으며, 제시된 강제 수정은 Next 9.3.3으로의 파괴적 다운그레이드이므로 적용하지 않았다. Dependabot의 호환 패치를 우선 적용하고 Vercel preview 빌드 통과 후 배포한다.

## Automated verification

배포 후 다음 명령은 canonical origin, robots, sitemap 절대 URL/중복/lastmod, RSS, WordPress sitemap redirect, private noindex, 보안 헤더, Organization/Article/Product JSON-LD를 검사한다.

```bash
npm run audit:seo -- https://aloha-yt.xyz
```

## Remaining external operations

- Vercel domain/DNS와 환경변수 설정
- Google Search Console sitemap 제출 및 경고 모니터링
- Supabase Free 정기 암호화 dump의 외부 저장 위치 결정
- Vercel/Supabase 장애를 이메일·메신저로 보낼 외부 uptime monitor 연결
- 결제·메일 발송을 추가할 경우 별도의 transactional email 도메인 SPF/DKIM/DMARC 설정
