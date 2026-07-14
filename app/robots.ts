import type { MetadataRoute } from "next";

import { getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteMeta = await getSiteMeta();
  const baseUrl = getSiteUrl(siteMeta.home);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/loginpage",
          "/api/",
          "/cart",
          "/checkout",
          "/my-account",
          "/search",
          "/wp-admin",
          "/wp-login.php"
        ]
      }
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString()
  };
}
