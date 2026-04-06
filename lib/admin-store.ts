import { withAdminDb } from "@/lib/admin-db";

export type AdminPostRecord = {
  id: number;
  slug: string;
  path: string;
  title: string;
  excerptHtml: string;
  contentHtml: string;
  publishedAt: string;
  visibility: "public" | "hidden" | "private" | "password";
  accessPassword: string | null;
  listedInArchive: boolean;
};

export type AdminProductOverride = {
  sourceProductId: number | null;
  slug: string;
  title: string | null;
  excerptHtml: string | null;
  contentHtml: string | null;
  imageUrl: string | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
  visibility: "public" | "hidden" | "private";
  stockState: "available" | "reserved" | "soldout";
  updatedAt: string | null;
};

export type AdminAssetRecord = {
  id: number;
  publicId: string;
  secureUrl: string;
  originalFilename: string | null;
  createdAt: string;
};

type AdminPostInput = Omit<AdminPostRecord, "id">;
type AdminProductInput = Omit<AdminProductOverride, "updatedAt">;

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNumberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function listAdminPosts() {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, slug, path, title, excerpt_html, content_html, published_at, visibility, access_password, listed_in_archive
        from clone_posts
        order by published_at desc, id desc
      `
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      slug: row.slug,
      path: row.path,
      title: row.title,
      excerptHtml: row.excerpt_html,
      contentHtml: row.content_html,
      publishedAt: row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at),
      visibility: row.visibility,
      accessPassword: row.access_password,
      listedInArchive: Boolean(row.listed_in_archive)
    })) as AdminPostRecord[];
  }, [] as AdminPostRecord[]);
}

export async function saveAdminPost(input: AdminPostInput) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        insert into clone_posts (
          slug, path, title, excerpt_html, content_html, published_at, visibility, access_password, listed_in_archive, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        on conflict (path) do update
        set
          slug = excluded.slug,
          title = excluded.title,
          excerpt_html = excluded.excerpt_html,
          content_html = excluded.content_html,
          published_at = excluded.published_at,
          visibility = excluded.visibility,
          access_password = excluded.access_password,
          listed_in_archive = excluded.listed_in_archive,
          updated_at = now()
        returning id, slug, path, title, excerpt_html, content_html, published_at, visibility, access_password, listed_in_archive
      `,
      [
        input.slug,
        input.path,
        input.title,
        input.excerptHtml,
        input.contentHtml,
        input.publishedAt,
        input.visibility,
        normalizeNullableText(input.accessPassword),
        input.listedInArchive
      ]
    );

    const row = result.rows[0];
    return {
      id: Number(row.id),
      slug: row.slug,
      path: row.path,
      title: row.title,
      excerptHtml: row.excerpt_html,
      contentHtml: row.content_html,
      publishedAt: row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at),
      visibility: row.visibility,
      accessPassword: row.access_password,
      listedInArchive: Boolean(row.listed_in_archive)
    } as AdminPostRecord;
  }, null as AdminPostRecord | null);
}

export async function listAdminProductOverrides() {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select source_product_id, slug, title, excerpt_html, content_html, image_url, regular_price, sale_price, visibility, stock_state, updated_at
        from clone_products
        order by slug asc
      `
    );

    return result.rows.map((row) => ({
      sourceProductId: row.source_product_id === null ? null : Number(row.source_product_id),
      slug: row.slug,
      title: row.title,
      excerptHtml: row.excerpt_html,
      contentHtml: row.content_html,
      imageUrl: row.image_url,
      regularPriceValue: row.regular_price === null ? null : Number(row.regular_price),
      salePriceValue: row.sale_price === null ? null : Number(row.sale_price),
      visibility: row.visibility,
      stockState: row.stock_state,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    })) as AdminProductOverride[];
  }, [] as AdminProductOverride[]);
}

export async function saveAdminProductOverride(input: AdminProductInput) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        insert into clone_products (
          source_product_id, slug, title, excerpt_html, content_html, image_url,
          regular_price, sale_price, visibility, stock_state, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        on conflict (slug) do update
        set
          source_product_id = excluded.source_product_id,
          title = excluded.title,
          excerpt_html = excluded.excerpt_html,
          content_html = excluded.content_html,
          image_url = excluded.image_url,
          regular_price = excluded.regular_price,
          sale_price = excluded.sale_price,
          visibility = excluded.visibility,
          stock_state = excluded.stock_state,
          updated_at = now()
        returning source_product_id, slug, title, excerpt_html, content_html, image_url, regular_price, sale_price, visibility, stock_state, updated_at
      `,
      [
        input.sourceProductId,
        input.slug,
        normalizeNullableText(input.title),
        normalizeNullableText(input.excerptHtml),
        normalizeNullableText(input.contentHtml),
        normalizeNullableText(input.imageUrl),
        toNumberOrNull(input.regularPriceValue),
        toNumberOrNull(input.salePriceValue),
        input.visibility,
        input.stockState
      ]
    );

    const row = result.rows[0];
    return {
      sourceProductId: row.source_product_id === null ? null : Number(row.source_product_id),
      slug: row.slug,
      title: row.title,
      excerptHtml: row.excerpt_html,
      contentHtml: row.content_html,
      imageUrl: row.image_url,
      regularPriceValue: row.regular_price === null ? null : Number(row.regular_price),
      salePriceValue: row.sale_price === null ? null : Number(row.sale_price),
      visibility: row.visibility,
      stockState: row.stock_state,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    } as AdminProductOverride;
  }, null as AdminProductOverride | null);
}

export async function listAdminAssets() {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select id, public_id, secure_url, original_filename, created_at
        from clone_assets
        order by created_at desc, id desc
        limit 40
      `
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      publicId: row.public_id,
      secureUrl: row.secure_url,
      originalFilename: row.original_filename,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    })) as AdminAssetRecord[];
  }, [] as AdminAssetRecord[]);
}

export async function saveAdminAsset(input: {
  publicId: string;
  secureUrl: string;
  originalFilename: string | null;
}) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        insert into clone_assets (public_id, secure_url, original_filename)
        values ($1, $2, $3)
        on conflict (public_id) do update
        set secure_url = excluded.secure_url,
            original_filename = excluded.original_filename
        returning id, public_id, secure_url, original_filename, created_at
      `,
      [input.publicId, input.secureUrl, normalizeNullableText(input.originalFilename)]
    );

    const row = result.rows[0];
    return {
      id: Number(row.id),
      publicId: row.public_id,
      secureUrl: row.secure_url,
      originalFilename: row.original_filename,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    } as AdminAssetRecord;
  }, null as AdminAssetRecord | null);
}
