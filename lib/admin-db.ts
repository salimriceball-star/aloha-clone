import dns from "node:dns";

import { Pool } from "pg";

import { getServerEnv } from "@/lib/server-env";

declare global {
  var __alohaPgPool__: Pool | undefined;
  var __alohaPgConnectionString__: string | undefined;
  var __alohaPgSchemaReady__: boolean | undefined;
  var __alohaPgRetryAt__: number | undefined;
  var __alohaPgErrorLogged__: boolean | undefined;
}

dns.setDefaultResultOrder("ipv4first");

const retryableConnectionCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "57P01",
  "57P02",
  "57P03"
]);

function getConnectionString() {
  return getServerEnv("SUPABASE_DATABASE_URL") ?? getServerEnv("SUPABASE_DIRECT_URL");
}

function isRetryableConnectionError(error: unknown) {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const code = typeof record?.code === "string" ? record.code : "";
  const message = error instanceof Error ? error.message : String(error);

  return (
    retryableConnectionCodes.has(code) ||
    code.startsWith("08") ||
    /connection terminated|connection timeout|connect_timeout|socket hang up|client has already been connected|cannot connect now/i.test(
      message
    )
  );
}

function recyclePool() {
  const pool = globalThis.__alohaPgPool__;
  globalThis.__alohaPgPool__ = undefined;
  globalThis.__alohaPgConnectionString__ = undefined;
  globalThis.__alohaPgSchemaReady__ = false;
  if (pool) {
    void pool.end().catch(() => undefined);
  }
}

function getPool() {
  if (process.env.ALOHA_SKIP_ADMIN_DB === "1") {
    return null as Pool | null;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    return null as Pool | null;
  }

  if (
    globalThis.__alohaPgPool__ &&
    globalThis.__alohaPgConnectionString__ !== connectionString
  ) {
    recyclePool();
  }

  if (!globalThis.__alohaPgPool__) {
    const pool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      query_timeout: 8_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      ssl: { rejectUnauthorized: false }
    });
    pool.on("error", (error) => {
      console.error("[admin-db-pool]", error.message);
      if (globalThis.__alohaPgPool__ === pool) {
        recyclePool();
      }
    });
    globalThis.__alohaPgPool__ = pool;
    globalThis.__alohaPgConnectionString__ = connectionString;
  }

  return globalThis.__alohaPgPool__;
}

async function ensureSchema(pool: Pool) {
  if (globalThis.__alohaPgSchemaReady__) {
    return;
  }

  await pool.query(`
    create table if not exists clone_posts (
      id bigserial primary key,
      slug text not null,
      path text not null unique,
      title text not null,
      excerpt_html text not null default '',
      content_html text not null default '',
      published_at timestamptz not null default now(),
      visibility text not null default 'public' check (visibility in ('public', 'hidden', 'private', 'password')),
      access_password text,
      listed_in_archive boolean not null default true,
      publication_status text not null default 'published' check (publication_status in ('draft', 'published')),
      listed_in_search boolean not null default true,
      allow_indexing boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table if exists clone_posts
      add column if not exists publication_status text not null default 'published';
    alter table if exists clone_posts
      add column if not exists listed_in_search boolean not null default true;
    alter table if exists clone_posts
      add column if not exists allow_indexing boolean not null default true;

    create table if not exists clone_products (
      id bigserial primary key,
      source_product_id bigint unique,
      slug text not null unique,
      title text,
      excerpt_html text,
      content_html text,
      image_url text,
      regular_price bigint,
      sale_price bigint,
      visibility text not null default 'public' check (visibility in ('public', 'hidden', 'private')),
      stock_state text not null default 'available' check (stock_state in ('available', 'reserved', 'soldout')),
      updated_at timestamptz not null default now()
    );

    create table if not exists clone_assets (
      id bigserial primary key,
      public_id text not null unique,
      secure_url text not null,
      original_filename text,
      created_at timestamptz not null default now()
    );

    create table if not exists clone_settings (
      key text primary key,
      value text not null default '',
      updated_at timestamptz not null default now()
    );

    create table if not exists clone_orders (
      id text primary key,
      order_key text not null unique,
      created_at timestamptz not null default now(),
      customer_name text not null default '',
      email text not null default '',
      phone text not null default '',
      memo text not null default '',
      total_value bigint not null default 0,
      total_text text not null default '',
      status text not null default 'pending' check (status in ('pending', 'paid', 'done', 'cancelled'))
    );

    create table if not exists clone_order_items (
      id bigserial primary key,
      order_id text not null references clone_orders(id) on delete cascade,
      product_id bigint,
      slug text not null,
      title text not null,
      excerpt text not null default '',
      price_text text,
      price_value bigint,
      image_url text,
      review_count integer not null default 0,
      stock_state text check (stock_state in ('available', 'reserved', 'soldout')),
      quantity integer not null default 1,
      line_total bigint not null default 0
    );

    alter table if exists public.clone_posts enable row level security;
    alter table if exists public.clone_products enable row level security;
    alter table if exists public.clone_assets enable row level security;
    alter table if exists public.clone_settings enable row level security;
    alter table if exists public.clone_orders enable row level security;
    alter table if exists public.clone_order_items enable row level security;

    revoke all on table public.clone_posts from anon, authenticated;
    revoke all on table public.clone_products from anon, authenticated;
    revoke all on table public.clone_assets from anon, authenticated;
    revoke all on table public.clone_settings from anon, authenticated;
    revoke all on table public.clone_orders from anon, authenticated;
    revoke all on table public.clone_order_items from anon, authenticated;

    revoke all on all sequences in schema public from anon, authenticated;
    alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
    alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
  `);

  globalThis.__alohaPgSchemaReady__ = true;
}

async function runWithConnectionRetry<T>(work: (pool: Pool) => Promise<T>, preflight: boolean) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const pool = getPool();
    if (!pool) {
      throw new Error("Admin database is not configured.");
    }

    try {
      if (preflight) {
        await pool.query("select 1");
      }
      await ensureSchema(pool);
      return await work(pool);
    } catch (error) {
      lastError = error;
      if (attempt === 0 && isRetryableConnectionError(error)) {
        recyclePool();
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export async function withAdminDb<T>(work: (pool: Pool) => Promise<T>, fallback: T) {
  if ((globalThis.__alohaPgRetryAt__ ?? 0) > Date.now()) {
    return fallback;
  }
  if (!getConnectionString() || process.env.ALOHA_SKIP_ADMIN_DB === "1") {
    return fallback;
  }

  try {
    const result = await runWithConnectionRetry(work, false);
    globalThis.__alohaPgRetryAt__ = undefined;
    globalThis.__alohaPgErrorLogged__ = false;
    return result;
  } catch (error) {
    globalThis.__alohaPgRetryAt__ = Date.now() + 15_000;
    if (!globalThis.__alohaPgErrorLogged__) {
      console.error("[admin-db]", error);
      globalThis.__alohaPgErrorLogged__ = true;
    }
    return fallback;
  }
}

export async function withRequiredAdminDb<T>(work: (pool: Pool) => Promise<T>) {
  try {
    const result = await runWithConnectionRetry(work, true);
    globalThis.__alohaPgRetryAt__ = undefined;
    globalThis.__alohaPgErrorLogged__ = false;
    return result;
  } catch (error) {
    globalThis.__alohaPgRetryAt__ = Date.now() + 15_000;
    throw error;
  }
}

export type AdminDbHealthStatus = {
  available: boolean;
  checkedAt: string;
  lastCronSuccessAt: string | null;
  connectionMode: "supavisor-transaction" | "supavisor-session" | "direct" | "unconfigured";
};

function getConnectionMode(): AdminDbHealthStatus["connectionMode"] {
  const connectionString = getConnectionString();
  if (!connectionString) return "unconfigured";

  try {
    const parsed = new URL(connectionString);
    if (parsed.hostname.includes("pooler.supabase.com") && parsed.port === "6543") {
      return "supavisor-transaction";
    }
    if (parsed.hostname.includes("pooler.supabase.com")) {
      return "supavisor-session";
    }
  } catch {}

  return "direct";
}

export async function recordAdminDbHeartbeat() {
  const checkedAt = new Date().toISOString();
  return withRequiredAdminDb(async (pool) => {
    await pool.query("select id from clone_products limit 1");
    await pool.query("select id from clone_posts limit 1");
    await pool.query(
      `
        insert into clone_settings (key, value, updated_at)
        values ('supabase_health_last_success', $1, now())
        on conflict (key) do update
        set value = excluded.value, updated_at = now()
      `,
      [checkedAt]
    );

    return {
      ok: true as const,
      checkedAt,
      connectionMode: getConnectionMode()
    };
  });
}

export async function getAdminDbHealthStatus(): Promise<AdminDbHealthStatus> {
  const checkedAt = new Date().toISOString();
  const connectionMode = getConnectionMode();
  const fallback: AdminDbHealthStatus = {
    available: false,
    checkedAt,
    lastCronSuccessAt: null,
    connectionMode
  };

  return withAdminDb(async (pool) => {
    await pool.query("select 1");
    const result = await pool.query(
      "select value from clone_settings where key = 'supabase_health_last_success' limit 1"
    );
    const value = result.rows[0]?.value;
    const lastCronSuccessAt =
      typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

    return {
      available: true,
      checkedAt,
      lastCronSuccessAt,
      connectionMode
    };
  }, fallback);
}
