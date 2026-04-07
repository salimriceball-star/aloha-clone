"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, createAdminSession, requireAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { isUploadableFile, uploadAdminFiles } from "@/lib/admin-uploads";
import { saveAdminPost, saveAdminProductOverride, saveAdminSetting } from "@/lib/admin-store";

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

  const title = String(formData.get("title") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const publishedAt = String(formData.get("publishedAt") ?? new Date().toISOString());
  const visibility = String(formData.get("visibility") ?? "public") as "public" | "hidden" | "private" | "password";
  const accessPassword = String(formData.get("accessPassword") ?? "").trim();
  const listedInArchive = formData.get("listedInArchive") === "on";
  const excerptHtml = String(formData.get("excerptHtml") ?? "");
  const contentHtml = String(formData.get("contentHtml") ?? "");
  const customPath = normalizePathInput(String(formData.get("path") ?? ""));

  if (!title || !contentHtml.trim()) {
    redirect("/loginpage/posts?error=1");
  }

  const slug = slugify(rawSlug || title);
  const path = customPath || `${formatDatePath(publishedAt)}/${slug}`;

  await saveAdminPost({
    slug,
    path,
    title,
    excerptHtml,
    contentHtml,
    publishedAt,
    visibility,
    accessPassword: visibility === "password" ? accessPassword : null,
    listedInArchive
  });

  revalidatePath("/");
  revalidatePath("/page/[page]", "page");
  revalidatePath("/column");
  revalidatePath(path);
  revalidatePath("/sitemap.xml");
  redirect("/loginpage/posts?saved=1");
}

export async function saveProductAction(formData: FormData) {
  await requireAdminSession();

  const slug = String(formData.get("slug") ?? "").trim();
  const sourceProductId = Number(formData.get("sourceProductId") ?? 0) || null;

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
  redirect("/loginpage/products?saved=1");
}

export async function saveProductCommonIntroAction(formData: FormData) {
  await requireAdminSession();

  await saveAdminSetting({
    key: productCommonIntroSettingKey,
    value: String(formData.get("value") ?? "")
  });

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/page/[page]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/sitemap.xml");
  redirect("/loginpage/products?introSaved=1");
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
