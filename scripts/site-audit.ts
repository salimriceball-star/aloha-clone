import { writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

import { projectRoot, sourceBaseUrl } from "@/lib/project-config";

const baseUrl = sourceBaseUrl;
const parser = new XMLParser();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchXml(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return parser.parse(await response.text());
}

async function main() {
  const [posts, pages, products, categories, productCategories, commentsSitemap] =
    await Promise.all([
      fetchJson<Array<{ id: number; slug: string; link: string }>>(
        "/wp-json/wp/v2/posts?per_page=100&_fields=id,slug,link"
      ),
      fetchJson<Array<{ id: number; slug: string; link: string }>>(
        "/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link"
      ),
      fetchJson<Array<{ id: number; slug: string; link: string }>>(
        "/wp-json/wp/v2/product?per_page=100&_fields=id,slug,link"
      ),
      fetchJson<Array<{ id: number; slug: string; name: string }>>(
        "/wp-json/wp/v2/categories?per_page=100&_fields=id,slug,name"
      ),
      fetchJson<Array<{ id: number; slug: string; name: string }>>(
        "/wp-json/wp/v2/product_cat?per_page=100&_fields=id,slug,name"
      ),
      fetchXml("/wp-sitemap.xml")
    ]);

  const output = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    counts: {
      posts: posts.length,
      pages: pages.length,
      products: products.length,
      categories: categories.length,
      productCategories: productCategories.length
    },
    pages,
    products,
    categories,
    productCategories,
    sitemap: commentsSitemap
  };

  await writeFile(
    path.join(projectRoot, "docs", "site-audit.generated.json"),
    JSON.stringify(output, null, 2)
  );

  console.log(JSON.stringify(output.counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
