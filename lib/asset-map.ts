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

export async function resolveAssetUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const normalized = normalizeAssetUrl(url);
  const lookup = await getAssetUrlLookup();
  return lookup.get(url) ?? lookup.get(normalized) ?? normalized;
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

  const lookup = await getAssetUrlLookup();
  if (!lookup.size) {
    return rewritten;
  }

  const replacements = [...lookup.entries()].sort((left, right) => right[0].length - left[0].length);

  for (const [sourceUrl, targetUrl] of replacements) {
    rewritten = rewritten.split(sourceUrl).join(targetUrl);
  }

  return rewritten;
}
