import { XMLParser } from "fast-xml-parser";

const baseUrl = new URL(process.argv[2] ?? process.env.SEO_AUDIT_BASE_URL ?? "http://127.0.0.1:3000");
const failures: string[] = [];
const checks: Record<string, boolean | number | string> = {};

function check(name: string, passed: boolean, detail?: string | number) {
  checks[name] = detail ?? passed;
  if (!passed) failures.push(detail === undefined ? name : `${name}: ${detail}`);
}

async function get(pathname: string, redirect: RequestRedirect = "follow") {
  return fetch(new URL(pathname, baseUrl), { redirect, headers: { "User-Agent": "aloha-seo-audit/1.0" } });
}

function parseJsonLd(html: string) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => {
      try {
        return JSON.parse(match[1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((value): value is Record<string, unknown> => Boolean(value));
}

function readTagAttribute(tag: string, attribute: string) {
  return tag.match(new RegExp(`${attribute}=["']([^"']*)["']`, "i"))?.[1] ?? "";
}

function getCanonical(html: string) {
  const tag = (html.match(/<link\b[^>]*>/gi) ?? []).find((candidate) =>
    /rel=["'][^"']*canonical[^"']*["']/i.test(candidate)
  );
  return tag ? readTagAttribute(tag, "href") : "";
}

function getRobotsMeta(html: string) {
  const tag = (html.match(/<meta\b[^>]*>/gi) ?? []).find((candidate) =>
    /name=["']robots["']/i.test(candidate)
  );
  return tag ? readTagAttribute(tag, "content") : "";
}

function normalizedUrl(value: string) {
  const url = new URL(value);
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname}${url.search}`;
}

function hasJsonLdType(records: Record<string, unknown>[], type: string) {
  return records.some((record) => record["@type"] === type);
}

async function main() {
  const [
    homeResponse,
    robotsResponse,
    sitemapResponse,
    feedResponse,
    feedRedirectResponse,
    loginResponse,
    cartResponse,
    checkoutResponse,
    apiResponse,
    wpSitemapResponse
  ] = await Promise.all([
    get("/"),
    get("/robots.txt"),
    get("/sitemap.xml"),
    get("/feed.xml"),
    get("/feed", "manual"),
    get("/loginpage"),
    get("/cart"),
    get("/checkout"),
    get("/api/cron/supabase-health"),
    get("/wp-sitemap.xml", "manual")
  ]);

  check("home_status", homeResponse.ok, homeResponse.status);
  check("robots_status", robotsResponse.ok, robotsResponse.status);
  check("sitemap_status", sitemapResponse.ok, sitemapResponse.status);
  check("feed_status", feedResponse.ok, feedResponse.status);
  check("feed_content_type", /application\/rss\+xml/i.test(feedResponse.headers.get("content-type") ?? ""));
  check("feed_redirect", [301, 308].includes(feedRedirectResponse.status), feedRedirectResponse.status);
  check("login_status", loginResponse.ok, loginResponse.status);
  check("wp_sitemap_redirect", [301, 308].includes(wpSitemapResponse.status), wpSitemapResponse.status);
  check("security_nosniff", homeResponse.headers.get("x-content-type-options") === "nosniff");
  check("api_x_robots", /noindex/i.test(apiResponse.headers.get("x-robots-tag") ?? ""));

  const [homeHtml, robotsText, sitemapXml, feedXml, loginHtml, cartHtml, checkoutHtml] = await Promise.all([
    homeResponse.text(),
    robotsResponse.text(),
    sitemapResponse.text(),
    feedResponse.text(),
    loginResponse.text(),
    cartResponse.text(),
    checkoutResponse.text()
  ]);
  const canonical = getCanonical(homeHtml);
  check("home_canonical", normalizedUrl(canonical) === normalizedUrl(baseUrl.toString()), canonical);
  check("organization_jsonld", hasJsonLdType(parseJsonLd(homeHtml), "Organization"));
  check("feed_discovery", /<link\b[^>]*type=["']application\/rss\+xml["'][^>]*>/i.test(homeHtml));
  check("feed_rss_document", /<rss\b/i.test(feedXml) && /<channel>/i.test(feedXml));
  check("robots_sitemap", robotsText.includes(new URL("/sitemap.xml", baseUrl).toString()));
  check("robots_blocks_private", ["/loginpage", "/api/", "/checkout", "/search"].every((path) => robotsText.includes(path)));

  check("login_noindex", /noindex/i.test(getRobotsMeta(loginHtml)));
  check("cart_noindex", /noindex/i.test(getRobotsMeta(cartHtml)));
  check("checkout_noindex", /noindex/i.test(getRobotsMeta(checkoutHtml)));

  const parsed = new XMLParser().parse(sitemapXml) as {
    urlset?: { url?: Array<{ loc?: string; lastmod?: string }> | { loc?: string; lastmod?: string } };
  };
  const rawUrls = parsed.urlset?.url;
  const urls = Array.isArray(rawUrls) ? rawUrls : rawUrls ? [rawUrls] : [];
  const locations = urls.map((entry) => entry.loc ?? "").filter(Boolean);
  check("sitemap_url_count", locations.length > 0, locations.length);
  check("sitemap_unique", new Set(locations).size === locations.length, locations.length);
  check("sitemap_single_origin", locations.every((location) => new URL(location).origin === baseUrl.origin));
  check("sitemap_lastmod", urls.every((entry) => Boolean(entry.lastmod)));

  const productUrl = locations.find((location) => new URL(location).pathname.startsWith("/product/"));
  check("sitemap_has_product", Boolean(productUrl));
  if (productUrl) {
    const response = await fetch(productUrl);
    const html = await response.text();
    check("product_status", response.ok, response.status);
    check("product_canonical", normalizedUrl(getCanonical(html)) === normalizedUrl(productUrl));
    const productJsonLd = parseJsonLd(html).find((record) => record["@type"] === "Product");
    check("product_jsonld", Boolean(productJsonLd));
    check("product_offer_jsonld", Boolean(productJsonLd?.offers));
  }

  const articleUrl = locations.find((location) => /^\/20\d{2}\//.test(new URL(location).pathname));
  check("sitemap_has_article", Boolean(articleUrl));
  if (articleUrl) {
    const response = await fetch(articleUrl);
    const html = await response.text();
    check("article_status", response.ok, response.status);
    check("article_jsonld", hasJsonLdType(parseJsonLd(html), "Article"));
  }

  console.log(JSON.stringify({ baseUrl: baseUrl.toString(), passed: failures.length === 0, checks, failures }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

void main();
