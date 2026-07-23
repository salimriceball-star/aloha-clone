작업 일시: 2026-07-24 오전 04:30
작업 배경 및 목표: 프로덕션 상품 '복사' 실패 진단·복구. 증상=복사 안 됨 + "복사할 상품을 찾지 못했습니다" + "Supabase DB에 연결하지 못해..." 경고.

근본 원인(코드 버그 아님, 인프라/자격증명):
- `vercel env pull`로 실제 prod 접속 문자열 받아 pg 직접 테스트.
- `SUPABASE_DATABASE_URL`: 손상(11자, 비-URL) → 런타임 `SUPABASE_DATABASE_URL ?? SUPABASE_DIRECT_URL`로 이걸 먼저 써 즉시 실패.
- `SUPABASE_DIRECT_URL`/`SUPABASE_DB_PASSWORD`: 형식OK지만 **28P01 password auth failed** → 서버 가동 중 pw 거부 = 프로젝트 pause 아님, 비밀번호 rotate 후 env 미갱신(마지막 health 성공 2026-07-23 03:49).

복구(수정 파일 없음, Vercel env만):
- 사용자가 Supabase 대시보드에서 DB pw 재설정 → 새 pw로 txn/session pooler 연결 성공(clone_products=1행) 확인.
- Vercel prod env 3개 교정(pw의 '!'→%21 URL-encode; **파이프 대신 파일 리다이렉트로 add**, 파이프는 문제 없었고 pull 재확인이 하네스 secret 마스킹으로 `[SENSITIVE]`(11자) 표시된 것—실제 저장은 정상):
  SUPABASE_DATABASE_URL=postgresql://postgres.rdmpeokoclnbvlzakqqk:<pw>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
  SUPABASE_DIRECT_URL=…:5432/postgres
  SUPABASE_DB_PASSWORD=<raw pw>
- 주의: SUPABASE_DB_PASSWORD는 admin-auth.ts에서 ADMIN_PASSWORD/ADMIN_SESSION_SECRET의 fallback일 뿐(둘 다 set이라 로그인 영향 없음).
- 최신 Ready 프로덕션 배포를 `vercel redeploy`로 재배포(aloha-yt.xyz alias, Ready 3m).

검증: 재배포 빌드 성공(프리렌더가 DB-required 경로 호출) + 라이브 `/`,`/shop`,`/loginpage` HTTP 200 + `/shop` 상품카드 16개 렌더 + 새 pw 직접 DB 연결 OK. 관리자 복사 실클릭은 로그인 필요라 사용자 확인 요청.

다음 단계/known issues:
- 미완(사용자가 "나중" 선택): 코드 하드닝 2건 sonnet5 위임 대기 — (1) getConnectionString에 postgres 접두 검증(손상 URL이면 fallback), (2) duplicateProductAction의 DB오류를 error=missing 아닌 별도 연결오류로 분기.
- 재발방지: DB pw rotate 시 Vercel env(URL 2개+PW) 동시 갱신+재배포 필수. 참조 [[supabase-pooler-url]].
