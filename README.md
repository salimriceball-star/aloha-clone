# aloha-clone

Vercel-first clone project for `aloha-yt.xyz`.

## Current State

- public WordPress export collected
- 2026-07-14 incremental source sync complete: updated `caution`/`appeal`/`terms`, products through numeric slug `227` (`222` absent upstream)
- protected/admin-only post export collected from BrowserOS admin session
- Next.js public routes, checkout flow, admin foundation, SEO scaffold implemented
- post admin supports draft/publish/schedule, edit/copy, public/unlisted/password/private access, archive/search/index controls
- Cloudinary asset sync complete: `1188` mirrored assets, `2` skipped external 404s recorded
- guarded `lint` / guarded `build` / BrowserOS visual QA / BrowserOS protected-post QA completed
- Vercel project connected and production deployed: `https://aloha-clone.vercel.app`
- production smoke test completed

## Key Docs

- `docs/aloha-yt-vercel-cutover-runbook.md` — 실제 전환용 복사·붙여넣기 런북
- `docs/project-brief.md`
- `docs/clone-plan.md`
- `docs/site-audit.md`
- `docs/asset-pipeline.md`
- `docs/browseros-qa.md`
- `docs/vercel-deploy.md`
- `docs/vercel-cutover-seo.md`
- `agents.md`
