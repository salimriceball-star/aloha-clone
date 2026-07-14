import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MetadataRoute } from "next";

import { listAdminPosts, listAdminProductOverrides } from "@/lib/admin-store";
import { getSiteUrl } from "@/lib/site-url";

type WpRendered = {
  rendered: string;
};

type WpPaged<T> = {
  records: T[];
};

type RawPost = {
  date: string;
  modified?: string;
  slug: string;
  link: string;
  title: WpRendered;
};

type RawPage = {
  date: string;
  modified?: string;
  slug: string;
  link: string;
};

type RawProduct = {
  id: number;
  date: string;
  modified?: string;
  slug: string;
  link: string;
  title: WpRendered;
};

type SiteMeta = {
  home: string;
};

type ShopVisibilityPayload = {
  visibleSlugs: string[];
};

const projectRoot = process.cwd();
const exportDir = path.join(projectRoot, "data", "public-wp-export");

const excludedPageSlugs = new Set([
  "cart",
  "checkout",
  "my-account",
  "thank-you",
  "my-bookings",
  "book-appointment",
  "cancel-appointment",
  "cancel-payment",
  "appointment-cancellation-confirmation"
]);

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeSlug(value: string) {
  return decodeSlug(value).trim();
}

function pathFromLink(value: string) {
  try {
    const pathname = new URL(value).pathname || "/";
    return pathname !== "/" ? pathname.replace(/\/+$/, "") || "/" : pathname;
  } catch {
    const normalized = value.startsWith("/") ? value : `/${value}`;
    return normalized !== "/" ? normalized.replace(/\/+$/, "") || "/" : normalized;
  }
}

function latestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined;
}

async function readJson<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(exportDir, filename), "utf8");
  return JSON.parse(raw) as T;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteMeta, postsPayload, pagesPayload, productsPayload, visibilityPayload, adminPosts, adminProductOverrides] =
    await Promise.all([
      readJson<SiteMeta>("site-meta.json"),
      readJson<WpPaged<RawPost>>("posts.json"),
      readJson<WpPaged<RawPage>>("pages.json"),
      readJson<WpPaged<RawProduct>>("products.json"),
      readJson<ShopVisibilityPayload>("shop-visibility.json"),
      listAdminPosts(),
      listAdminProductOverrides()
    ]);

  const baseUrl = getSiteUrl(siteMeta.home);

  const publicAdminPosts = adminPosts.filter(
    (post) =>
      post.publicationStatus === "published" &&
      Date.parse(post.publishedAt) <= Date.now() &&
      post.visibility === "public" &&
      post.allowIndexing
  );
  const publicPosts = [
    ...postsPayload.records.map((post) => ({
      path: pathFromLink(post.link),
      lastModified: post.modified ?? post.date
    })),
    ...publicAdminPosts.map((post) => ({
      path: pathFromLink(post.path),
      lastModified: post.updatedAt
    }))
  ];
  const latestPostDate = latestDate(publicPosts.map((post) => post.lastModified));

  const homePageCount = Math.max(1, Math.ceil(publicPosts.length / 10));
  const paginatedEntries = Array.from({ length: Math.max(0, homePageCount - 1) }, (_, index) => `/page/${index + 2}`);

  const pageEntries = pagesPayload.records
    .filter((page) => !excludedPageSlugs.has(normalizeSlug(page.slug)))
    .map((page) => ({ path: pathFromLink(page.link), lastModified: page.modified ?? page.date }));

  const visibleBaseProductSlugs = new Set(visibilityPayload.visibleSlugs.map((slug) => normalizeSlug(slug)));
  const overrideBySlug = new Map(adminProductOverrides.map((override) => [normalizeSlug(override.slug), override]));
  const overrideBySourceId = new Map(
    adminProductOverrides
      .filter((override) => override.sourceProductId !== null)
      .map((override) => [override.sourceProductId as number, override])
  );
  const baseProductIds = new Set(productsPayload.records.map((product) => product.id));
  const baseProductSlugs = new Set(productsPayload.records.map((product) => normalizeSlug(product.slug)));

  const publicBaseProducts = productsPayload.records
    .map((product) => {
      const slug = normalizeSlug(product.slug);
      const override = overrideBySourceId.get(product.id) ?? overrideBySlug.get(slug);
      const visibility = override?.visibility ?? (visibleBaseProductSlugs.has(slug) ? "public" : "hidden");
      return visibility === "public"
        ? {
            path: `/product/${normalizeSlug(override?.slug ?? slug)}`,
            lastModified: override?.updatedAt ?? product.modified ?? product.date
          }
        : null;
    })
    .filter((entry): entry is { path: string; lastModified: string } => Boolean(entry));

  const publicOverrideProducts = adminProductOverrides
    .filter(
      (override) =>
        override.visibility === "public" &&
        (override.sourceProductId === null || !baseProductIds.has(override.sourceProductId)) &&
        !baseProductSlugs.has(normalizeSlug(override.slug))
    )
    .map((override) => ({
      path: `/product/${normalizeSlug(override.slug)}`,
      lastModified: override.updatedAt ?? undefined
    }));

  const publicProductEntries = [...publicBaseProducts, ...publicOverrideProducts];
  const latestProductDate = latestDate(publicProductEntries.map((product) => product.lastModified));
  const shopPageCount = Math.max(1, Math.ceil(publicProductEntries.length / 16));
  paginatedEntries.push(
    ...Array.from({ length: Math.max(0, shopPageCount - 1) }, (_, index) => `/shop/page/${index + 2}`)
  );

  const entries = new Map<string, Date | undefined>();
  const addEntry = (pathname: string, lastModified?: string | Date | null) => {
    const parsed = lastModified instanceof Date ? lastModified : latestDate([lastModified]);
    const existing = entries.get(pathname);
    if (!entries.has(pathname) || (parsed && (!existing || parsed > existing))) {
      entries.set(pathname, parsed);
    }
  };

  addEntry("/", latestPostDate);
  addEntry("/column", latestPostDate);
  addEntry("/shop", latestProductDate);
  paginatedEntries.forEach((pathname) => addEntry(pathname, pathname.startsWith("/shop/") ? latestProductDate : latestPostDate));
  publicPosts.forEach((post) => addEntry(post.path, post.lastModified));
  pageEntries.forEach((page) => addEntry(page.path, page.lastModified));
  publicProductEntries.forEach((product) => addEntry(product.path, product.lastModified));

  return [...entries.entries()].map(([pathname, lastModified]) => ({
    url: new URL(pathname, baseUrl).toString(),
    lastModified,
    changeFrequency: pathname.startsWith("/product/") ? "daily" : "weekly",
    priority: pathname === "/" ? 1 : pathname.startsWith("/product/") ? 0.9 : 0.7
  }));
}
