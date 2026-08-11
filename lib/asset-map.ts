import { readFile } from "node:fs/promises";

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

// manifest.json은 빌드 시에만 바뀌는 정적 파일이라, 요청 스코프 React cache()
// 대신 모듈 스코프 싱글턴으로 파싱한다. 파생 Map/Set(lookup, skipped)도 같은
// 이유로 프로세스당 1회만 구축하도록 싱글턴화 — warm 컨테이너에서 콘텐츠마다
// 반복되는 rewriteHtmlAssetUrls 호출이 매번 asset 목록을 순회/재구축하지 않는다.
let assetManifestPromise: Promise<AssetManifest | null> | null = null;

function getAssetManifest(): Promise<AssetManifest | null> {
  if (!assetManifestPromise) {
    assetManifestPromise = (async (): Promise<AssetManifest | null> => {
      try {
        const raw = await readFile(assetManifestPath, "utf8");
        return JSON.parse(raw) as AssetManifest;
      } catch {
        return null;
      }
    })();
  }
  return assetManifestPromise;
}

let assetUrlLookupPromise: Promise<Map<string, string>> | null = null;

export function getAssetUrlLookup(): Promise<Map<string, string>> {
  if (!assetUrlLookupPromise) {
    assetUrlLookupPromise = (async () => {
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
    })();
  }
  return assetUrlLookupPromise;
}

let skippedAssetUrlsPromise: Promise<Set<string>> | null = null;

function getSkippedAssetUrls(): Promise<Set<string>> {
  if (!skippedAssetUrlsPromise) {
    skippedAssetUrlsPromise = (async () => {
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
    })();
  }
  return skippedAssetUrlsPromise;
}

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
