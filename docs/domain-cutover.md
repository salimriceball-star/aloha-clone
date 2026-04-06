# Domain Cutover

## Target

- target custom domain: `https://aloha-yt.xyz`
- registrar/DNS UI: 확인 필요
- Vercel project: 생성 후 연결 예정

## Route Parity Targets

- `/2025/06/notice/`
- `/2025/05/q-honey/`
- `/shop/`
- `/product/208/`
- `/product/207/`
- `/product/206/`
- `/product/205/`
- `/deposit/`
- `/cart/`
- `/checkout/`
- `/352/`
- `/1422/`
- `/2373/`

## Cutover Flow

1. Vercel 프로젝트 생성
2. `aloha-yt.xyz` 와 `www.aloha-yt.xyz` 추가
3. primary domain 지정
4. DNS 값 확정
5. registrar에서 apex/www 웹 레코드만 Vercel 기준으로 교체
6. 전파 후 주요 경로 smoke test

## Notes

- 실제 registrar가 Namecheap인지 다른 서비스인지 아직 확인이 필요하다.
- 메일을 사용 중이면 `MX`, `TXT`, `SPF`, `DKIM`, `DMARC` 는 유지하고 웹 연결 레코드만 바꾼다.
