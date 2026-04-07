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
