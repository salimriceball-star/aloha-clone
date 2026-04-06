"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";

import { clearAdminSession, createAdminSession, requireAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { saveAdminAsset, saveAdminPost, saveAdminProductOverride } from "@/lib/admin-store";
import { cloudinaryFolder } from "@/lib/project-config";
import { getServerEnv } from "@/lib/server-env";

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

function getCloudinaryApiSecret() {
  const directSecret = getServerEnv("CLOUDINARY_API_SECRET");
  if (directSecret) {
    return directSecret;
  }

  const cloudinaryUrl = getServerEnv("CLOUDINARY_URL");
  if (!cloudinaryUrl) {
    throw new Error("Missing Cloudinary credentials.");
  }

  const parsed = new URL(cloudinaryUrl);
  return parsed.password;
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
    redirect("/admin/login?error=1");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
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
    redirect("/admin/posts?error=1");
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
  revalidatePath("/column");
  revalidatePath(path);
  revalidatePath("/sitemap.xml");
  redirect("/admin/posts?saved=1");
}

export async function saveProductAction(formData: FormData) {
  await requireAdminSession();

  const slug = String(formData.get("slug") ?? "").trim();
  const sourceProductId = Number(formData.get("sourceProductId") ?? 0) || null;

  if (!slug) {
    redirect("/admin/products?error=1");
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
  revalidatePath(`/product/${slug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/products?saved=1");
}

export async function uploadAssetAction(formData: FormData) {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/assets?error=1");
  }

  const cloudName = getServerEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getServerEnv("CLOUDINARY_API_KEY");
  const apiSecret = getCloudinaryApiSecret();
  const folderOverride = String(formData.get("folder") ?? "").trim();

  if (!cloudName || !apiKey) {
    throw new Error("Cloudinary credentials are incomplete.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
  const upload = await cloudinary.uploader.upload(dataUri, {
    folder: folderOverride || cloudinaryFolder,
    resource_type: "auto",
    use_filename: true,
    unique_filename: true,
    overwrite: false
  });

  await saveAdminAsset({
    publicId: upload.public_id,
    secureUrl: upload.secure_url,
    originalFilename: file.name || null
  });

  redirect("/admin/assets?uploaded=1");
}
