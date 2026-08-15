# node20-deprecation-check — 2026-08-15 오후 6:30 — passed

## 배경/목표
Vercel "Node.js 20 discontinued Oct 1" 경고 메일. aloha-clone 영향 판정.

## 확인/조치
- package.json engines "24.x"가 대시보드 설정(20.x)을 덮어써 실제 빌드는 이미 Node 24.x (배포 gdta2jdca 빌드 로그의 override 경고로 확인). 10/1 이후에도 빌드 안 깨짐 — 마이그레이션 불필요.
- 경고 플래그 해소용으로 REST API PATCH(/v9/projects/:id, nodeVersion=24.x)로 대시보드 설정을 24.x로 변경. `vercel project ls --update-required` → 해당 프로젝트 0건 확인.
- 메일에 언급된 project-zui06은 이 저장소와 무관(현 팀 스코프 조회에도 미표시 — 다른 스코프/개인 계정 소속으로 추정).

## 참고
- 코드 변경 없음. 다음 배포부터 설정-엔진 불일치 경고도 사라짐.
