import type { MetadataRoute } from "next";

import { getSiteMeta } from "@/lib/site-data";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteMeta = await getSiteMeta();
  const baseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? siteMeta.home);

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/", "/2024/", "/2025/", "/2026/", "/column"],
        disallow: ["/admin", "/cart", "/checkout", "/my-account"]
      }
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString()
  };
}
