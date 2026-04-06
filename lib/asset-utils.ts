import path from "node:path";

import { sourceHost, sourceUploadsAliasHosts } from "@/lib/project-config";

const projectRoot = process.cwd();

export const assetDataDir = path.join(projectRoot, "data", "assets");
export const assetRawDir = path.join(assetDataDir, "raw");
export const assetManifestPath = path.join(assetDataDir, "manifest.json");

function canonicalizeUploadPathname(pathname: string) {
  if (!pathname.startsWith("/wp-content/uploads/")) {
    return pathname;
  }

  return pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
}

export function normalizeAssetUrl(url: string, options?: { keepSizeSuffix?: boolean }) {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";

    if (sourceUploadsAliasHosts.includes(parsed.hostname) && parsed.pathname.startsWith("/wp-content/uploads/")) {
      parsed.protocol = "https:";
      parsed.hostname = sourceHost;
      parsed.port = "";
    }

    if (!options?.keepSizeSuffix) {
      parsed.pathname = canonicalizeUploadPathname(parsed.pathname);
    }

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function assetUrlVariants(url: string) {
  const normalized = normalizeAssetUrl(url);
  const normalizedWithSizeSuffix = normalizeAssetUrl(url, { keepSizeSuffix: true });
  const variants = new Set<string>([url, normalized]);
  variants.add(normalizedWithSizeSuffix);

  try {
    variants.add(decodeURI(url));
  } catch {}

  try {
    variants.add(decodeURI(normalized));
  } catch {}

  try {
    variants.add(decodeURI(normalizedWithSizeSuffix));
  } catch {}

  try {
    const parsed = new URL(normalizedWithSizeSuffix);
    parsed.search = "";
    variants.add(parsed.toString());
    try {
      variants.add(decodeURI(parsed.toString()));
    } catch {}

    if (parsed.hostname === sourceHost) {
      const httpVariant = new URL(parsed.toString());
      httpVariant.protocol = "http:";
      variants.add(httpVariant.toString());
      try {
        variants.add(decodeURI(httpVariant.toString()));
      } catch {}

      if (parsed.pathname.startsWith("/wp-content/uploads/")) {
        for (const aliasHost of sourceUploadsAliasHosts) {
          if (aliasHost === sourceHost) {
            continue;
          }
          for (const protocol of ["http:", "https:"]) {
            const aliasVariant = new URL(parsed.toString());
            aliasVariant.protocol = protocol;
            aliasVariant.hostname = aliasHost;
            variants.add(aliasVariant.toString());
            try {
              variants.add(decodeURI(aliasVariant.toString()));
            } catch {}
          }
        }
      }
    }
  } catch {
    return [...variants];
  }

  return [...variants];
}

export function sanitizeAssetPath(url: string) {
  const parsed = new URL(normalizeAssetUrl(url));
  const base = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+/, "");
  const safe = base
    .replace(/[^a-zA-Z0-9/._-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^-+/, "");
  return safe || "asset.bin";
}

export function collectAssetUrlsFromHtml(html: string) {
  const urls = new Set<string>();
  const patterns = [
    /\ssrc=["']([^"']+)["']/gi,
    /\ssrcset=["']([^"']+)["']/gi,
    /\shref=["']([^"']+)["']/gi,
    /https?:\/\/[^"'()\s>]+/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = match[1] ?? match[0] ?? "";
      const candidates = pattern.source.includes("srcset")
        ? value.split(",").map((entry) => entry.trim().split(/\s+/)[0] ?? "")
        : [value];

      for (const candidate of candidates) {
        if (!candidate.startsWith("http")) {
          continue;
        }

        if (!/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(candidate)) {
          continue;
        }

        urls.add(normalizeAssetUrl(candidate));
      }
    }
  }

  return [...urls];
}
