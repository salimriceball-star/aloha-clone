"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, createAdminSession, requireAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { isUploadableFile, uploadAdminFiles } from "@/lib/admin-uploads";
import { getAdminPostById, saveAdminPost, saveAdminProductOverride, saveAdminSetting } from "@/lib/admin-store";
import { getProducts } from "@/lib/site-data";

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
  return compact.replace(/\/+$/, "");
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

  if (!title || !contentHtml.trim()) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "required" }));
  }

  if (visibility === "password" && !accessPassword) {
    redirect(buildRedirectPath(returnTo, id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts/new", { error: "password" }));
  }

  const slug = slugify(rawSlug || title);
  const path = customPath || `${formatDatePath(publishedAt)}/${slug}`;

  const savedPost = await saveAdminPost({
    id,
    slug,
    path,
    title,
    excerptHtml,
    contentHtml,
    publishedAt,
    visibility,
    accessPassword: visibility === "password" ? accessPassword : null,
    listedInArchive: visibility === "private" ? false : listedInArchive,
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
  revalidatePath(path);
  revalidatePath("/sitemap.xml");
  redirect(buildRedirectPath(id ? `/loginpage/posts/edit/${id}` : "/loginpage/posts", "/loginpage/posts", { saved: publicationStatus }));
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
  await saveAdminPost({
    ...post,
    id: post.id,
    publicationStatus
  });
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

  const slug = String(formData.get("slug") ?? "").trim();
  const sourceProductId = Number(formData.get("sourceProductId") ?? 0) || null;
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!slug) {
    redirect("/loginpage/products?error=1");
  }

  await saveAdminProductOverride({
    sourceProductId,
    slug,
    title: String(formData.get("title") ?? ""),
    excerptHtml: String(formData.get("excerptHtml") ?? ""),
    contentHtml: String(formData.get("contentHtml") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    regularPriceValue: Number(formData.get("regularPriceValue") ?? "") || null,
    salePriceValue: Number(formData.get("salePriceValue") ?? "") || null,
    visibility: String(formData.get("visibility") ?? "public") as "public" | "hidden" | "private",
    stockState: String(formData.get("stockState") ?? "available") as "available" | "reserved" | "soldout"
  });

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/sitemap.xml");
  redirect(buildRedirectPath(returnTo, "/loginpage/products", { saved: "1" }));
}

export async function saveProductCommonIntroAction(formData: FormData) {
  await requireAdminSession();
  const returnTo = String(formData.get("returnTo") ?? "");

  await saveAdminSetting({
    key: productCommonIntroSettingKey,
    value: String(formData.get("value") ?? "")
  });

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

  for (const slug of selectedSlugs) {
    const product = productsBySlug.get(slug);
    if (!product) {
      continue;
    }

    await saveAdminProductOverride({
      sourceProductId: product.id,
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
  await uploadAdminFiles(files, folderOverride);
  redirect(`/loginpage/assets?uploaded=${files.length}`);
}
