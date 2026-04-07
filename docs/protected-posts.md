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

## Admin Only

- draft: `293`, `107`
- private: `150`, `142`
- 위 4건은 공개 direct URL parity 대상이 아니라 감사 기록만 유지

## Refresh Command

- `MAX_TREE_RSS_MB=1200 MIN_AVAILABLE_MB=800 ./scripts/run-guarded.sh npm run export:protected`
