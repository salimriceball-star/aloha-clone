export type SiteUrlSource = "explicit" | "vercel-production" | "source-fallback";

export type SiteUrlInfo = {
  url: URL;
  source: SiteUrlSource;
};

function normalizeSiteUrl(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must use http or https.`);
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function getSiteUrlInfo(sourceFallback: string): SiteUrlInfo {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (explicit) {
    return { url: normalizeSiteUrl(explicit, "NEXT_PUBLIC_SITE_URL"), source: "explicit" };
  }

  const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionHost) {
    return {
      url: normalizeSiteUrl(`https://${vercelProductionHost}`, "VERCEL_PROJECT_PRODUCTION_URL"),
      source: "vercel-production"
    };
  }

  return { url: normalizeSiteUrl(sourceFallback, "site metadata home"), source: "source-fallback" };
}

export function getSiteUrl(sourceFallback: string) {
  return getSiteUrlInfo(sourceFallback).url;
}

export function toAbsoluteSiteUrl(pathname: string, sourceFallback: string) {
  return new URL(pathname, getSiteUrl(sourceFallback)).toString();
}
