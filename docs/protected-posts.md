# Protected Posts

## Scope

- 기준 파일: `/home/vboxuser/web_clone/data/admin-wp-export/protected-posts.json`
- 수집 방식: BrowserOS의 WordPress admin 로그인 세션으로 `wp-admin/edit.php` 와 각 글 편집 화면을 열어 수집
- 목적: 공개 export에서 빠지는 비밀번호 보호 글과 admin 전용 글을 별도 추적

## Current Audit

- 비밀번호 보호 + direct URL 대상: `8`건
- post IDs: `437`, `432`, `421`, `386`, `379`, `308`, `285`, `238`
- 동일 비밀번호 값은 `/home/vboxuser/web_clone/data/admin-wp-export/protected-posts.json` 에 함께 저장되어 있다.
- clone 반영 규칙:
- 일반 칼럼 목록과 홈 피드에는 노출하지 않음
- 숫자형 direct URL(`/{id}`)로만 접근 허용
- 원본과 같은 비밀번호 문구로 게이트 표시
- 비밀번호 일치 시 본문 노출

## Latest QA

- BrowserOS 보호글 QA 리포트: `/home/vboxuser/web_clone/artifacts/browseros-protected-qa/2026-04-06T12-06-48-984Z/report.json`
- 확인 완료:
- clone `/437` 잠금 화면 표시 및 `1313` 해제 성공
- clone `/285` 잠금 화면 표시 및 `wisdom` 해제 성공
- source `/437`, `/285` 의 잠금 제목/폼 존재 확인
- clone `/column` 에는 보호글 title/direct URL이 노출되지 않음

## Admin Only

- draft: `513`
- private: `338`
- 위 2건은 공개 direct URL parity 대상이 아니라 감사 기록만 유지

## Refresh Command

- `MAX_TREE_RSS_MB=1200 MIN_AVAILABLE_MB=800 ./scripts/run-guarded.sh npm run export:protected`
