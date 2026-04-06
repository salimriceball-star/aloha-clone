import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { projectRoot, sourceBaseUrl } from "@/lib/project-config";

const baseUrl = sourceBaseUrl;
const exportDir = join(projectRoot, "data", "public-wp-export");
const requestDelayMs = Number(process.env.REQUEST_DELAY_MS ?? "700");

type ProductRecord = {
  id: number;
  slug: string;
  link: string;
  title: { rendered: string };
};

type ProductSchema = {
  "@type"?: string | string[];
  name?: string;
  url?: string;
  description?: string;
  image?: string | string[];
  sku?: number | string;
  aggregateRating?: {
    ratingValue?: string;
    reviewCount?: number | string;
  };
  review?: Array<{
    author?: { name?: string };
    datePublished?: string;
    reviewBody?: string;
    reviewRating?: { ratingValue?: number | string };
  }>;
  offers?: Array<{
    price?: string | number;
    priceCurrency?: string;
    availability?: string;
  }>;
};

function findProductSchema(input: unknown): ProductSchema | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findProductSchema(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const value = input as Record<string, unknown>;
  const type = value["@type"];
  const types = Array.isArray(type) ? type : [type];

  if (types.some((entry) => entry === "Product")) {
    return value as ProductSchema;
  }

  for (const nested of Object.values(value)) {
    const found = findProductSchema(nested);
    if (found) {
      return found;
    }
  }

  return null;
}

async function main() {
  if (!("File" in globalThis)) {
    // Node 18 lacks the File global expected by newer undici/cheerio stacks.
    (globalThis as { File?: unknown }).File = class FilePolyfill extends Blob {};
  }

  const cheerio = await import("cheerio");
  const productsFile = join(exportDir, "products.json");
  const products = JSON.parse(await readFile(productsFile, "utf8")) as {
    records: ProductRecord[];
  };

  const details = [];

  for (const product of products.records) {
    const response = await fetch(product.link.startsWith("http") ? product.link : `${baseUrl}${product.link}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${product.link}: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const jsonLdBlocks = $('script[type="application/ld+json"]')
      .map((_, element) => $(element).html() ?? "")
      .get();

    let schema: ProductSchema | null = null;

    for (const block of jsonLdBlocks) {
      try {
        const parsed = JSON.parse(block);
        const found = findProductSchema(parsed);
        if (found) {
          schema = found;
          break;
        }
      } catch {
        continue;
      }
    }

    const reviewNodes = $("#reviews .commentlist li.review");
    const extractedReviews = reviewNodes
      .map((_, node) => {
        const review = $(node);
        const author = review.find(".woocommerce-review__author").text().trim();
        const date = review.find(".woocommerce-review__published-date").attr("datetime") ?? "";
        const body = review.find(".description").text().trim();
        const rating = review.find(".star-rating span").text().match(/([0-9.]+)/)?.[1] ?? "";
        return {
          author,
          date,
          body,
          rating
        };
      })
      .get();

    details.push({
      id: product.id,
      slug: product.slug,
      link: product.link,
      title: product.title.rendered,
      schema,
      extractedReviews,
      publicSignals: {
        hasRefundText: html.includes("환불"),
        hasGmailDeliveryText: html.includes("gmail") || html.includes("지메일"),
        hasPdfOptionText: html.includes("PDF") || html.includes("pdf"),
        hasBankTransferText:
          html.includes("무통장") || html.includes("입금") || html.includes("계좌") || html.includes("bacs")
      }
    });

    if (requestDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, requestDelayMs));
    }
  }

  await writeFile(join(exportDir, "product-details.json"), JSON.stringify(details, null, 2));
  console.log(JSON.stringify({ count: details.length, file: join(exportDir, "product-details.json") }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
