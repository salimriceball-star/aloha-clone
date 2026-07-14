import { getPosts, getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const [posts, siteMeta] = await Promise.all([getPosts(), getSiteMeta()]);
  const siteUrl = getSiteUrl(siteMeta.home);
  const feedUrl = new URL("/feed.xml", siteUrl).toString();
  const items = posts
    .filter((post) => post.visibility === "public" && post.publicationStatus === "published")
    .slice(0, 50)
    .map((post) => {
      const url = new URL(post.legacyPath, siteUrl).toString();
      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid isPermaLink="true">${escapeXml(url)}</guid>
          <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          <description>${escapeXml(post.excerpt || post.title)}</description>
        </item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${escapeXml(siteMeta.name)}</title>
        <link>${escapeXml(siteUrl.toString())}</link>
        <description>${escapeXml(siteMeta.description || `${siteMeta.name}의 최신 글`)}</description>
        <language>ko-KR</language>
        <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
