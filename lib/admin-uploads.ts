import { v2 as cloudinary } from "cloudinary";

import { saveAdminAsset } from "@/lib/admin-store";
import { cloudinaryFolder } from "@/lib/project-config";
import { getServerEnv } from "@/lib/server-env";

export type UploadableFile = {
  name: string;
  size: number;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type UploadedAdminAsset = {
  id: number;
  publicId: string;
  secureUrl: string;
  originalFilename: string | null;
  resourceType: string;
};

export function isUploadableFile(value: unknown): value is UploadableFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function" &&
      "size" in value &&
      typeof value.size === "number" &&
      "name" in value &&
      typeof value.name === "string"
  );
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

function configureCloudinary() {
  const cloudName = getServerEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getServerEnv("CLOUDINARY_API_KEY");
  const apiSecret = getCloudinaryApiSecret();

  if (!cloudName || !apiKey) {
    throw new Error("Cloudinary credentials are incomplete.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

export async function uploadAdminFiles(files: UploadableFile[], folderOverride?: string) {
  const validFiles = files.filter((file) => file.size > 0);
  if (validFiles.length === 0) {
    return [] as UploadedAdminAsset[];
  }

  configureCloudinary();
  const targetFolder = folderOverride?.trim() || cloudinaryFolder;
  const uploads: UploadedAdminAsset[] = [];

  for (const file of validFiles) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    const upload = await cloudinary.uploader.upload(dataUri, {
      folder: targetFolder,
      resource_type: "auto",
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });

    let saved;
    try {
      saved = await saveAdminAsset({
        publicId: upload.public_id,
        secureUrl: upload.secure_url,
        originalFilename: file.name || null
      });
    } catch (error) {
      console.error("[admin-upload-db]", error instanceof Error ? error.message : "Unknown database error");
      throw new Error(
        "Cloudinary 업로드는 완료됐지만 Supabase DB 기록 저장에 실패했습니다. 같은 파일을 다시 올리기 전에 Cloudinary에서 확인해 주세요."
      );
    }

    uploads.push({
      id: saved.id,
      publicId: upload.public_id,
      secureUrl: upload.secure_url,
      originalFilename: file.name || null,
      resourceType: upload.resource_type
    });
  }

  return uploads;
}
