import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  getAdminSetting,
  listAdminContentRequired,
  listAdminPages,
  listAdminPagesRequired,
  listAdminPosts,
  listAdminPostsRequired,
  listAdminProductOverrides,
  listAdminProductOverridesRequired,
  seedAdminContent,
  type AdminPostInput,
  type AdminPostRecord,
  type AdminProductOverride
} from "@/lib/admin-store";
import { resolveAssetUrl, rewriteHtmlAssetUrls } from "@/lib/asset-map";
import { getDisplayPriceValue } from "@/lib/product-pricing";

const projectRoot = process.cwd();
const exportDir = path.join(projectRoot, "data", "public-wp-export");
const adminExportDir = path.join(projectRoot, "data", "admin-wp-export");

type WpRendered = {
  rendered: string;
  protected?: boolean;
};

type WpPaged<T> = {
  total: number;
  totalPages: number;
  records: T[];
};

type RawPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  categories?: number[];
  sticky?: boolean;
};

type RawCategory = {
  id: number;
  count: number;
  slug: string;
  name: string;
  parent: number;
};

type RawComment = {
  id: number;
  post: number;
  parent: number;
  author_name: string;
  date: string;
  content: WpRendered;
  link: string;
  status: string;
  type: string;
};

type RawProductDetail = {
  id: number;
  slug: string;
  link: string;
  title: string;
  schema: {
    description?: string;
    image?: string | string[];
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
  } | null;
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

type RawProtectedPost = {
  id: number;
  date: string;
  slug: string;
  rawSlug: string;
  link: string;
  status: string;
  visibility: "password" | "private" | "draft";
  password: string;
  title: string;
  contentHtml: string;
  excerptHtml: string;
  categoryIds: number[];
  categoryNames: string[];
  directPath: string;
  listedInArchive: boolean;
};

type ProtectedPostPayload = {
  capturedAt: string;
  protectedPosts: RawProtectedPost[];
  adminOnlyPosts: RawProtectedPost[];
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

export type CommentNode = {
  id: number;
  authorName: string;
  date: string;
  contentHtml: string;
  link: string;
  children: CommentNode[];
};

export type HomeCommentEntry = {
  id: number;
  postId: number;
  postTitle: string;
  postPath: string;
  commentPath: string;
  authorName: string;
  date: string;
  excerpt: string;
};

export type PostEntry = {
  id: number;
  date: string;
  slug: string;
  legacyPath: string;
  aliasPaths: string[];
  pathSegments: string[];
  link: string;
  title: string;
  excerpt: string;
  excerptHtml: string;
  contentHtml: string;
  coverImageUrl: string | null;
  categoryNames: string[];
  commentCount: number;
  sticky: boolean;
  visibility: "public" | "password" | "hidden" | "private";
  accessPassword: string | null;
  listedInArchive: boolean;
  publicationStatus: "draft" | "published";
  listedInSearch: boolean;
  allowIndexing: boolean;
  updatedAt: string;
};

export type ProductReview = {
  author: string;
  date: string;
  body: string;
  rating: string;
};

export type ProductEntry = {
  id: number;
  overrideId: number | null;
  sourceProductId: number | null;
  date: string;
  slug: string;
  link: string;
  title: string;
  excerpt: string;
  excerptHtml: string;
  contentHtml: string;
  priceText: string | null;
  priceValue: number | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
  imageUrl: string | null;
  description: string;
  ratingValue: string | null;
  reviewCount: number;
  reviews: ProductReview[];
  visibility: "public" | "hidden" | "private";
  stockState: "available" | "reserved" | "soldout";
  publicSignals: RawProductDetail["publicSignals"];
};

export type PageEntry = {
  id: number;
  date: string;
  slug: string;
  legacyPath: string;
  pathSegments: string[];
  link: string;
  title: string;
  excerptHtml: string;
  contentHtml: string;
  visibility: AdminPostRecord["visibility"];
  accessPassword: string | null;
  publicationStatus: AdminPostRecord["publicationStatus"];
  listedInSearch: boolean;
  allowIndexing: boolean;
  updatedAt: string;
};

type SiteManifest = {
  capturedAt: string;
  baseUrl: string;
  counts: {
    posts: number;
    pages: number;
    products: number;
    categories: number;
    productCategories: number;
    comments: number;
  };
};

export type SiteMeta = {
  name: string;
  description: string;
  home: string;
  site_icon_url?: string;
};

const productCommonIntroSettingKey = "product_common_intro_html";

function allowStaticAdminDbFallback() {
  return process.env.ALOHA_SKIP_ADMIN_DB === "1";
}

function listPublicAdminPosts() {
  return allowStaticAdminDbFallback() ? listAdminPosts() : listAdminPostsRequired();
}

function listPublicAdminPages() {
  return allowStaticAdminDbFallback() ? listAdminPages() : listAdminPagesRequired();
}

function listPublicAdminProductOverrides() {
  return allowStaticAdminDbFallback()
    ? listAdminProductOverrides()
    : listAdminProductOverridesRequired();
}

const readJson = cache(async <T>(filename: string): Promise<T> => {
  const raw = await readFile(`${exportDir}/${filename}`, "utf8");
  return JSON.parse(raw) as T;
});

const readAdminJson = cache(async <T>(filename: string): Promise<T> => {
  const raw = await readFile(`${adminExportDir}/${filename}`, "utf8");
  return JSON.parse(raw) as T;
});

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeProtectedTitle(value: string) {
  return decodeHtmlEntities(value).replace(/^보호된 글:\s*/u, "").trim();
}

function extractFirstImageUrl(value: string) {
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function normalizeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(value: string) {
  const compact = value.replace(/\/+$/, "");
  if (!compact) {
    return "/";
  }

  return `/${compact
    .split("/")
    .filter(Boolean)
    .map((segment) => normalizeSlug(segment))
    .join("/")}`;
}

function pathFromLink(value: string) {
  try {
    return normalizePath(new URL(value).pathname);
  } catch {
    return normalizePath(value.startsWith("/") ? value : `/${value}`);
  }
}

function pathToSegments(value: string) {
  return pathFromLink(value).split("/").filter(Boolean);
}

function deriveStockState(title: string, availability?: string) {
  if (title.includes("예약중") || title.includes("예약")) {
    return "reserved" as const;
  }

  if (title.includes("판매완료") || title.includes("품절") || availability?.includes("OutOfStock")) {
    return "soldout" as const;
  }

  return "available" as const;
}

function extractRegularPriceValue(...values: Array<string | null | undefined>) {
  const normalized = decodeHtmlEntities(values.filter(Boolean).join(" "))
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/,/g, "");

  const patterns = [
    /원(?:래)? 가격(?:은)?\s*([0-9]+(?:\.[0-9]+)?)\s*만원/iu,
    /정가(?:는)?\s*([0-9]+(?:\.[0-9]+)?)\s*만원/iu,
    /원(?:래)? 가격(?:은)?\s*([0-9]+)\s*원/iu,
    /정가(?:는)?\s*([0-9]+)\s*원/iu
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) {
      continue;
    }

    const numeric = Number(match[1]);
    if (!Number.isFinite(numeric)) {
      continue;
    }

    return pattern.source.includes("만원") ? Math.round(numeric * 10_000) : Math.round(numeric);
  }

  return null;
}

function findProductIntroBoundary(value: string) {
  const match = value.match(/<h[1-6][^>]*>\s*채널 소개\s*<\/h[1-6]>/i);
  return match?.index ?? -1;
}

function splitProductContentSections(value: string) {
  const boundary = findProductIntroBoundary(value);
  if (boundary < 0) {
    return {
      commonIntroHtml: "",
      bodyHtml: value.trim()
    };
  }

  return {
    commonIntroHtml: value.slice(0, boundary).trim(),
    bodyHtml: value.slice(boundary).trim()
  };
}

function formatPrice(price?: string | number | null, currency?: string) {
  if (price === undefined || price === null || price === "") {
    return null;
  }

  const numeric = Number(price);
  if (Number.isNaN(numeric)) {
    return String(price);
  }

  const formatted = new Intl.NumberFormat("ko-KR").format(numeric);
  return currency === "KRW" || !currency ? `₩${formatted}` : `${formatted} ${currency}`;
}

function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

function sortPostsForHome<T extends { date: string; sticky: boolean }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.sticky !== right.sticky) {
      return Number(right.sticky) - Number(left.sticky);
    }

    return Date.parse(right.date) - Date.parse(left.date);
  });
}

export async function getSiteManifest() {
  return readJson<SiteManifest>("manifest.json");
}

export async function getSiteMeta() {
  const meta = await readJson<SiteMeta>("site-meta.json");
  const originalIconUrl = meta.site_icon_url;
  const resolvedIconUrl = originalIconUrl ? await resolveAssetUrl(originalIconUrl) : null;
  const sourceHost = new URL(meta.home).hostname;
  const resolvedIconHost = resolvedIconUrl ? new URL(resolvedIconUrl, meta.home).hostname : null;
  return {
    ...meta,
    site_icon_url:
      resolvedIconUrl && resolvedIconHost !== sourceHost
        ? resolvedIconUrl
        : "/icon.png"
  };
}

const getShopVisibility = cache(async (): Promise<ShopVisibilityPayload | null> => {
  try {
    return await readJson<ShopVisibilityPayload>("shop-visibility.json");
  } catch {
    return null;
  }
});

const getSourcePosts = cache(async (): Promise<PostEntry[]> => {
  const [postsPayload, categoriesPayload, commentsPayload] = await Promise.all([
    readJson<WpPaged<RawPost>>("posts.json"),
    readJson<WpPaged<RawCategory>>("categories.json"),
    readJson<WpPaged<RawComment>>("comments.json")
  ]);

  const categoryMap = new Map(
    categoriesPayload.records.map((category) => [category.id, decodeHtmlEntities(category.name)])
  );

  const commentCountByPost = new Map<number, number>();
  for (const comment of commentsPayload.records) {
    commentCountByPost.set(comment.post, (commentCountByPost.get(comment.post) ?? 0) + 1);
  }

  return Promise.all(
    sortByDateDesc(postsPayload.records).map(async (post) => {
      const excerptHtml = await rewriteHtmlAssetUrls(post.excerpt.rendered);
      const contentHtml = await rewriteHtmlAssetUrls(post.content.rendered);

      return {
        id: post.id,
        date: post.date,
        slug: normalizeSlug(post.slug),
        legacyPath: pathFromLink(post.link),
        aliasPaths: [],
        pathSegments: pathToSegments(post.link),
        link: post.link,
        title: decodeHtmlEntities(post.title.rendered),
        excerpt: stripHtml(post.excerpt.rendered),
        excerptHtml,
        contentHtml,
        coverImageUrl: extractFirstImageUrl(contentHtml) ?? extractFirstImageUrl(excerptHtml),
        categoryNames: (post.categories ?? []).map((categoryId) => categoryMap.get(categoryId) ?? `#${categoryId}`),
        commentCount: commentCountByPost.get(post.id) ?? 0,
        sticky: post.sticky ?? false,
        visibility: "public" as const,
        accessPassword: null,
        listedInArchive: true,
        publicationStatus: "published" as const,
        listedInSearch: true,
        allowIndexing: true,
        updatedAt: post.date
      };
    })
  );
});

const getSourceProtectedPosts = cache(async (): Promise<PostEntry[]> => {
  let payload: ProtectedPostPayload;

  try {
    payload = await readAdminJson<ProtectedPostPayload>("protected-posts.json");
  } catch {
    return [];
  }

  const categoriesPayload = await readJson<WpPaged<RawCategory>>("categories.json");
  const categoryMap = new Map(
    categoriesPayload.records.map((category) => [category.id, decodeHtmlEntities(category.name)])
  );

  return Promise.all(
    sortByDateDesc(payload.protectedPosts).map(async (post) => {
      const excerptHtml = await rewriteHtmlAssetUrls(post.excerptHtml);
      const contentHtml = await rewriteHtmlAssetUrls(post.contentHtml);
      const primaryPath = pathFromLink(post.link);
      const directPath = normalizePath(post.directPath || `/${post.id}`);
      const shortPath = normalizePath(`/${post.rawSlug || post.slug}`);

      return {
        id: post.id,
        date: post.date,
        slug: normalizeSlug(post.slug),
        legacyPath: primaryPath,
        aliasPaths: [...new Set([directPath, shortPath].filter((path) => path !== primaryPath))],
        pathSegments: pathToSegments(primaryPath),
        link: post.link,
        title: normalizeProtectedTitle(post.title),
        excerpt: stripHtml(post.excerptHtml || post.contentHtml),
        excerptHtml,
        contentHtml,
        coverImageUrl: extractFirstImageUrl(contentHtml) ?? extractFirstImageUrl(excerptHtml),
        categoryNames:
          post.categoryIds.length > 0
            ? post.categoryIds.map((categoryId) => categoryMap.get(categoryId) ?? `#${categoryId}`)
            : post.categoryNames,
        commentCount: 0,
        sticky: false,
        visibility: "password",
        accessPassword: post.password || null,
        listedInArchive: post.listedInArchive,
        publicationStatus: "published" as const,
        listedInSearch: false,
        allowIndexing: false,
        updatedAt: post.date
      };
    })
  );
});

function mapAdminPostToEntry(post: AdminPostRecord): PostEntry {
  return {
    id: -post.id,
    date: post.publishedAt,
    slug: post.slug,
    legacyPath: normalizePath(post.path),
    aliasPaths: [],
    pathSegments: pathToSegments(post.path),
    link: post.path,
    title: post.title,
    excerpt: stripHtml(post.excerptHtml || post.contentHtml),
    excerptHtml: post.excerptHtml,
    contentHtml: post.contentHtml,
    coverImageUrl: extractFirstImageUrl(post.contentHtml) ?? extractFirstImageUrl(post.excerptHtml),
    categoryNames: [],
    commentCount: 0,
    sticky: false,
    visibility: post.visibility,
    accessPassword: post.visibility === "password" ? post.accessPassword : null,
    listedInArchive: post.listedInArchive,
    publicationStatus: post.publicationStatus,
    listedInSearch: post.listedInSearch,
    allowIndexing: post.allowIndexing,
    updatedAt: post.updatedAt
  };
}

const getMergedPosts = cache(async () => {
  const [sourcePosts, protectedPosts, adminPosts] = await Promise.all([
    getSourcePosts(),
    getSourceProtectedPosts(),
    listPublicAdminPosts()
  ]);

  const adminEntries = adminPosts.map(mapAdminPostToEntry);
  const overriddenSourceIds = new Set(
    adminPosts.flatMap((post) => (post.sourceId === null ? [] : [post.sourceId]))
  );
  const ordered = [...adminEntries, ...protectedPosts, ...sourcePosts];
  const seenIds = new Set<number>();
  const seenPaths = new Set<string>();
  const merged: PostEntry[] = [];

  for (const post of ordered) {
    if (post.id > 0 && overriddenSourceIds.has(post.id)) {
      continue;
    }
    if (seenIds.has(post.id) || seenPaths.has(post.legacyPath)) {
      continue;
    }

    merged.push(post);
    seenIds.add(post.id);
    seenPaths.add(post.legacyPath);
  }

  return merged;
});

function isPostLive(post: PostEntry) {
  return post.publicationStatus === "published" && Date.parse(post.date) <= Date.now();
}

export async function getPosts() {
  const posts = await getMergedPosts();
  return sortPostsForHome(
    posts.filter(
      (post) =>
        isPostLive(post) &&
        post.listedInArchive &&
        post.visibility !== "hidden" &&
        post.visibility !== "private"
    )
  );
}

export async function searchPosts(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return [];
  const [posts, pages] = await Promise.all([getMergedPosts(), getPages()]);
  const searchablePages: PostEntry[] = pages.map((page) => ({
    id: -2_000_000_000 - Math.abs(page.id),
    date: page.date,
    slug: page.slug,
    legacyPath: page.legacyPath,
    aliasPaths: [],
    pathSegments: page.pathSegments,
    link: page.link,
    title: page.title,
    excerpt: stripHtml(page.excerptHtml || page.contentHtml),
    excerptHtml: page.excerptHtml,
    contentHtml: page.contentHtml,
    coverImageUrl: extractFirstImageUrl(page.contentHtml) ?? extractFirstImageUrl(page.excerptHtml),
    categoryNames: ["페이지"],
    commentCount: 0,
    sticky: false,
    visibility: page.visibility,
    accessPassword: page.accessPassword,
    listedInArchive: false,
    publicationStatus: page.publicationStatus,
    listedInSearch: page.listedInSearch,
    allowIndexing: page.allowIndexing,
    updatedAt: page.updatedAt
  }));
  return sortPostsForHome(
    [...posts, ...searchablePages].filter((post) => {
      if (
        !isPostLive(post) ||
        !post.listedInSearch ||
        post.visibility === "private" ||
        post.visibility === "password"
      ) {
        return false;
      }
      return `${post.title} ${post.excerpt} ${stripHtml(post.contentHtml)}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalizedQuery);
    })
  ).slice(0, 50);
}

export async function getProtectedPosts() {
  const posts = await getMergedPosts();
  return posts.filter((post) => isPostLive(post) && post.visibility === "password");
}

export async function getPostById(id: number) {
  const posts = await getMergedPosts();
  const match = posts.find((post) => post.id === id) ?? null;
  if (!match || !isPostLive(match) || match.visibility === "private") {
    return null;
  }
  return match;
}

export async function getPostBySlug(slug: string) {
  const posts = await getMergedPosts();
  const normalizedSlug = normalizeSlug(slug);
  const match = posts.find((post) => post.slug === normalizedSlug) ?? null;
  if (!match || !isPostLive(match) || match.visibility === "private") {
    return null;
  }
  return match;
}

export async function getPostByPath(path: string, options?: { includePrivate?: boolean }) {
  const posts = await getMergedPosts();
  const normalizedPath = normalizePath(path);
  const match =
    posts.find((post) => post.legacyPath === normalizedPath || post.aliasPaths.includes(normalizedPath)) ?? null;
  if (!match || !isPostLive(match)) {
    return null;
  }
  if (match.visibility === "private" && !options?.includePrivate) {
    return null;
  }
  return match;
}

export const getPostComments = cache(async (postId: number): Promise<CommentNode[]> => {
  const commentsPayload = await readJson<WpPaged<RawComment>>("comments.json");
  const relevant = commentsPayload.records.filter((comment) => comment.post === postId);
  const rewrittenContent = new Map(
    await Promise.all(relevant.map(async (comment) => [comment.id, await rewriteHtmlAssetUrls(comment.content.rendered)] as const))
  );

  const byParent = new Map<number, RawComment[]>();
  for (const comment of relevant) {
    const bucket = byParent.get(comment.parent) ?? [];
    bucket.push(comment);
    byParent.set(comment.parent, bucket);
  }

  const buildTree = (parentId: number): CommentNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
      .map((comment) => ({
        id: comment.id,
        authorName: decodeHtmlEntities(comment.author_name),
        date: comment.date,
        contentHtml: rewrittenContent.get(comment.id) ?? comment.content.rendered,
        link: comment.link,
        children: buildTree(comment.id)
      }));

  return buildTree(0);
});

async function mapSourceProduct(
  product: RawPost,
  detail: RawProductDetail | undefined,
  visibleSlugs: Set<string> | null
): Promise<ProductEntry> {
  const normalizedSlug = normalizeSlug(product.slug);
  const schema = detail?.schema;
  const primaryOffer = schema?.offers?.[0];
  const numericPrice = Number(primaryOffer?.price);
  const schemaReviews =
    schema?.review?.map((review) => ({
      author: decodeHtmlEntities(review.author?.name ?? ""),
      date: review.datePublished ?? "",
      body: decodeHtmlEntities(review.reviewBody ?? "").trim(),
      rating: String(review.reviewRating?.ratingValue ?? "")
    })) ?? [];
  const extractedReviews = detail?.extractedReviews.map((review) => ({
    author: decodeHtmlEntities(review.author),
    date: review.date,
    body: decodeHtmlEntities(review.body),
    rating: review.rating
  })) ?? [];
  const reviews = extractedReviews.length >= schemaReviews.length ? extractedReviews : schemaReviews;
  const rawReviewCount = schema?.aggregateRating?.reviewCount ?? reviews.length;
  const reviewCount = Number(rawReviewCount) || reviews.length;
  const decodedTitle = decodeHtmlEntities(product.title.rendered);
  const stockState = deriveStockState(decodedTitle, primaryOffer?.availability);
  const fullContentHtml = await rewriteHtmlAssetUrls(product.content.rendered);
  const { bodyHtml } = splitProductContentSections(fullContentHtml);
  const regularPriceValue = extractRegularPriceValue(schema?.description, product.excerpt.rendered, product.content.rendered);
  const resolvedRegularPriceValue =
    regularPriceValue !== null && Number.isFinite(numericPrice) && regularPriceValue > numericPrice ? regularPriceValue : null;
  const salePriceValue = resolvedRegularPriceValue !== null && Number.isFinite(numericPrice) ? numericPrice : null;
  const currentPriceValue = getDisplayPriceValue({
    priceValue: Number.isFinite(numericPrice) ? numericPrice : null,
    regularPriceValue: resolvedRegularPriceValue ?? (Number.isFinite(numericPrice) ? numericPrice : null),
    salePriceValue
  });

  return {
    id: product.id,
    overrideId: null,
    sourceProductId: product.id,
    date: product.date,
    slug: normalizedSlug,
    link: product.link,
    title: decodedTitle,
    excerpt: stripHtml(product.excerpt.rendered),
    excerptHtml: await rewriteHtmlAssetUrls(product.excerpt.rendered),
    contentHtml: bodyHtml,
    priceText: formatPrice(currentPriceValue, primaryOffer?.priceCurrency),
    priceValue: currentPriceValue,
    regularPriceValue: resolvedRegularPriceValue ?? (Number.isFinite(numericPrice) ? numericPrice : null),
    salePriceValue,
    imageUrl: await resolveAssetUrl(
      Array.isArray(schema?.image)
        ? schema.image[0] ?? extractFirstImageUrl(product.content.rendered)
        : schema?.image ?? extractFirstImageUrl(product.content.rendered)
    ),
    description: decodeHtmlEntities(schema?.description ?? ""),
    ratingValue: schema?.aggregateRating?.ratingValue ?? null,
    reviewCount,
    reviews,
    visibility: visibleSlugs && !visibleSlugs.has(normalizedSlug) ? "hidden" : "public",
    stockState,
    publicSignals: detail?.publicSignals ?? {
      hasRefundText: false,
      hasGmailDeliveryText: false,
      hasPdfOptionText: false,
      hasBankTransferText: false
    }
  };
}

function mergeProductOverride(product: ProductEntry, override?: AdminProductOverride): ProductEntry {
  const regularPriceValue = override?.regularPriceValue ?? product.regularPriceValue;
  const salePriceValue = override?.salePriceValue ?? product.salePriceValue;
  const displayValue = getDisplayPriceValue({
    priceValue: product.priceValue,
    regularPriceValue,
    salePriceValue
  });
  const mergedContentHtml = override?.contentHtml ?? product.contentHtml;
  const { bodyHtml } = splitProductContentSections(mergedContentHtml);
  const slug = normalizeSlug(override?.slug ?? product.slug);
  return {
    ...product,
    overrideId: override?.id ?? product.overrideId,
    sourceProductId: override?.sourceProductId ?? product.sourceProductId,
    slug,
    link: `/product/${slug}`,
    title: override?.title ?? product.title,
    excerptHtml: override?.excerptHtml ?? product.excerptHtml,
    contentHtml: bodyHtml,
    excerpt: stripHtml(override?.excerptHtml ?? product.excerptHtml),
    imageUrl: override?.imageUrl ?? product.imageUrl,
    priceValue: displayValue,
    priceText: displayValue !== null ? formatPrice(displayValue, "KRW") : product.priceText,
    regularPriceValue,
    salePriceValue,
    visibility: override?.visibility ?? product.visibility,
    stockState: override?.stockState ?? product.stockState
  };
}

function mapStandaloneProduct(override: AdminProductOverride): ProductEntry {
  const regularPriceValue = override.regularPriceValue;
  const salePriceValue = override.salePriceValue;
  const priceValue = getDisplayPriceValue({
    priceValue: salePriceValue ?? regularPriceValue,
    regularPriceValue,
    salePriceValue
  });
  const excerptHtml = override.excerptHtml ?? "";
  const { bodyHtml } = splitProductContentSections(override.contentHtml ?? "");
  const slug = normalizeSlug(override.slug);

  return {
    id: -override.id,
    overrideId: override.id,
    sourceProductId: override.sourceProductId,
    date: override.updatedAt ?? new Date(0).toISOString(),
    slug,
    link: `/product/${slug}`,
    title: override.title ?? slug,
    excerpt: stripHtml(excerptHtml),
    excerptHtml,
    contentHtml: bodyHtml,
    priceText: priceValue !== null ? formatPrice(priceValue, "KRW") : null,
    priceValue,
    regularPriceValue,
    salePriceValue,
    imageUrl: override.imageUrl,
    description: "",
    ratingValue: null,
    reviewCount: 0,
    reviews: [],
    visibility: override.visibility,
    stockState: override.stockState,
    publicSignals: {
      hasRefundText: false,
      hasGmailDeliveryText: false,
      hasPdfOptionText: false,
      hasBankTransferText: false
    }
  };
}

const getSourceProductData = cache(async () => {
  const [productsPayload, productDetails] = await Promise.all([
    readJson<WpPaged<RawPost>>("products.json"),
    readJson<RawProductDetail[]>("product-details.json")
  ]);

  const detailsBySlug = new Map(productDetails.map((detail) => [normalizeSlug(detail.slug), detail]));
  const visibilityPayload = await getShopVisibility();
  const visibleSlugs = visibilityPayload ? new Set(visibilityPayload.visibleSlugs.map((slug) => normalizeSlug(slug))) : null;

  return { productsPayload, detailsBySlug, visibleSlugs };
});

const getSourceProducts = cache(async (): Promise<ProductEntry[]> => {
  const { productsPayload, detailsBySlug, visibleSlugs } = await getSourceProductData();

  return Promise.all(
    sortByDateDesc(productsPayload.records).map((product) =>
      mapSourceProduct(product, detailsBySlug.get(normalizeSlug(product.slug)), visibleSlugs)
    )
  );
});

export async function getProducts(options?: {
  includeHidden?: boolean;
  includePrivate?: boolean;
  allowAdminDbFallback?: boolean;
}): Promise<ProductEntry[]> {
  const [products, overrides] = await Promise.all([
    getSourceProducts(),
    options?.allowAdminDbFallback ? listAdminProductOverrides() : listPublicAdminProductOverrides()
  ]);
  const overrideBySourceId = new Map(
    overrides
      .filter((override) => override.sourceProductId !== null)
      .map((override) => [override.sourceProductId as number, override])
  );
  const overrideBySlug = new Map(overrides.map((override) => [normalizeSlug(override.slug), override]));
  const sourceIds = new Set(products.map((product) => product.id));

  const merged = [
    ...products.map((product) =>
      mergeProductOverride(product, overrideBySourceId.get(product.id) ?? overrideBySlug.get(product.slug))
    ),
    ...overrides
      .filter((override) => override.sourceProductId === null || !sourceIds.has(override.sourceProductId))
      .map(mapStandaloneProduct)
  ];

  const visible = merged.filter((product) => {
    if (product.visibility === "private") {
      return options?.includePrivate ?? false;
    }

    if (product.visibility === "hidden") {
      return options?.includeHidden ?? false;
    }

    return true;
  });

  return sortByDateDesc(visible);
}

export async function getProductBySlug(slug: string, options?: {
  includeHidden?: boolean;
  includePrivate?: boolean;
}) {
  const normalizedSlug = normalizeSlug(slug);
  const [{ productsPayload, detailsBySlug, visibleSlugs }, overrides] = await Promise.all([
    getSourceProductData(),
    listPublicAdminProductOverrides()
  ]);
  const requestedOverride = overrides.find((override) => normalizeSlug(override.slug) === normalizedSlug);
  const sourceRecord = requestedOverride?.sourceProductId
    ? productsPayload.records.find((product) => product.id === requestedOverride.sourceProductId)
    : productsPayload.records.find((product) => normalizeSlug(product.slug) === normalizedSlug);
  const source = sourceRecord
    ? await mapSourceProduct(
        sourceRecord,
        detailsBySlug.get(normalizeSlug(sourceRecord.slug)),
        visibleSlugs
      )
    : null;
  const linkedOverride = sourceRecord
    ? overrides.find((override) => override.sourceProductId === sourceRecord.id) ?? requestedOverride
    : requestedOverride;
  const merged = source
    ? mergeProductOverride(source, linkedOverride)
    : requestedOverride
      ? mapStandaloneProduct(requestedOverride)
      : null;
  if (!merged) return null;
  if (merged.visibility === "private" && !options?.includePrivate) return null;
  if (merged.visibility === "hidden" && !options?.includeHidden) return null;
  return merged;
}

export async function getProductAliasTarget(slug: string) {
  const normalizedSlug = normalizeSlug(slug);
  const productsPayload = await readJson<WpPaged<RawPost>>("products.json");
  const overrides = await listPublicAdminProductOverrides();
  const source = productsPayload.records.find((product) => normalizeSlug(product.slug) === normalizedSlug);
  const override = source
    ? overrides.find((candidate) => candidate.sourceProductId === source.id) ??
      overrides.find((candidate) => normalizeSlug(candidate.slug) === normalizedSlug)
    : overrides.find((candidate) => normalizeSlug(candidate.slug) === normalizedSlug);

  if (!source && !override) return null;
  // 비공개 상품도 정식 주소로 넘긴다. 그쪽에서 404 대신 "비공개" 안내 화면을 보여준다.
  return normalizeSlug(override?.slug ?? source?.slug ?? normalizedSlug);
}

const getDefaultProductCommonIntroHtml = cache(async () => {
  const productsPayload = await readJson<WpPaged<RawPost>>("products.json");
  const source = productsPayload.records.find((product) => normalizeSlug(product.slug) === "207") ?? productsPayload.records[0];
  if (!source) {
    return "";
  }

  const rewritten = await rewriteHtmlAssetUrls(source.content.rendered);
  return splitProductContentSections(rewritten).commonIntroHtml;
});

export async function getProductCommonIntroHtml() {
  const [defaultValue, override] = await Promise.all([
    getDefaultProductCommonIntroHtml(),
    getAdminSetting(productCommonIntroSettingKey)
  ]);

  return override?.value?.trim() ? override.value : defaultValue;
}

export async function getShopPageCount(pageSize = 16) {
  const products = await getProducts();
  return Math.max(1, Math.ceil(products.length / pageSize));
}

const getSourcePages = cache(async (): Promise<PageEntry[]> => {
  const payload = await readJson<WpPaged<RawPost>>("pages.json");

  return Promise.all(
    sortByDateDesc(payload.records).map(async (page) => ({
      id: page.id,
      date: page.date,
      slug: normalizeSlug(page.slug),
      legacyPath: pathFromLink(page.link),
      pathSegments: pathToSegments(page.link),
      link: page.link,
      title: decodeHtmlEntities(page.title.rendered),
      excerptHtml: await rewriteHtmlAssetUrls(page.excerpt.rendered),
      contentHtml: await rewriteHtmlAssetUrls(page.content.rendered),
      visibility: "public" as const,
      accessPassword: null,
      publicationStatus: "published" as const,
      listedInSearch: true,
      allowIndexing: true,
      updatedAt: page.date
    }))
  );
});

function mapAdminPageToEntry(page: AdminPostRecord): PageEntry {
  return {
    id: -page.id,
    date: page.publishedAt,
    slug: page.slug,
    legacyPath: normalizePath(page.path),
    pathSegments: pathToSegments(page.path),
    link: page.path,
    title: page.title,
    excerptHtml: page.excerptHtml,
    contentHtml: page.contentHtml,
    visibility: page.visibility,
    accessPassword: page.visibility === "password" ? page.accessPassword : null,
    publicationStatus: page.publicationStatus,
    listedInSearch: page.listedInSearch,
    allowIndexing: page.allowIndexing,
    updatedAt: page.updatedAt
  };
}

export const getPages = cache(async (): Promise<PageEntry[]> => {
  const [sourcePages, adminPages] = await Promise.all([getSourcePages(), listPublicAdminPages()]);
  const overriddenSourceIds = new Set(
    adminPages.flatMap((page) => (page.sourceId === null ? [] : [page.sourceId]))
  );
  const seenPaths = new Set<string>();
  const merged: PageEntry[] = [];

  for (const page of [
    ...adminPages.map(mapAdminPageToEntry),
    ...sourcePages.filter((page) => !overriddenSourceIds.has(page.id))
  ]) {
    if (seenPaths.has(page.legacyPath)) continue;
    seenPaths.add(page.legacyPath);
    merged.push(page);
  }

  return sortByDateDesc(merged);
});

function isPageLive(page: PageEntry) {
  return page.publicationStatus === "published" && Date.parse(page.date) <= Date.now();
}

export const getPageBySlug = cache(async (slug: string) => {
  const pages = await getPages();
  const normalizedSlug = normalizeSlug(slug);
  const match = pages.find((page) => page.slug === normalizedSlug) ?? null;
  return match && isPageLive(match) && match.visibility !== "private" ? match : null;
});

export const getPageByPath = cache(async (path: string, options?: { includePrivate?: boolean }) => {
  const pages = await getPages();
  const normalizedPath = normalizePath(path);
  const match = pages.find((page) => page.legacyPath === normalizedPath) ?? null;
  if (!match || !isPageLive(match)) {
    return null;
  }
  if (match.visibility === "private" && !options?.includePrivate) {
    return null;
  }
  return match;
});

const getSourceContentSeed = cache(async (): Promise<AdminPostInput[]> => {
  const [sourcePosts, protectedPosts, sourcePages] = await Promise.all([
    getSourcePosts(),
    getSourceProtectedPosts(),
    getSourcePages()
  ]);
  const protectedIds = new Set(protectedPosts.map((post) => post.id));
  const mergedPosts = [...protectedPosts, ...sourcePosts.filter((post) => !protectedIds.has(post.id))];

  const postInputs: AdminPostInput[] = mergedPosts.map((post) => ({
    contentType: "post",
    sourceId: post.id,
    slug: post.slug,
    path: post.legacyPath,
    title: post.title,
    excerptHtml: post.excerptHtml,
    contentHtml: post.contentHtml,
    publishedAt: post.date,
    visibility: post.visibility,
    accessPassword: post.accessPassword,
    listedInArchive: post.listedInArchive,
    publicationStatus: post.publicationStatus,
    listedInSearch: post.listedInSearch,
    allowIndexing: post.allowIndexing
  }));
  const pageInputs: AdminPostInput[] = sourcePages.map((page) => ({
    contentType: "page",
    sourceId: page.id,
    slug: page.slug,
    path: page.legacyPath,
    title: page.title,
    excerptHtml: page.excerptHtml,
    contentHtml: page.contentHtml,
    publishedAt: page.date,
    visibility: page.visibility,
    accessPassword: page.accessPassword,
    listedInArchive: false,
    publicationStatus: page.publicationStatus,
    listedInSearch: page.listedInSearch,
    allowIndexing: page.allowIndexing
  }));

  return [
    {
      contentType: "page",
      sourceId: 0,
      slug: "home",
      path: "/",
      title: "글 목록",
      excerptHtml: "",
      contentHtml: "",
      publishedAt: new Date(0).toISOString(),
      visibility: "public",
      accessPassword: null,
      listedInArchive: false,
      publicationStatus: "published",
      listedInSearch: false,
      allowIndexing: true
    },
    ...postInputs,
    ...pageInputs
  ];
});

export async function ensureAdminContentCatalog() {
  const [sourceContent, existing] = await Promise.all([getSourceContentSeed(), listAdminContentRequired()]);
  const existingSourceKeys = new Set(
    existing.flatMap((record) =>
      record.sourceId === null ? [] : [`${record.contentType}:${record.sourceId}`]
    )
  );
  const existingPaths = new Set(existing.map((record) => normalizePath(record.path)));
  const missing = sourceContent.filter(
    (record) =>
      record.sourceId !== null &&
      !existingSourceKeys.has(`${record.contentType}:${record.sourceId}`) &&
      !existingPaths.has(normalizePath(record.path))
  );

  if (missing.length === 0) return existing;
  await seedAdminContent(missing);
  return listAdminContentRequired();
}

export async function getHomeSnapshot() {
  const [manifest, posts, products, commentsPayload] = await Promise.all([
    getSiteManifest(),
    getPosts(),
    getProducts(),
    readJson<WpPaged<RawComment>>("comments.json")
  ]);
  const postsById = new Map(posts.map((post) => [post.id, post]));
  const latestComments: HomeCommentEntry[] = sortByDateDesc(commentsPayload.records)
    .map((comment) => {
      const post = postsById.get(comment.post);
      if (!post) {
        return null;
      }

      return {
        id: comment.id,
        postId: post.id,
        postTitle: post.title,
        postPath: post.legacyPath,
        commentPath: `${post.legacyPath}#comment-${comment.id}`,
        authorName: decodeHtmlEntities(comment.author_name),
        date: comment.date,
        excerpt: stripHtml(comment.content.rendered)
      };
    })
    .filter((comment): comment is HomeCommentEntry => comment !== null)
    .slice(0, 6);

  return {
    manifest,
    latestComments,
    posts: posts.slice(0, 8),
    products: products.slice(0, 6)
  };
}
