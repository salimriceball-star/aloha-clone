"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, createAdminSession, requireAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { isUploadableFile, uploadAdminFiles } from "@/lib/admin-uploads";
import { getAdminPostById, saveAdminPost, saveAdminProductOverride, saveAdminSetting } from "@/lib/admin-store";
import { getProductBySlug, getProducts } from "@/lib/site-data";

const productCommonIntroSettingKey = "product_common_intro_html";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePathInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const compact = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return compact.replace(/\/+$/, "") || "/";
}

function formatDatePath(value: string) {
  const parsed = new Date(value);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `/${year}/${month}`;
}

function buildRedirectPath(returnTo: string, fallback: string, params: Record<string, string>) {
  const candidate = returnTo.trim();
  const safeBase = candidate.startsWith("/") ? candidate : fallback;
  const url = new URL(safeBase, "http://localhost");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return `${url.pathname}${url.search}`;
}

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!(await verifyAdminPassword(password))) {
    redirect("/loginpage?error=1");
  }

  await createAdminSession();
  redirect("/loginpage");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/loginpage");
}

export async function savePostAction(formData: FormData) {
  await requireAdminSession();

  const id = Number(formData.get("id") ?? 0) || null;
  const rawSourceId = String(formData.get("sourceId") ?? "").trim();
  const sourceIdValue = rawSourceId ? Number(rawSourceId) : Number.NaN;
  const sourceId = Number.isFinite(sourceIdValue) ? sourceIdValue : null;
  const contentType = formData.get("contentType") === "page" ? "page" : "post";
  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const publishedAt = String(formData.get("publishedAt") ?? new Date().toISOString());
  const rawVisibility = String(formData.get("visibility") ?? "public");
  const visibility = (["public", "hidden", "private", "password"] as const).includes(
    rawVisibility as "public" | "hidden" | "private" | "password"
  )
    ? (rawVisibility as "public" | "hidden" | "private" | "password")
    : "private";
  const accessPassword = String(formData.get("accessPassword") ?? "").trim();
  const listedInArchive = formData.get("listedInArchive") === "on";
  const listedInSearch = formData.get("listedInSearch") === "on";
  const allowIndexing = formData.get("allowIndexing") === "on";
  const intent = String(formData.get("intent") ?? "");
  const publicationStatus = intent === "publish"
    ? "published"
    : intent === "draft"
      ? "draft"
      : formData.get("publicationStatus") === "published"
        ? "published"
        : "draft";
  const excerptHtml = String(formData.get("excerptHtml") ?? "");
  const contentHtml = String(formData.get("contentHtml") ?? "");
  const customPath = normalizePathInput(String(formData.get("path") ?? ""));
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!title || (contentType === "post" && !contentHtml.trim())) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "required" }));
  }

  if (visibility === "password" && !accessPassword) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "password" }));
  }

  const slug = slugify(rawSlug || title);
  const path = customPath || (contentType === "page" ? `/${slug}` : `${formatDatePath(publishedAt)}/${slug}`);
  const previousPost = id ? await getAdminPostById(id) : null;

  const savedPost = await saveAdminPost({
    id,
    contentType,
    sourceId,
    slug,
    path,
    title,
    excerptHtml,
    contentHtml,
    publishedAt,
    visibility,
    accessPassword: visibility === "password" ? accessPassword : null,
    listedInArchive: contentType === "page" || visibility === "private" ? false : listedInArchive,
    publicationStatus,
    listedInSearch: visibility === "private" || visibility === "password" ? false : listedInSearch,
    allowIndexing: visibility === "public" ? allowIndexing : false
  });

  if (!savedPost) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/page/[page]", "page");
  revalidatePath("/column");
  if (previousPost?.path && previousPost.path !== path) revalidatePath(previousPost.path);
  revalidatePath(path);
  revalidatePath("/sitemap.xml");
  redirect(buildRedirectPath(`/loginpage/posts/edit/${savedPost.id}`, "/loginpage/posts", { saved: publicationStatus }));
}

export async function duplicatePostAction(formData: FormData) {
  await requireAdminSession();
  const sourceId = Number(formData.get("id") ?? 0);
  const source = sourceId ? await getAdminPostById(sourceId) : null;
  if (!source) {
    redirect("/loginpage/posts?error=missing");
  }
  const suffix = Date.now().toString(36);
  const copy = await saveAdminPost({
    contentType: source.contentType,
    sourceId: null,
    slug: `${source.slug}-copy-${suffix}`,
    path: `${source.path}-copy-${suffix}`,
    title: `${source.title} (복사본)`,
    excerptHtml: source.excerptHtml,
    contentHtml: source.contentHtml,
    publishedAt: new Date().toISOString(),
    visibility: "private",
    accessPassword: null,
    listedInArchive: false,
    publicationStatus: "draft",
    listedInSearch: false,
    allowIndexing: false
  });
  revalidatePath("/loginpage/posts");
  redirect(copy ? `/loginpage/posts/edit/${copy.id}?copied=1` : "/loginpage/posts?error=copy");
}

export async function setPostPublicationAction(formData: FormData) {
  await requireAdminSession();
  const id = Number(formData.get("id") ?? 0);
  const publicationStatus = formData.get("publicationStatus") === "published" ? "published" : "draft";
  const post = id ? await getAdminPostById(id) : null;
  if (!post) {
    redirect("/loginpage/posts?error=missing");
  }
  const savedPost = await saveAdminPost({
    ...post,
    id: post.id,
    publicationStatus
  });
  if (!savedPost) {
    redirect("/loginpage/posts?error=save");
  }
  revalidatePath("/");
  revalidatePath("/page/[page]", "page");
  revalidatePath("/column");
  revalidatePath(post.path);
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  redirect(`/loginpage/posts?status=${publicationStatus}`);
}

export async function saveProductAction(formData: FormData) {
  await requireAdminSession();

  const overrideId = Number(formData.get("overrideId") ?? 0) || null;
  const originalSlug = slugify(String(formData.get("originalSlug") ?? ""));
  const slug = slugify(String(formData.get("slug") ?? ""));
  const sourceProductId = Number(formData.get("sourceProductId") ?? 0) || null;
  const page = Math.max(1, Number(formData.get("page") ?? 1) || 1);
  const editPath = `/loginpage/products/edit/${encodeURIComponent(originalSlug || slug)}`;
  const errorReturnTo = page > 1 ? `${editPath}?page=${page}` : editPath;
  const rawVisibility = String(formData.get("visibility") ?? "public");
  const visibility = (["public", "hidden", "private"] as const).includes(
    rawVisibility as "public" | "hidden" | "private"
  )
    ? (rawVisibility as "public" | "hidden" | "private")
    : "private";
  const rawStockState = String(formData.get("stockState") ?? "available");
  const stockState = (["available", "reserved", "soldout"] as const).includes(
    rawStockState as "available" | "reserved" | "soldout"
  )
    ? (rawStockState as "available" | "reserved" | "soldout")
    : "available";
  const parsePrice = (value: FormDataEntryValue | null) => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  if (!slug) {
    redirect(buildRedirectPath(errorReturnTo, "/loginpage/products", { error: "slug" }));
  }

  try {
    await saveAdminProductOverride({
      id: overrideId,
      sourceProductId,
      slug,
      title: String(formData.get("title") ?? ""),
      excerptHtml: String(formData.get("excerptHtml") ?? ""),
      contentHtml: String(formData.get("contentHtml") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      regularPriceValue: parsePrice(formData.get("regularPriceValue")),
      salePriceValue: parsePrice(formData.get("salePriceValue")),
      visibility,
      stockState
    });
  } catch (error) {
    console.error("[save-product]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(errorReturnTo, "/loginpage/products", { error: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  if (originalSlug) revalidatePath(`/product/${originalSlug}`);
  revalidatePath(`/product/${slug}`);
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/loginpage/products");
  revalidatePath("/loginpage/products/page/[page]", "page");
  revalidatePath("/sitemap.xml");
  const savedPath = `/loginpage/products/edit/${encodeURIComponent(slug)}`;
  redirect(buildRedirectPath(page > 1 ? `${savedPath}?page=${page}` : savedPath, savedPath, { saved: "1" }));
}

export async function duplicateProductAction(sourceSlug: string, formData: FormData) {
  await requireAdminSession();

  const trimmedSourceSlug = sourceSlug.trim();
  const page = Math.max(1, Number(formData.get("currentPage") ?? 1) || 1);
  const listPath = page > 1 ? `/loginpage/products/page/${page}` : "/loginpage/products";
  const source = trimmedSourceSlug
    ? await getProductBySlug(trimmedSourceSlug, { includeHidden: true, includePrivate: true })
    : null;

  if (!source) {
    redirect(buildRedirectPath(listPath, "/loginpage/products", { error: "missing" }));
  }

  const copySlug = `${source.slug}-copy-${Date.now().toString(36)}`;
  try {
    await saveAdminProductOverride({
      sourceProductId: null,
      slug: copySlug,
      title: source.title,
      excerptHtml: source.excerptHtml,
      contentHtml: source.contentHtml,
      imageUrl: source.imageUrl,
      regularPriceValue: source.regularPriceValue,
      salePriceValue: source.salePriceValue,
      // 복사본은 '링크로만 접근'으로 시작한다. 상점 목록에는 안 뜨지만 주소로는 바로 확인할 수 있어,
      // 공개범위를 손대지 않고 저장했을 때 내용이 통째로 안 보이는 사고를 막는다.
      visibility: "hidden",
      stockState: source.stockState
    });
  } catch (error) {
    console.error("[duplicate-product]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(listPath, "/loginpage/products", { error: "copy" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/loginpage/products");
  revalidatePath("/loginpage/products/page/[page]", "page");
  revalidatePath("/sitemap.xml");
  const editPath = `/loginpage/products/edit/${encodeURIComponent(copySlug)}`;
  redirect(buildRedirectPath(page > 1 ? `${editPath}?page=${page}` : editPath, editPath, { copied: "1" }));
}

export async function saveProductCommonIntroAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = String(formData.get("returnTo") ?? "");

  try {
    await saveAdminSetting({
      key: productCommonIntroSettingKey,
      value: String(formData.get("value") ?? "")
    });
  } catch (error) {
    console.error("[save-product-common-intro]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(returnTo, "/loginpage/products/common", { error: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/sitemap.xml");
  redirect(buildRedirectPath(returnTo, "/loginpage/products/common", { introSaved: "1" }));
}

export async function bulkUpdateProductAction(formData: FormData) {
  await requireAdminSession();

  const returnTo = String(formData.get("returnTo") ?? "");
  const selectedSlugs = formData
    .getAll("selectedSlug")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const visibility = String(formData.get("visibility") ?? "").trim() as "" | "public" | "hidden" | "private";
  const stockState = String(formData.get("stockState") ?? "").trim() as "" | "available" | "reserved" | "soldout";

  if (selectedSlugs.length === 0) {
    redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkError: "selection" }));
  }

  if (!visibility && !stockState) {
    redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkError: "action" }));
  }

  const products = await getProducts({ includeHidden: true, includePrivate: true });
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  let updatedCount = 0;

  try {
    for (const slug of selectedSlugs) {
      const product = productsBySlug.get(slug);
      if (!product) {
        continue;
      }

      await saveAdminProductOverride({
        id: product.overrideId,
        sourceProductId: product.sourceProductId,
        slug: product.slug,
        title: product.title,
        excerptHtml: product.excerptHtml,
        contentHtml: product.contentHtml,
        imageUrl: product.imageUrl,
        regularPriceValue: product.regularPriceValue,
        salePriceValue: product.salePriceValue,
        visibility: visibility || product.visibility,
        stockState: stockState || product.stockState
      });
      updatedCount += 1;
    }
  } catch (error) {
    console.error("[bulk-save-products]", error instanceof Error ? error.message : "Unknown database error");
    redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkError: "save" }));
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/loginpage/products");
  revalidatePath("/loginpage/products/page/[page]", "page");
  revalidatePath("/sitemap.xml");

  redirect(buildRedirectPath(returnTo, "/loginpage/products", { bulkSaved: String(updatedCount) }));
}

export async function uploadAssetAction(formData: FormData) {
  await requireAdminSession();

  const files = formData
    .getAll("file")
    .filter((value): value is File => isUploadableFile(value) && value.size > 0);

  if (files.length === 0) {
    redirect("/loginpage/assets?error=1");
  }

  const folderOverride = String(formData.get("folder") ?? "").trim();
  try {
    await uploadAdminFiles(files, folderOverride);
  } catch (error) {
    console.error("[upload-asset]", error instanceof Error ? error.message : "Unknown upload error");
    redirect("/loginpage/assets?error=save");
  }
  redirect(`/loginpage/assets?uploaded=${files.length}`);
}
