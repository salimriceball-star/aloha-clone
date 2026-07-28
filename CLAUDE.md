# aloha-clone — 세션 시작 지침

## 먼저 읽을 것

작업을 시작하기 전에 **`/home/ahn/aloha/docs/project-overview.md`** 를 읽는다.
데이터 3층 구조(정적 JSON 원본 / Supabase 오버라이드 / Cloudinary 자산), 라우트 지도, `lib/` 역할, 환경변수 위치,
캐싱·배포 방식, 검증 명령, 재발 이력이 모두 정리돼 있다. **구조 파악을 위해 `find`/`ls`로 저장소를 다시 훑지 말고 이 문서를 근거로 삼는다.**
문서와 실제 코드가 어긋나면 코드가 정답이며, 확인한 사실로 이 문서를 갱신한다.

이어서 필요할 때만 참조:

- `/home/ahn/aloha/agents.md` — 프로젝트 운영 규칙(안전, BrowserOS, 크롤 규율, GitHub)
- `/home/ahn/aloha/memory/serena/` — 사건별 원인·수정 작업 기록. **버그 조사 전에 먼저 훑는다**
- `/home/ahn/aloha/progress.md` — 진행 중인 계획

## 최소 규칙

- 검증 1차 관문은 `npm run typecheck`. 빌드는 `npm run build`(내부적으로 `ALOHA_SKIP_ADMIN_DB=1`).
- DB 접속정보는 `.env.local`이 아니라 `.local/supabase.env` (`SUPABASE_DATABASE_URL`).
- 페이지는 대부분 ISR `revalidate = 60`. DB를 직접 고치면 반영까지 최대 60초.
- `main` 푸시는 곧바로 프로덕션 배포(Vercel)다. 푸시는 사용자가 요청했을 때만.
- 작업이 끝나면 `memory/serena/keyword__YYYY-MM-DD-HHmm__status.md` 형식으로 작업 기록을 남긴다.
