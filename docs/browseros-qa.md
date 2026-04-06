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

- 최신 verified run: 아직 없음
- prerequisite:
- `npm run build:guarded`
- `npm run lint:guarded`
- local preview 기동
- `npm run qa:browseros:guarded`
- `npm run qa:protected:guarded`

## Notes

- source admin/session 확인이 필요한 작업은 BrowserOS에 이미 로그인된 WordPress admin 세션을 사용한다.
- clone 이슈가 없더라도 source 자체 broken image는 참고용으로 별도 기록한다.
