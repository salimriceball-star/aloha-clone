import { withAdminDb } from "@/lib/admin-db";
import type { StoredOrder, StoredOrderItem } from "@/lib/purchase-flow";

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

export type AdminSettingRecord = {
  key: string;
  value: string;
  updatedAt: string | null;
};

export type AdminOrderRecord = StoredOrder & {
  status: "pending" | "paid" | "done" | "cancelled";
};

type AdminPostInput = Omit<AdminPostRecord, "id">;
type AdminProductInput = Omit<AdminProductOverride, "updatedAt">;
type AdminOrderInput = StoredOrder & {
  status?: AdminOrderRecord["status"];
};

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

function mapStoredOrderItem(row: Record<string, unknown>) {
  return {
    id: row.product_id === null ? 0 : Number(row.product_id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    priceText: row.price_text === null ? null : String(row.price_text),
    priceValue: row.price_value === null ? null : Number(row.price_value),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    reviewCount: Number(row.review_count ?? 0),
    stockState:
      row.stock_state === "available" || row.stock_state === "reserved" || row.stock_state === "soldout"
        ? row.stock_state
        : undefined,
    quantity: Number(row.quantity ?? 1),
    lineTotal: Number(row.line_total ?? 0)
  } as StoredOrderItem;
}

function mapStoredOrder(
  row: Record<string, unknown>,
  items: StoredOrderItem[],
  statusOverride?: AdminOrderRecord["status"]
) {
  return {
    id: String(row.id),
    key: String(row.order_key),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    customerName: String(row.customer_name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    memo: String(row.memo ?? ""),
    items,
    totalValue: Number(row.total_value ?? 0),
    totalText: String(row.total_text ?? ""),
    status:
      statusOverride ??
      (row.status === "paid" || row.status === "done" || row.status === "cancelled" ? row.status : "pending")
  } as AdminOrderRecord;
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

export async function getAdminSetting(key: string) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        select key, value, updated_at
        from clone_settings
        where key = $1
        limit 1
      `,
      [key]
    );

    const row = result.rows[0];
    if (!row) {
      return null as AdminSettingRecord | null;
    }

    return {
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    } as AdminSettingRecord;
  }, null as AdminSettingRecord | null);
}

export async function saveAdminSetting(input: { key: string; value: string }) {
  return withAdminDb(async (pool) => {
    const result = await pool.query(
      `
        insert into clone_settings (key, value, updated_at)
        values ($1, $2, now())
        on conflict (key) do update
        set value = excluded.value,
            updated_at = now()
        returning key, value, updated_at
      `,
      [input.key, input.value]
    );

    const row = result.rows[0];
    return {
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    } as AdminSettingRecord;
  }, null as AdminSettingRecord | null);
}

export async function saveAdminOrder(input: AdminOrderInput) {
  return withAdminDb(async (pool) => {
    const client = await pool.connect();

    try {
      await client.query("begin");

      const orderResult = await client.query(
        `
          insert into clone_orders (
            id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          on conflict (id) do update
          set
            order_key = excluded.order_key,
            created_at = excluded.created_at,
            customer_name = excluded.customer_name,
            email = excluded.email,
            phone = excluded.phone,
            memo = excluded.memo,
            total_value = excluded.total_value,
            total_text = excluded.total_text,
            status = excluded.status
          returning id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
        `,
        [
          input.id,
          input.key,
          input.createdAt,
          input.customerName,
          input.email,
          input.phone,
          input.memo,
          input.totalValue,
          input.totalText,
          input.status ?? "pending"
        ]
      );

      await client.query(`delete from clone_order_items where order_id = $1`, [input.id]);

      for (const item of input.items) {
        await client.query(
          `
            insert into clone_order_items (
              order_id, product_id, slug, title, excerpt, price_text, price_value, image_url,
              review_count, stock_state, quantity, line_total
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,
          [
            input.id,
            item.id || null,
            item.slug,
            item.title,
            item.excerpt,
            item.priceText,
            item.priceValue,
            item.imageUrl,
            item.reviewCount,
            item.stockState ?? null,
            item.quantity,
            item.lineTotal
          ]
        );
      }

      await client.query("commit");
      return mapStoredOrder(orderResult.rows[0], input.items, input.status ?? "pending");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }, null as AdminOrderRecord | null);
}

export async function listAdminOrders(limit = 40) {
  return withAdminDb(async (pool) => {
    const orderResult = await pool.query(
      `
        select id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
        from clone_orders
        order by created_at desc, id desc
        limit $1
      `,
      [limit]
    );

    const orders = orderResult.rows;
    if (orders.length === 0) {
      return [] as AdminOrderRecord[];
    }

    const ids = orders.map((row) => String(row.id));
    const itemResult = await pool.query(
      `
        select order_id, product_id, slug, title, excerpt, price_text, price_value, image_url,
               review_count, stock_state, quantity, line_total
        from clone_order_items
        where order_id = any($1::text[])
        order by id asc
      `,
      [ids]
    );

    const itemsByOrderId = new Map<string, StoredOrderItem[]>();
    for (const row of itemResult.rows) {
      const orderId = String(row.order_id);
      const current = itemsByOrderId.get(orderId) ?? [];
      current.push(mapStoredOrderItem(row));
      itemsByOrderId.set(orderId, current);
    }

    return orders.map((row) => mapStoredOrder(row, itemsByOrderId.get(String(row.id)) ?? []));
  }, [] as AdminOrderRecord[]);
}

export async function getAdminOrderById(orderId: string) {
  return withAdminDb(async (pool) => {
    const orderResult = await pool.query(
      `
        select id, order_key, created_at, customer_name, email, phone, memo, total_value, total_text, status
        from clone_orders
        where id = $1
        limit 1
      `,
      [orderId]
    );

    const orderRow = orderResult.rows[0];
    if (!orderRow) {
      return null as AdminOrderRecord | null;
    }

    const itemResult = await pool.query(
      `
        select order_id, product_id, slug, title, excerpt, price_text, price_value, image_url,
               review_count, stock_state, quantity, line_total
        from clone_order_items
        where order_id = $1
        order by id asc
      `,
      [orderId]
    );

    return mapStoredOrder(orderRow, itemResult.rows.map((row) => mapStoredOrderItem(row)));
  }, null as AdminOrderRecord | null);
}
