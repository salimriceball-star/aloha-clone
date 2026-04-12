import dns from "node:dns";

import { Pool } from "pg";

import { getServerEnv } from "@/lib/server-env";

declare global {
  var __alohaPgPool__: Pool | undefined;
  var __alohaPgSchemaReady__: boolean | undefined;
  var __alohaPgUnavailable__: boolean | undefined;
  var __alohaPgErrorLogged__: boolean | undefined;
}

dns.setDefaultResultOrder("ipv4first");

function getPool() {
  if (process.env.ALOHA_SKIP_ADMIN_DB === "1") {
    return null as Pool | null;
  }

  if (globalThis.__alohaPgUnavailable__) {
    return null as Pool | null;
  }

  const connectionString = getServerEnv("SUPABASE_DIRECT_URL");
  if (!connectionString) {
    return null as Pool | null;
  }

  if (!globalThis.__alohaPgPool__) {
    globalThis.__alohaPgPool__ = new Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 5_000,
      ssl: { rejectUnauthorized: false }
    });
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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

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
  `);

  globalThis.__alohaPgSchemaReady__ = true;
}

export async function withAdminDb<T>(work: (pool: Pool) => Promise<T>, fallback: T) {
  const pool = getPool();
  if (!pool) {
    return fallback;
  }

  try {
    await ensureSchema(pool);
    return await work(pool);
  } catch (error) {
    globalThis.__alohaPgUnavailable__ = true;
    if (!globalThis.__alohaPgErrorLogged__) {
      console.error("[admin-db]", error);
      globalThis.__alohaPgErrorLogged__ = true;
    }
    return fallback;
  }
}
