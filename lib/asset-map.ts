import { readFile } from "node:fs/promises";
import { cache } from "react";

import { assetManifestPath, assetUrlVariants, normalizeAssetUrl } from "@/lib/asset-utils";
import { sourceHost, sourceUploadsAliasHosts } from "@/lib/project-config";

export type AssetRecord = {
  originalUrl: string;
  normalizedUrl: string;
  variantUrls?: string[];
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

type AssetManifest = {
  capturedAt: string;
  total: number;
  assets: AssetRecord[];
  skipped?: Array<{
    normalizedUrl: string;
    variantUrls?: string[];
  }>;
};

const getAssetManifest = cache(async (): Promise<AssetManifest | null> => {
  try {
    const raw = await readFile(assetManifestPath, "utf8");
    return JSON.parse(raw) as AssetManifest;
  } catch {
    return null;
  }
});

export const getAssetUrlLookup = cache(async () => {
  const manifest = await getAssetManifest();
  const lookup = new Map<string, string>();

  for (const asset of manifest?.assets ?? []) {
    for (const variant of assetUrlVariants(asset.originalUrl)) {
      lookup.set(variant, asset.cloudinaryUrl);
    }
    for (const variant of assetUrlVariants(asset.normalizedUrl)) {
      lookup.set(variant, asset.cloudinaryUrl);
    }
    for (const variantUrl of asset.variantUrls ?? []) {
      for (const variant of assetUrlVariants(variantUrl)) {
        lookup.set(variant, asset.cloudinaryUrl);
      }
    }
  }

  return lookup;
});

const getSkippedAssetUrls = cache(async () => {
  const manifest = await getAssetManifest();
  const skipped = new Set<string>();

  for (const asset of manifest?.skipped ?? []) {
    for (const url of [asset.normalizedUrl, ...(asset.variantUrls ?? [])]) {
      if (url.includes("&quot;")) {
        continue;
      }
      for (const variant of assetUrlVariants(url)) {
        skipped.add(variant);
      }
    }
  }

  return skipped;
});

export async function resolveAssetUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const normalized = normalizeAssetUrl(url);
  const lookup = await getAssetUrlLookup();
  return lookup.get(url) ?? lookup.get(normalized) ?? normalized;
}

function rewriteSrcsetAssetUrls(html: string, lookup: Map<string, string>) {
  return html.replace(/\ssrcset=(["'])([^"']*)\1/gi, (_attribute, quote: string, value: string) => {
    const rewrittenValue = value
      .split(",")
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) {
          return trimmed;
        }

        const [sourceUrl, ...descriptorParts] = trimmed.split(/\s+/);
        const decodedUrl = sourceUrl.replaceAll("&amp;", "&");
        const normalizedUrl = normalizeAssetUrl(decodedUrl);
        const targetUrl =
          lookup.get(sourceUrl) ?? lookup.get(decodedUrl) ?? lookup.get(normalizedUrl) ?? normalizedUrl;
        const descriptor = descriptorParts.join(" ");

        return descriptor ? `${targetUrl} ${descriptor}` : targetUrl;
      })
      .join(", ");

    return ` srcset=${quote}${rewrittenValue}${quote}`;
  });
}

function rewriteImageSrcAssetUrls(html: string, lookup: Map<string, string>) {
  return html.replace(/(<img\b[^>]*\ssrc=)(["'])([^"']+)(\2)/gi, (tag, prefix: string, quote: string, value: string) => {
    const decodedUrl = value.replaceAll("&amp;", "&");
    const normalizedUrl = normalizeAssetUrl(decodedUrl);
    const targetUrl = lookup.get(value) ?? lookup.get(decodedUrl) ?? lookup.get(normalizedUrl);

    return targetUrl ? `${prefix}${quote}${targetUrl}${quote}` : tag;
  });
}

function removeSkippedImageTags(html: string, skipped: Set<string>) {
  if (!skipped.size) {
    return html;
  }

  return html.replace(/<img\b[^>]*\ssrc=(["'])([^"']+)\1[^>]*>/gi, (tag, _quote: string, value: string) => {
    const decodedUrl = value.replaceAll("&amp;", "&");
    const shouldRemove = assetUrlVariants(decodedUrl).some((variant) => skipped.has(variant));
    return shouldRemove ? "" : tag;
  });
}

export async function rewriteHtmlAssetUrls(html: string) {
  if (!html) {
    return html;
  }

  let rewritten = html;
  for (const host of sourceUploadsAliasHosts) {
    rewritten = rewritten
      .replaceAll(`http://${host}/wp-content/uploads/`, `https://${sourceHost}/wp-content/uploads/`)
      .replaceAll(`https://${host}/wp-content/uploads/`, `https://${sourceHost}/wp-content/uploads/`);
  }

  const [lookup, skipped] = await Promise.all([getAssetUrlLookup(), getSkippedAssetUrls()]);
  if (!lookup.size) {
    return removeSkippedImageTags(rewritten, skipped);
  }

  const replacements = [...lookup.entries()].sort((left, right) => right[0].length - left[0].length);

  for (const [sourceUrl, targetUrl] of replacements) {
    rewritten = rewritten.split(sourceUrl).join(targetUrl);
  }

  rewritten = rewriteImageSrcAssetUrls(rewritten, lookup);
  rewritten = rewriteSrcsetAssetUrls(rewritten, lookup);

  return removeSkippedImageTags(rewritten, skipped);
}
