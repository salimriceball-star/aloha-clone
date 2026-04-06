const defaultSourceBaseUrl = "https://aloha-yt.xyz";
const normalizedSourceBaseUrl = (process.env.SOURCE_BASE_URL ?? defaultSourceBaseUrl).replace(/\/+$/, "");

const parsedSourceUrl = new URL(normalizedSourceBaseUrl);

export const projectRoot = process.cwd();
export const sourceBaseUrl = parsedSourceUrl.toString();
export const sourceOrigin = parsedSourceUrl.origin;
export const sourceHost = parsedSourceUrl.hostname;
export const sourceAdminBaseUrl = new URL("/wp-admin/", sourceOrigin).toString().replace(/\/+$/, "");
export const sourceUploadsAliasHosts = [
  sourceHost,
  ...((process.env.SOURCE_UPLOADS_ALIAS_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean))
];
export const cloudinaryFolder = process.env.CLOUDINARY_FOLDER ?? "aloha-clone";
export const siteStoragePrefix = process.env.SITE_STORAGE_PREFIX ?? "aloha-clone";
