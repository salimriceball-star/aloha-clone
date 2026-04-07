import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MetadataRoute } from "next";

import { listAdminPosts, listAdminProductOverrides } from "@/lib/admin-store";

type WpRendered = {
  rendered: string;
};

type WpPaged<T> = {
  records: T[];
};

type RawPost = {
  date: string;
  slug: string;
  link: string;
  title: WpRendered;
};

type RawPage = {
  date: string;
  slug: string;
  link: string;
};

type RawProduct = {
  date: string;
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

  const baseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? siteMeta.home);
  const staticEntries = ["/", "/shop", "/column"];

  const publicAdminPosts = adminPosts.filter(
    (post) => post.visibility === "public" && post.listedInArchive
  );
  const publicPostPaths = [
    ...postsPayload.records.map((post) => pathFromLink(post.link)),
    ...publicAdminPosts.map((post) => pathFromLink(post.path))
  ];

  const homePageCount = Math.max(1, Math.ceil(publicPostPaths.length / 10));
  const paginatedEntries = Array.from({ length: Math.max(0, homePageCount - 1) }, (_, index) => `/page/${index + 2}`);

  const pageEntries = pagesPayload.records
    .filter((page) => !excludedPageSlugs.has(normalizeSlug(page.slug)))
    .map((page) => pathFromLink(page.link));

  const visibleBaseProductSlugs = new Set(visibilityPayload.visibleSlugs.map((slug) => normalizeSlug(slug)));
  const overrideBySlug = new Map(adminProductOverrides.map((override) => [normalizeSlug(override.slug), override]));
  const baseProductSlugs = new Set(productsPayload.records.map((product) => normalizeSlug(product.slug)));

  const publicBaseProducts = productsPayload.records
    .map((product) => {
      const slug = normalizeSlug(product.slug);
      const override = overrideBySlug.get(slug);
      const visibility = override?.visibility ?? (visibleBaseProductSlugs.has(slug) ? "public" : "hidden");
      return visibility === "public" ? `/product/${slug}` : null;
    })
    .filter((entry): entry is string => Boolean(entry));

  const publicOverrideProducts = adminProductOverrides
    .filter((override) => override.visibility === "public" && !baseProductSlugs.has(normalizeSlug(override.slug)))
    .map((override) => `/product/${normalizeSlug(override.slug)}`);

  const publicProductEntries = [...publicBaseProducts, ...publicOverrideProducts];
  const shopPageCount = Math.max(1, Math.ceil(publicProductEntries.length / 16));
  paginatedEntries.push(
    ...Array.from({ length: Math.max(0, shopPageCount - 1) }, (_, index) => `/shop/page/${index + 2}`)
  );

  const allEntries = [...new Set([...staticEntries, ...paginatedEntries, ...publicPostPaths, ...pageEntries, ...publicProductEntries])];

  return allEntries.map((pathname) => ({
    url: new URL(pathname, baseUrl).toString(),
    changeFrequency: pathname.startsWith("/product/") ? "daily" : "weekly",
    priority: pathname === "/" ? 1 : pathname.startsWith("/product/") ? 0.9 : 0.7
  }));
}
