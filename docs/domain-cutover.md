# Domain Cutover

이 파일은 기존 링크 호환용이다. 실제 `aloha-yt.xyz` 전환은 아래 단일 런북만 사용한다.

- [aloha-yt.xyz → Vercel 복사·붙여넣기 전환 런북](./aloha-yt-vercel-cutover-runbook.md)

요약 명령:

```bash
cd /home/ahn/aloha
npm run vercel:configure-env -- --deploy
npm run cutover:check -- baseline
```

DNS를 변경하기 전에 두 명령이 모두 성공해야 한다. Namecheap 입력값, `www` canary, apex 전환, TLS 검증, Search Console, 롤백은 반드시 전체 런북 순서대로 진행한다.
