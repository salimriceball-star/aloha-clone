# Supabase Security

## Scope

- Supabase project: `rdmpeokoclnbvlzakqqk`
- 이 프로젝트는 `/home/vboxuser/aloha_clone` 과 `/home/vboxuser/web_clone` 이 공유한다.

## Issue

- 2026-04-16 기준 `public` 스키마의 앱 테이블들에 RLS가 꺼져 있었고 `anon`, `authenticated` 에 테이블 권한이 열려 있었다.
- 영향 테이블:
  - `clone_posts`
  - `clone_products`
  - `clone_assets`
  - `clone_settings`
  - `clone_orders`
  - `clone_order_items`
  - `limbic_orders`
  - `limbic_order_items`

## Applied Fix

- 위 테이블 전부 `ENABLE ROW LEVEL SECURITY`
- 위 테이블 전부 `REVOKE ALL ... FROM anon, authenticated`
- `public` 스키마 시퀀스 권한 회수
- `postgres` 기본 권한에서 `anon`, `authenticated` 대상 table/sequence default privilege 회수
- 앱 코드의 schema bootstrap에도 같은 hardening을 반영

## Runtime Note

- 두 앱의 서버 DB 연결은 Supavisor pooler를 거쳐 `postgres` 역할로 접근한다.
- 현재 서버 역할은 `rolbypassrls = true` 이므로 서버측 direct SQL은 계속 동작한다.
- public REST/Data API로는 더 이상 앱 테이블 접근이 되지 않아야 한다.

## Verification

- catalog check: 앱 테이블 8개 모두 `relrowsecurity = true`
- grant check: `public` 스키마 앱 테이블에 대한 `anon`, `authenticated` grant = 0
- REST check:
  - `GET /rest/v1/clone_posts?select=id&limit=1` -> `401`, `permission denied`
  - `GET /rest/v1/limbic_orders?select=id&limit=1` -> `401`, `permission denied`
- app regression:
  - `POST https://project-zui06.vercel.app/api/orders` 정상
  - `POST https://aloha-clone.vercel.app/api/orders` 정상

## Follow-up

- public Data API에 노출할 필요가 없는 새 테이블은 계속 private-by-default로 유지한다.
- 새 public 테이블을 만들 때는 생성 직후 RLS와 권한 회수를 같이 적용한다.
