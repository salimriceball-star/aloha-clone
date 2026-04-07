작업 일시: 2026-04-07 오전 05:04 UTC
작업 배경 및 목표: `/2024/09/q-shadowban`, `/2024/11/caution` 보호글이 빈 본문으로 보이는 문제와 `/loginpage` 로그인 실패 원인 확인.
수정된 파일 목록 (절대경로): /home/vboxuser/aloha_clone/lib/site-data.ts, /home/vboxuser/aloha_clone/progress.md
주요 변경 사항 상세 설명: 보호글 병합 시 dated path를 `legacyPath`, 숫자 direct URL을 `aliasPaths`로 유지하도록 수정. source/public 중복 post보다 admin 보호글을 우선 채택. 진행표를 hotfix 기준으로 갱신.
검증 결과 (로그, 테스트 결과): guarded lint/build 통과. GitHub main push `79d52c4`. Vercel production deploy `dpl_7cVpAdZjxMvLUiNdA4UeH2RWDVok` READY. public `/2024/09/q-shadowban`, `/2024/11/caution` 모두 `보호된 글` + `password-form` 확인. `/loginpage` 비로그인 폼 확인, BrowserOS 세션은 이미 `/loginpage/dashboard`로 진입됨. 실제 비밀번호는 `lk123!!aS@\``.
참조 문서/memory: /home/vboxuser/aloha_clone/docs/vercel-deploy.md
다음 단계 또는 known issues: 사용자가 `2025/11/caution`로 접근했다면 원본 기준 실제 경로는 `2024/11/caution`.
