import type { MetadataRoute } from "next";

import { getPages, getPosts, getProducts, getSiteMeta } from "@/lib/site-data";

const excludedPageSlugs = new Set([
  "cart",
  "checkout",
  "my-account",
  "thank-you",
  "my-bookings",
  "book-appointment",
  "cancel-appointment",
  "cancel-payment",
  "appointment-cancellation-confirmation"
]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteMeta, posts, pages, products] = await Promise.all([
    getSiteMeta(),
    getPosts(),
    getPages(),
    getProducts()
  ]);

  const baseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? siteMeta.home);
  const staticEntries = ["/", "/shop", "/column"];
  const dynamicEntries = [
    ...posts.filter((post) => post.visibility === "public").map((post) => post.legacyPath),
    ...pages.filter((page) => !excludedPageSlugs.has(page.slug)).map((page) => page.legacyPath),
    ...products.map((product) => `/product/${product.slug}`)
  ];

  return [...new Set([...staticEntries, ...dynamicEntries])].map((pathname) => ({
    url: new URL(pathname, baseUrl).toString(),
    changeFrequency: pathname.startsWith("/product/") ? "daily" : "weekly",
    priority: pathname === "/" ? 1 : pathname.startsWith("/product/") ? 0.9 : 0.7
  }));
}
