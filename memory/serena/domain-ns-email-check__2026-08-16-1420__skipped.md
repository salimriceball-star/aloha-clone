# domain-ns-email-check — 2026-08-16 오후 2:20 — skipped

## 배경/목표
Vercel 마케팅 메일 "Complete your domain setup" (네임서버를 ns1/ns2.vercel-dns.com으로 이관 권유). 조치 필요 여부 판정.

## 확인
- 현 구성(Namecheap DNS + A 64.29.17.1/216.198.79.1 + www CNAME vercel-dns-017)은 의도된 컷오버 구성. dig·curl 검증: apex 200, SSL 유효, www 308 정상.
- 이관 안 함(skipped가 결론): Namecheap의 SPF TXT(spf.efwd.registrar-servers.com)는 이메일 포워딩용 — NS를 Vercel로 옮기면 포워딩 끊김(Vercel은 이메일 포워딩 미지원), google-site-verification TXT 재등록도 필요. 이득 없음.

## 참고
- 같은 메일 재수신 시 무시 또는 수신거부. docs/aloha-yt-vercel-cutover-runbook.md 참조.
