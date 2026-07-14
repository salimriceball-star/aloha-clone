import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { projectRoot, sourceBaseUrl } from "@/lib/project-config";

type WpRendered = {
  rendered: string;
  protected?: boolean;
};

type SourceRecord = {
  id: number;
  date: string;
  modified?: string;
  slug: string;
  status?: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  categories?: number[];
  sticky?: boolean;
};

type PagedPayload = {
  total: number;
  totalPages: number;
  records: SourceRecord[];
};

type ProductSchema = {
  "@type"?: string | string[];
  name?: string;
  url?: string;
  description?: string;
  image?: string | string[];
  sku?: number | string;
  aggregateRating?: {
    ratingValue?: string;
    reviewCount?: number | string;
  };
  review?: Array<{
    author?: { name?: string };
    datePublished?: string;
    reviewBody?: string;
    reviewRating?: { ratingValue?: number | string };
  }>;
  offers?: Array<{
    price?: string | number;
    priceCurrency?: string;
    availability?: string;
  }>;
};

type ProductDetail = {
  id: number;
  slug: string;
  link: string;
  title: string;
  schema: ProductSchema | null;
  extractedReviews: Array<{
    author: string;
    date: string;
    body: string;
    rating: string;
  }>;
  publicSignals: {
    hasRefundText: boolean;
    hasGmailDeliveryText: boolean;
    hasPdfOptionText: boolean;
    hasBankTransferText: boolean;
  };
};

type ProtectedPostPayload = {
  capturedAt: string;
  protectedPosts: Array<{
    id: number;
    password: string;
    title: string;
    contentHtml: string;
    [key: string]: unknown;
  }>;
  adminOnlyPosts: Array<Record<string, unknown>>;
};

type ShopVisibilityPayload = {
  capturedAt: string;
  visibleSlugs: string[];
  pages: Array<{
    page: number;
    count: number;
    slugs: string[];
  }>;
};

const exportDir = join(projectRoot, "data", "public-wp-export");
const protectedPostsPath = join(projectRoot, "data", "admin-wp-export", "protected-posts.json");
const requestDelayMs = Number(process.env.REQUEST_DELAY_MS ?? "1200");
const firstProductSlug = Number(process.env.PRODUCT_FROM_SLUG ?? "209");
const lastProductSlug = Number(process.env.PRODUCT_TO_SLUG ?? "227");
const userAgent = "AlohaCloneIncrementalSync/1.0";
const recordFields = "id,date,modified,slug,status,link,title,content,excerpt,categories,sticky";

function sleep() {
  return requestDelayMs > 0 ? new Promise((resolve) => setTimeout(resolve, requestDelayMs)) : Promise.resolve();
}

async function readJson<T>(filename: string) {
  return JSON.parse(await readFile(join(exportDir, filename), "utf8")) as T;
}

async function writeJson(filename: string, value: unknown) {
  await writeFile(join(exportDir, filename), JSON.stringify(value, null, 2));
}

async function fetchWithRetry(url: URL | string, init?: RequestInit) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "user-agent": userAgent,
          ...init?.headers
        }
      });
      if (response.status >= 500 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchRecord(endpoint: string, slug: string) {
  const url = new URL(endpoint, sourceBaseUrl);
  url.searchParams.set("slug", slug);
  url.searchParams.set("_fields", recordFields);
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.pathname} slug=${slug}: ${response.status}`);
  }
  const records = (await response.json()) as SourceRecord[];
  await sleep();
  return records[0] ?? null;
}

function mergeRecord(payload: PagedPayload, record: SourceRecord) {
  const records = payload.records.filter((candidate) => candidate.id !== record.id && candidate.slug !== record.slug);
  records.push(record);
  records.sort((left, right) => Date.parse(right.date) - Date.parse(left.date) || right.id - left.id);
  return {
    ...payload,
    total: records.length,
    totalPages: Math.max(1, Math.ceil(records.length / 100)),
    records
  };
}

function findProductSchema(input: unknown): ProductSchema | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findProductSchema(item);
      if (found) return found;
    }
    return null;
  }
  const value = input as Record<string, unknown>;
  const type = value["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("Product")) {
    return value as ProductSchema;
  }
  for (const nested of Object.values(value)) {
    const found = findProductSchema(nested);
    if (found) return found;
  }
  return null;
}

async function fetchProductDetail(product: SourceRecord, cheerio: typeof import("cheerio")) {
  const response = await fetchWithRetry(product.link);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${product.link}: ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  let schema: ProductSchema | null = null;
  for (const block of $('script[type="application/ld+json"]')
    .map((_, element) => $(element).html() ?? "")
    .get()) {
    try {
      schema = findProductSchema(JSON.parse(block));
      if (schema) break;
    } catch {}
  }
  const extractedReviews = $("#reviews .commentlist li.review")
    .map((_, node) => {
      const review = $(node);
      return {
        author: review.find(".woocommerce-review__author").text().trim(),
        date: review.find(".woocommerce-review__published-date").attr("datetime") ?? "",
        body: review.find(".description").text().trim(),
        rating: review.find(".star-rating span").text().match(/([0-9.]+)/)?.[1] ?? ""
      };
    })
    .get();
  await sleep();
  return {
    id: product.id,
    slug: product.slug,
    link: product.link,
    title: product.title.rendered,
    schema,
    extractedReviews,
    publicSignals: {
      hasRefundText: html.includes("환불"),
      hasGmailDeliveryText: html.includes("gmail") || html.includes("지메일"),
      hasPdfOptionText: html.includes("PDF") || html.includes("pdf"),
      hasBankTransferText:
        html.includes("무통장") || html.includes("입금") || html.includes("계좌") || html.includes("bacs")
    }
  } satisfies ProductDetail;
}

function slugFromProductUrl(value: string) {
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean);
    return segments[0] === "product" && segments[1] ? decodeURIComponent(segments[1]) : null;
  } catch {
    return null;
  }
}

async function fetchShopVisibility(cheerio: typeof import("cheerio")): Promise<ShopVisibilityPayload> {
  const pages: ShopVisibilityPayload["pages"] = [];
  const visibleSlugs: string[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const path = page === 1 ? "/shop/" : `/shop/page/${page}/`;
    const response = await fetchWithRetry(new URL(path, sourceBaseUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }
    const $ = cheerio.load(await response.text());
    const slugs = $("li.product a[href*='/product/']")
      .map((_, element) => slugFromProductUrl($(element).attr("href") ?? ""))
      .get()
      .filter((slug, index, array): slug is string => Boolean(slug) && array.indexOf(slug) === index);
    if (slugs.length === 0) {
      throw new Error(`No product links found on ${path}`);
    }
    pages.push({ page, count: slugs.length, slugs });
    for (const slug of slugs) {
      if (!visibleSlugs.includes(slug)) visibleSlugs.push(slug);
    }
    totalPages = Math.max(
      totalPages,
      ...$("a.page-numbers")
        .map((_, element) => Number($(element).text().trim()))
        .get()
        .filter(Number.isFinite)
    );
    page += 1;
    await sleep();
  } while (page <= totalPages);
  return { capturedAt: new Date().toISOString(), visibleSlugs, pages };
}

async function refreshCautionContent(cheerio: typeof import("cheerio"), record: SourceRecord) {
  const payload = JSON.parse(await readFile(protectedPostsPath, "utf8")) as ProtectedPostPayload;
  const post = payload.protectedPosts.find((candidate) => candidate.id === record.id);
  if (!post) {
    throw new Error(`Protected post ${record.id} was not found locally`);
  }
  const cautionPassword = process.env.CAUTION_PASSWORD ?? post.password;
  const passwordResponse = await fetchWithRetry(new URL("/wp-login.php?action=postpass", sourceBaseUrl), {
    method: "POST",
    body: new URLSearchParams({ post_password: cautionPassword }),
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });
  const cookie = [...(passwordResponse.headers.get("set-cookie") ?? "").matchAll(/(?:^|,\s*)([^=;,\s]+)=([^;,]*)/g)]
    .map((match) => `${match[1]}=${match[2]}`)
    .join("; ");
  if (!cookie.includes("wp-postpass_")) {
    throw new Error("Caution password cookie was not returned");
  }
  const pageResponse = await fetchWithRetry(record.link, { headers: { cookie } });
  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch unlocked caution page: ${pageResponse.status}`);
  }
  const $ = cheerio.load(await pageResponse.text());
  if ($(".post-password-form").length > 0) {
    throw new Error("Caution page remained password protected");
  }
  const contentHtml = $(".entry-content").first().html()?.trim();
  if (!contentHtml) {
    throw new Error("Unlocked caution content was empty");
  }
  post.title = `보호된 글: ${record.title.rendered}`;
  post.contentHtml = contentHtml;
  post.modified = record.modified ?? null;
  payload.capturedAt = new Date().toISOString();
  await writeFile(protectedPostsPath, JSON.stringify(payload, null, 2));
  await sleep();
}

async function main() {
  if (!Number.isInteger(firstProductSlug) || !Number.isInteger(lastProductSlug) || firstProductSlug > lastProductSlug) {
    throw new Error("PRODUCT_FROM_SLUG and PRODUCT_TO_SLUG must be an ascending integer range");
  }
  if (!("File" in globalThis)) {
    (globalThis as { File?: unknown }).File = class FilePolyfill extends Blob {};
  }
  const cheerio = await import("cheerio");
  let posts = await readJson<PagedPayload>("posts.json");
  let pages = await readJson<PagedPayload>("pages.json");
  let products = await readJson<PagedPayload>("products.json");
  const details = await readJson<ProductDetail[]>("product-details.json");
  const manifest = await readJson<Record<string, unknown> & { counts: Record<string, number> }>("manifest.json");

  const caution = await fetchRecord("/wp-json/wp/v2/posts", "caution");
  const appeal = await fetchRecord("/wp-json/wp/v2/product", "appeal");
  const terms = await fetchRecord("/wp-json/wp/v2/pages", "terms");
  if (!caution || !appeal || !terms) {
    throw new Error("One or more required fixed targets were not found");
  }
  posts = mergeRecord(posts, caution);
  pages = mergeRecord(pages, terms);
  products = mergeRecord(products, appeal);

  const numericProducts: SourceRecord[] = [];
  const missingProductSlugs: string[] = [];
  for (let numericSlug = firstProductSlug; numericSlug <= lastProductSlug; numericSlug += 1) {
    const slug = String(numericSlug);
    const product = await fetchRecord("/wp-json/wp/v2/product", slug);
    if (!product) {
      missingProductSlugs.push(slug);
      console.log(`missing product slug=${slug}`);
      continue;
    }
    products = mergeRecord(products, product);
    numericProducts.push(product);
    console.log(`merged product slug=${slug} id=${product.id}`);
  }

  const targetProducts = [appeal, ...numericProducts];
  const targetDetails = new Map<string, ProductDetail>();
  for (const product of targetProducts) {
    const detail = await fetchProductDetail(product, cheerio);
    targetDetails.set(product.slug, detail);
    console.log(`refreshed product detail slug=${product.slug}`);
  }
  const productOrder = new Map(products.records.map((product, index) => [product.slug, index]));
  const mergedDetails = [
    ...details.filter((detail) => !targetDetails.has(detail.slug)),
    ...targetDetails.values()
  ].sort((left, right) => (productOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) - (productOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER));

  await refreshCautionContent(cheerio, caution);
  const shopVisibility = await fetchShopVisibility(cheerio);
  const capturedAt = new Date().toISOString();
  manifest.capturedAt = capturedAt;
  manifest.counts = {
    ...manifest.counts,
    posts: posts.total,
    pages: pages.total,
    products: products.total
  };
  manifest.incrementalSync = {
    capturedAt,
    fixedTargets: ["caution", "appeal", "terms"],
    productRange: { from: firstProductSlug, to: lastProductSlug },
    mergedProductSlugs: numericProducts.map((product) => product.slug),
    missingProductSlugs
  };

  await Promise.all([
    writeJson("posts.json", posts),
    writeJson("pages.json", pages),
    writeJson("products.json", products),
    writeJson("product-details.json", mergedDetails),
    writeJson("shop-visibility.json", shopVisibility),
    writeJson("manifest.json", manifest)
  ]);
  console.log(
    JSON.stringify(
      {
        capturedAt,
        counts: manifest.counts,
        refreshedProducts: targetProducts.length,
        missingProductSlugs,
        visibleShopProducts: shopVisibility.visibleSlugs.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
