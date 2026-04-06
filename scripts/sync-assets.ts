import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import { v2 as cloudinary } from "cloudinary";

import { cloudinaryFolder, projectRoot } from "@/lib/project-config";
import {
  assetDataDir,
  assetManifestPath,
  assetRawDir,
  collectAssetUrlsFromHtml,
  normalizeAssetUrl,
  sanitizeAssetPath
} from "@/lib/asset-utils";

type WpRendered = {
  rendered: string;
};

type WpPaged<T> = {
  records: T[];
};

type RawPost = {
  id: number;
  slug: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
};

type RawProductDetail = {
  slug: string;
  title: string;
  schema: {
    image?: string | string[];
  } | null;
};

type RawProtectedPost = {
  id: number;
  slug: string;
  rawSlug: string;
  title: string;
  contentHtml: string;
  excerptHtml: string;
};

type ProtectedPostPayload = {
  protectedPosts: RawProtectedPost[];
  adminOnlyPosts: RawProtectedPost[];
};

type AssetRecord = {
  originalUrl: string;
  normalizedUrl: string;
  variantUrls: string[];
  cloudinaryUrl: string;
  localPath: string;
  sourceRefs: string[];
  publicId: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  format: string | null;
  contentType: string | null;
};

type SkippedAssetRecord = {
  normalizedUrl: string;
  variantUrls: string[];
  sourceRefs: string[];
  error: string;
  skippedAt: string;
};

const exportDir = join(projectRoot, "data", "public-wp-export");
const cloudinaryEnvPath = join(projectRoot, ".local", "cloudinary.env");

async function readJson<T>(filename: string) {
  const raw = await readFile(join(exportDir, filename), "utf8");
  return JSON.parse(raw) as T;
}

async function readExistingManifest() {
  try {
    const raw = await readFile(assetManifestPath, "utf8");
    return JSON.parse(raw) as {
      capturedAt: string;
      total: number;
      assets: AssetRecord[];
      skipped?: SkippedAssetRecord[];
    };
  } catch {
    return null;
  }
}

async function loadCloudinaryEnv() {
  const raw = await readFile(cloudinaryEnvPath, "utf8");

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  if (!process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_URL) {
    const parsed = new URL(process.env.CLOUDINARY_URL);
    process.env.CLOUDINARY_API_SECRET = decodeURIComponent(parsed.password);
    if (!process.env.CLOUDINARY_API_KEY) {
      process.env.CLOUDINARY_API_KEY = decodeURIComponent(parsed.username);
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      process.env.CLOUDINARY_CLOUD_NAME = parsed.hostname;
    }
  }
}

function publicIdFor(url: string) {
  const safePath = sanitizeAssetPath(url);
  const withoutExtension = safePath.replace(/\.[a-zA-Z0-9]+$/, "");
  return `${cloudinaryFolder}/${withoutExtension}`;
}

function localPathFor(url: string) {
  return join(assetRawDir, sanitizeAssetPath(url));
}

type DiscoveredAsset = {
  sourceRefs: Set<string>;
  variantUrls: Set<string>;
};

function appendAsset(discovered: Map<string, DiscoveredAsset>, url: string, sourceRef: string) {
  if (!url) {
    return;
  }

  const canonicalUrl = normalizeAssetUrl(url);
  const normalizedVariant = normalizeAssetUrl(url, { keepSizeSuffix: true });
  if (!/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(normalizedVariant)) {
    return;
  }

  const entry = discovered.get(canonicalUrl) ?? {
    sourceRefs: new Set<string>(),
    variantUrls: new Set<string>()
  };
  entry.sourceRefs.add(sourceRef);
  entry.variantUrls.add(normalizedVariant);
  discovered.set(canonicalUrl, entry);
}

async function discoverAssets() {
  const discovered = new Map<string, DiscoveredAsset>();
  const [posts, pages, products, productDetails, protectedPostsPayload] = await Promise.all([
    readJson<WpPaged<RawPost>>("posts.json"),
    readJson<WpPaged<RawPost>>("pages.json"),
    readJson<WpPaged<RawPost>>("products.json"),
    readJson<RawProductDetail[]>("product-details.json"),
    readJson<ProtectedPostPayload>("../admin-wp-export/protected-posts.json").catch(
      () =>
        ({
          protectedPosts: [],
          adminOnlyPosts: []
        }) as ProtectedPostPayload
    )
  ]);

  const buckets: Array<{ file: string; records: RawPost[] }> = [
    { file: "posts.json", records: posts.records },
    { file: "pages.json", records: pages.records },
    { file: "products.json", records: products.records }
  ];

  for (const bucket of buckets) {
    for (const record of bucket.records) {
      const sourceBase = `${bucket.file}:${record.slug || record.id}`;
      for (const url of collectAssetUrlsFromHtml(record.content.rendered)) {
        appendAsset(discovered, url, `${sourceBase}:content`);
      }
      for (const url of collectAssetUrlsFromHtml(record.excerpt.rendered)) {
        appendAsset(discovered, url, `${sourceBase}:excerpt`);
      }
    }
  }

  for (const detail of productDetails) {
    const images = Array.isArray(detail.schema?.image)
      ? detail.schema?.image
      : detail.schema?.image
        ? [detail.schema.image]
        : [];

    for (const image of images) {
      appendAsset(discovered, image, `product-details:${detail.slug}:schema-image`);
    }
  }

  for (const post of [...protectedPostsPayload.protectedPosts, ...protectedPostsPayload.adminOnlyPosts]) {
    const sourceBase = `protected-posts:${post.rawSlug || post.slug || post.id}`;
    for (const url of collectAssetUrlsFromHtml(post.contentHtml)) {
      appendAsset(discovered, url, `${sourceBase}:content`);
    }
    for (const url of collectAssetUrlsFromHtml(post.excerptHtml)) {
      appendAsset(discovered, url, `${sourceBase}:excerpt`);
    }
  }

  return discovered;
}

async function downloadAsset(urls: string[]) {
  let lastError: Error | null = null;
  const localPath = localPathFor(urls[0] ?? "asset");

  try {
    await access(localPath);
    const existing = await readFile(localPath);
    return {
      localPath,
      bytes: existing.byteLength,
      contentType: null,
      fetchedUrl: urls[0] ?? ""
    };
  } catch {}

  for (const url of urls) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          lastError = new Error(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await mkdir(dirname(localPath), { recursive: true });
        await writeFile(localPath, buffer);

        return {
          localPath,
          bytes: buffer.byteLength,
          contentType: response.headers.get("content-type"),
          fetchedUrl: url
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch asset candidates: ${urls.join(", ")}`);
}

async function uploadAsset(url: string, localPath: string) {
  const hasExtension = extname(localPath).length > 0;
  const uploadPath = hasExtension ? localPath : `${localPath}.bin`;
  if (!hasExtension) {
    const original = await readFile(localPath);
    await writeFile(uploadPath, original);
  }

  const result = await cloudinary.uploader.upload(uploadPath, {
    public_id: publicIdFor(url),
    overwrite: true,
    invalidate: true,
    unique_filename: false,
    resource_type: "auto"
  });

  return {
    cloudinaryUrl: result.secure_url,
    publicId: result.public_id,
    width: typeof result.width === "number" ? result.width : null,
    height: typeof result.height === "number" ? result.height : null,
    format: result.format ?? null
  };
}

async function main() {
  await loadCloudinaryEnv();
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  await mkdir(assetDataDir, { recursive: true });
  const discovered = await discoverAssets();
  const existingManifest = await readExistingManifest();
  const assets: AssetRecord[] = [...(existingManifest?.assets ?? [])];
  const skipped: SkippedAssetRecord[] = [...(existingManifest?.skipped ?? [])];
  const completed = new Set(assets.map((asset) => asset.normalizedUrl));
  const skippedUrls = new Set(skipped.map((asset) => asset.normalizedUrl));

  for (const [url, entry] of [...discovered.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    if (completed.has(url)) {
      continue;
    }
    if (skippedUrls.has(url)) {
      continue;
    }

    console.log(`syncing ${url}`);
    const candidateUrls = [url, ...entry.variantUrls].filter((value, index, array) => array.indexOf(value) === index);
    const preferredLocalPath = localPathFor(url);
    let localPath = preferredLocalPath;
    let bytes: number | null = null;
    let contentType: string | null = null;
    let fetchedUrl = url;
    let cloudinaryUrl: string;
    let publicId: string;
    let width: number | null = null;
    let height: number | null = null;
    let format: string | null = null;

    const canReuseLocal = !existingManifest;
    if (canReuseLocal) {
      try {
        const fileStats = await stat(preferredLocalPath);
        bytes = fileStats.size;
        format = extname(preferredLocalPath).replace(/^\./, "") || null;
        publicId = publicIdFor(url);
        cloudinaryUrl = cloudinary.url(publicId, {
          secure: true,
          resource_type: "image",
          type: "upload",
          version: undefined,
          format: format ?? undefined
        });

        assets.push({
          originalUrl: fetchedUrl,
          normalizedUrl: normalizeAssetUrl(url),
          variantUrls: [...entry.variantUrls].sort(),
          cloudinaryUrl,
          localPath: preferredLocalPath,
          sourceRefs: [...entry.sourceRefs].sort(),
          publicId,
          bytes,
          width,
          height,
          format,
          contentType
        });

        completed.add(url);
        await writeFile(
          assetManifestPath,
          JSON.stringify(
            {
              capturedAt: new Date().toISOString(),
              total: assets.length,
              assets,
              skipped
            },
            null,
            2
          )
        );
        continue;
      } catch {}
    }

    try {
      const downloaded = await downloadAsset(candidateUrls);
      localPath = downloaded.localPath;
      bytes = downloaded.bytes;
      contentType = downloaded.contentType;
      fetchedUrl = downloaded.fetchedUrl;
      const uploaded = await uploadAsset(url, localPath);
      cloudinaryUrl = uploaded.cloudinaryUrl;
      publicId = uploaded.publicId;
      width = uploaded.width;
      height = uploaded.height;
      format = uploaded.format;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`skipping ${url}: ${message}`);
      skipped.push({
        normalizedUrl: normalizeAssetUrl(url),
        variantUrls: [...entry.variantUrls].sort(),
        sourceRefs: [...entry.sourceRefs].sort(),
        error: message,
        skippedAt: new Date().toISOString()
      });
      skippedUrls.add(url);
      await writeFile(
        assetManifestPath,
        JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            total: assets.length,
            assets,
            skipped
          },
          null,
          2
        )
      );
      continue;
    }

    assets.push({
      originalUrl: fetchedUrl,
      normalizedUrl: normalizeAssetUrl(url),
      variantUrls: [...entry.variantUrls].sort(),
      cloudinaryUrl,
      localPath,
      sourceRefs: [...entry.sourceRefs].sort(),
      publicId,
      bytes,
      width,
      height,
      format,
      contentType
    });

    completed.add(url);
    await writeFile(
      assetManifestPath,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          total: assets.length,
          assets,
          skipped
        },
        null,
        2
      )
    );
  }

  const manifest = {
    capturedAt: new Date().toISOString(),
    total: assets.length,
    assets,
    skipped
  };

  await writeFile(assetManifestPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ capturedAt: manifest.capturedAt, total: manifest.total }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
