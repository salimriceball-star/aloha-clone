# Vercel 방화벽 규칙 설정 안내 (Fluid CPU 절감용)

> 2026-08-11 Fluid Active CPU 92% 소진 대응의 마지막 단계. 코드 쪽 완화(410 라우트, 캐치올 조기 404)는 배포됐지만,
> 방화벽에서 막으면 **함수 호출 자체가 0**이 되어 가장 확실하다. 무료(Hobby) 티어에서도 커스텀 규칙 3개까지 사용 가능.

## 설정 위치

Vercel 대시보드 → `aloha-clone` 프로젝트 → **Firewall** 탭 → **Custom Rules** → *Add Rule*

## 권장 규칙 (우선순위 순)

### 규칙 1 — WP 유물 경로 차단 (Deny)
- If: `Request Path` **starts with** `/wp-content/` **OR** starts with `/wp-includes/` **OR** starts with `/wp-json/` **OR** starts with `/wp-admin/`
- Then: **Deny**
- 효과: 옛 워드프레스 이미지·API 경로로 오는 크롤러/스캐너 트래픽이 엣지에서 차단됨 (8/10 스파이크의 주범)

### 규칙 2 — PHP 프로브 차단 (Deny)
- If: `Request Path` **ends with** `.php`
- Then: **Deny**
- 효과: `/wp-login.php`, `/xmlrpc.php` 등 취약점 스캐너 프로브 차단

### 규칙 3 — WP 피드 경로 차단 (Deny)
- If: `Request Path` **ends with** `/feed`
- Then: **Deny**
- 효과: `/product/97/feed` 같은 옛 RSS 경로 크롤 차단
- ⚠️ 정상 콘텐츠 중 `/feed`로 끝나는 주소가 없음을 확인함(글은 `/YYYY/MM/slug`, 상품은 `/product/N`). 단 `feed.xml`은 `/feed`가 아니라 안전.

## 추가 옵션 (규칙 슬롯이 부족하면 생략 가능)

- **Attack Challenge Mode**: 디도스 의심 시 임시로 켜는 전면 챌린지. 평시에는 꺼둘 것(정상 봇·색인도 막힘).
- 규칙 1·2를 하나로 합치면(OR 조건) 슬롯 절약 가능.

## 확인 방법

규칙 적용 후 `curl -I https://aloha-yt.xyz/wp-content/uploads/x.png` → 403 (Deny)이면 정상.
Firewall 탭의 트래픽 그래프에서 차단 건수를 볼 수 있다.
