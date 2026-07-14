# Supabase Availability

## Runtime connection

- Vercel 런타임은 `SUPABASE_DATABASE_URL`을 우선 사용하고 기존 `SUPABASE_DIRECT_URL`을 호환 fallback으로 사용한다.
- 값은 Supabase Dashboard `Connect`에서 복사한 Supavisor transaction pooler URI여야 한다.
- 서버리스 권장 포트는 `6543`이다. 비밀번호 특수문자는 URI percent-encoding이 필요하다.
- 현재 프로젝트의 기존 `SUPABASE_DIRECT_URL` 값도 이미 `aws-1-ap-south-1.pooler.supabase.com:6543` pooler를 사용하므로 즉시 호환된다.
- pool은 인스턴스당 최대 2개 연결, 연결 5초/쿼리 8초 timeout, idle 10초로 제한한다.
- 필수 쓰기 전 `select 1` preflight를 실행한다. 연결 계열 오류면 기존 pool을 폐기하고 새 pool로 한 번만 재시도한다.

## Daily keepalive and health check

- Vercel Cron: `/api/cron/supabase-health`
- 일정: 매일 `03:17 UTC` (`12:17 KST` 전후, Hobby 실행 시각은 해당 시간대 안에서 변동 가능)
- `clone_products`, `clone_posts`를 실제로 읽고 `clone_settings.supabase_health_last_success`를 갱신한다.
- 성공은 HTTP `200`, DB 연결 실패는 `503`, 인증 실패는 `401`이다.
- Vercel Cron은 실패 요청을 자동 재시도하지 않으므로 Vercel Cron/Function 로그에서 `supabase-health`를 확인한다.
- 관리자 `/loginpage/dashboard`는 현재 DB 연결 상태, 연결 방식, 최근 Cron 성공 시각, 36시간 초과 경고를 표시한다.

## Required Vercel environment

1. Production 환경에 `CRON_SECRET`을 예측 불가능한 32-byte 이상 값으로 추가한다.
2. 가능하면 기존 `SUPABASE_DIRECT_URL`과 같은 pooler URI를 `SUPABASE_DATABASE_URL` 이름으로도 추가한다.
3. 환경변수 변경 후 production을 재배포한다.

Vercel은 Cron 호출 시 `Authorization: Bearer $CRON_SECRET`을 자동 전송한다. endpoint는 정확히 일치할 때만 DB를 호출하며 secret이나 연결 문자열을 응답/로그에 출력하지 않는다.

## Manual verification

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  https://aloha-clone.vercel.app/api/cron/supabase-health
```

- 응답 `ok: true`, `connectionMode: supavisor-transaction` 확인
- `/loginpage/dashboard`에서 최근 성공 시각 확인
- 상품 227을 저장한 뒤 재진입하여 본문 변경 유지 확인

## Free-plan backup

- keepalive는 일시정지 가능성을 낮추지만 보장하지 않는다. 무중단 보장이 필요하면 Pro로 전환한다.
- Free 플랜은 자동 일일 백업이 없으므로 Supabase CLI `db dump`를 이용한 외부 백업을 별도로 운영한다.
