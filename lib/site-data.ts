import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { getAdminSetting, listAdminPosts, listAdminProductOverrides, type AdminPostRecord } from "@/lib/admin-store";
import { resolveAssetUrl, rewriteHtmlAssetUrls } from "@/lib/asset-map";

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
};

export type ProductReview = {
  author: string;
  date: string;
  body: string;
  rating: string;
};

export type ProductEntry = {
  id: number;
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

function deriveStockState(title: string) {
  if (title.includes("판매완료")) {
    return "soldout" as const;
  }

  if (title.includes("예약중") || title.includes("예약")) {
    return "reserved" as const;
  }

  return "available" as const;
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

function formatPrice(price?: string | number, currency?: string) {
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
  return readJson<SiteMeta>("site-meta.json");
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
        listedInArchive: true
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

      return {
        id: post.id,
        date: post.date,
        slug: normalizeSlug(post.slug),
        legacyPath: normalizePath(post.directPath || `/${post.id}`),
        pathSegments: pathToSegments(post.directPath || `/${post.id}`),
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
        listedInArchive: post.listedInArchive
      };
    })
  );
});

function mapAdminPostToEntry(post: AdminPostRecord): PostEntry {
  return {
    id: post.id,
    date: post.publishedAt,
    slug: post.slug,
    legacyPath: post.path,
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
    listedInArchive: post.listedInArchive
  };
}

async function getMergedPosts() {
  const [sourcePosts, protectedPosts, adminPosts] = await Promise.all([
    getSourcePosts(),
    getSourceProtectedPosts(),
    listAdminPosts()
  ]);

  const adminEntries = adminPosts.map(mapAdminPostToEntry);
  return [...sourcePosts, ...protectedPosts, ...adminEntries];
}

export async function getPosts() {
  const posts = await getMergedPosts();
  return sortPostsForHome(
    posts.filter((post) => post.listedInArchive && post.visibility !== "hidden" && post.visibility !== "private")
  );
}

export async function getProtectedPosts() {
  const posts = await getMergedPosts();
  return posts.filter((post) => post.visibility === "password");
}

export async function getPostById(id: number) {
  const posts = await getMergedPosts();
  const match = posts.find((post) => post.id === id) ?? null;
  if (!match || match.visibility === "private") {
    return null;
  }
  return match;
}

export async function getPostBySlug(slug: string) {
  const posts = await getMergedPosts();
  const normalizedSlug = normalizeSlug(slug);
  const match = posts.find((post) => post.slug === normalizedSlug) ?? null;
  if (!match || match.visibility === "private") {
    return null;
  }
  return match;
}

export async function getPostByPath(path: string) {
  const posts = await getMergedPosts();
  const normalizedPath = normalizePath(path);
  const match = posts.find((post) => post.legacyPath === normalizedPath) ?? null;
  if (!match || match.visibility === "private") {
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

const getSourceProducts = cache(async (): Promise<ProductEntry[]> => {
  const [productsPayload, productDetails] = await Promise.all([
    readJson<WpPaged<RawPost>>("products.json"),
    readJson<RawProductDetail[]>("product-details.json")
  ]);

  const detailsBySlug = new Map(productDetails.map((detail) => [normalizeSlug(detail.slug), detail]));
  const visibilityPayload = await getShopVisibility();
  const visibleSlugs = visibilityPayload ? new Set(visibilityPayload.visibleSlugs.map((slug) => normalizeSlug(slug))) : null;

  return Promise.all(sortByDateDesc(productsPayload.records).map(async (product) => {
    const normalizedSlug = normalizeSlug(product.slug);
    const detail = detailsBySlug.get(normalizedSlug);
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
    const stockState = deriveStockState(decodedTitle);
    const fullContentHtml = await rewriteHtmlAssetUrls(product.content.rendered);
    const { bodyHtml } = splitProductContentSections(fullContentHtml);

    return {
      id: product.id,
      date: product.date,
      slug: normalizedSlug,
      link: product.link,
      title: decodedTitle,
      excerpt: stripHtml(product.excerpt.rendered),
      excerptHtml: await rewriteHtmlAssetUrls(product.excerpt.rendered),
      contentHtml: bodyHtml,
      priceText: formatPrice(primaryOffer?.price, primaryOffer?.priceCurrency),
      priceValue: Number.isFinite(numericPrice) ? numericPrice : null,
      regularPriceValue: Number.isFinite(numericPrice) ? numericPrice : null,
      salePriceValue: null,
      imageUrl: await resolveAssetUrl(
        Array.isArray(schema?.image) ? schema.image[0] ?? extractFirstImageUrl(product.content.rendered) : schema?.image ?? extractFirstImageUrl(product.content.rendered)
      ),
      description: decodeHtmlEntities(schema?.description ?? ""),
      ratingValue: schema?.aggregateRating?.ratingValue ?? null,
      reviewCount,
      reviews,
      visibility: visibleSlugs && !visibleSlugs.has(normalizedSlug) ? ("hidden" as const) : ("public" as const),
      stockState,
      publicSignals: detail?.publicSignals ?? {
        hasRefundText: false,
        hasGmailDeliveryText: false,
        hasPdfOptionText: false,
        hasBankTransferText: false
      }
    };
  }));
});

export async function getProducts(options?: {
  includeHidden?: boolean;
  includePrivate?: boolean;
}): Promise<ProductEntry[]> {
  const [products, overrides] = await Promise.all([getSourceProducts(), listAdminProductOverrides()]);
  const overrideBySlug = new Map(overrides.map((override) => [override.slug, override]));

  const merged = products.map((product) => {
    const override = overrideBySlug.get(product.slug);
    const regularPriceValue = override?.regularPriceValue ?? product.regularPriceValue;
    const salePriceValue = override?.salePriceValue ?? product.salePriceValue;
    const displayValue = salePriceValue ?? regularPriceValue ?? product.priceValue;
    const mergedContentHtml = override?.contentHtml ?? product.contentHtml;
    const { bodyHtml } = splitProductContentSections(mergedContentHtml);

    return {
      ...product,
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
  });

  return merged.filter((product) => {
    if (product.visibility === "private") {
      return options?.includePrivate ?? false;
    }

    if (product.visibility === "hidden") {
      return options?.includeHidden ?? false;
    }

    return true;
  });
}

export async function getProductBySlug(slug: string, options?: {
  includeHidden?: boolean;
  includePrivate?: boolean;
}) {
  const products = await getProducts(options);
  const normalizedSlug = normalizeSlug(slug);
  return products.find((product) => product.slug === normalizedSlug) ?? null;
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

export const getPages = cache(async (): Promise<PageEntry[]> => {
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
      contentHtml: await rewriteHtmlAssetUrls(page.content.rendered)
    }))
  );
});

export const getPageBySlug = cache(async (slug: string) => {
  const pages = await getPages();
  const normalizedSlug = normalizeSlug(slug);
  return pages.find((page) => page.slug === normalizedSlug) ?? null;
});

export const getPageByPath = cache(async (path: string) => {
  const pages = await getPages();
  const normalizedPath = normalizePath(path);
  return pages.find((page) => page.legacyPath === normalizedPath) ?? null;
});

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
