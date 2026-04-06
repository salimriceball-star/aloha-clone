import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";

import { projectRoot, sourceBaseUrl } from "@/lib/project-config";

const baseUrl = sourceBaseUrl;
const outputDir = join(projectRoot, "data", "public-wp-export");
const parser = new XMLParser();
const requestDelayMs = Number(process.env.REQUEST_DELAY_MS ?? "350");

type JsonValue = Record<string, unknown> | Array<unknown>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json() as Promise<JsonValue>;
}

async function fetchAllPaginated(path: string) {
  const records: Array<unknown> = [];
  let page = 1;

  while (true) {
    const separator = path.includes("?") ? "&" : "?";
    const pagedPath = `${path}${separator}per_page=100&page=${page}`;
    const response = await fetch(`${baseUrl}${pagedPath}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${pagedPath}: ${response.status}`);
    }

    const batch = (await response.json()) as Array<unknown>;
    records.push(...batch);

    const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages) {
      return {
        total: Number(response.headers.get("X-WP-Total") ?? records.length),
        totalPages,
        records
      };
    }

    page += 1;
    if (requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }
}

async function fetchXml(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return parser.parse(await response.text()) as Record<string, unknown>;
}

async function writeJson(filename: string, data: unknown) {
  await writeFile(join(outputDir, filename), JSON.stringify(data, null, 2));
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const [siteAudit, posts, pages, products, categories, productCategories, comments, sitemap] =
    await Promise.all([
      fetchJson("/wp-json"),
      fetchAllPaginated("/wp-json/wp/v2/posts?_fields=id,date,slug,link,title,content,excerpt,categories,sticky"),
      fetchAllPaginated("/wp-json/wp/v2/pages?_fields=id,date,slug,link,title,content,excerpt"),
      fetchAllPaginated("/wp-json/wp/v2/product?_fields=id,date,slug,link,title,content,excerpt"),
      fetchAllPaginated("/wp-json/wp/v2/categories?_fields=id,count,slug,name,parent"),
      fetchAllPaginated("/wp-json/wp/v2/product_cat?_fields=id,count,slug,name,parent"),
      fetchAllPaginated("/wp-json/wp/v2/comments?_fields=id,post,parent,author_name,date,link,status,type,content"),
      fetchXml("/wp-sitemap.xml")
    ]);

  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    counts: {
      posts: posts.total,
      pages: pages.total,
      products: products.total,
      categories: categories.total,
      productCategories: productCategories.total,
      comments: comments.total
    },
    files: [
      "site-meta.json",
      "sitemap.json",
      "posts.json",
      "pages.json",
      "products.json",
      "categories.json",
      "product-categories.json",
      "comments.json"
    ]
  };

  await Promise.all([
    writeJson("site-meta.json", siteAudit),
    writeJson("sitemap.json", sitemap),
    writeJson("posts.json", posts),
    writeJson("pages.json", pages),
    writeJson("products.json", products),
    writeJson("categories.json", categories),
    writeJson("product-categories.json", productCategories),
    writeJson("comments.json", comments),
    writeJson("manifest.json", manifest)
  ]);

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
