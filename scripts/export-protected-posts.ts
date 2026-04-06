import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

import { sourceAdminBaseUrl } from "@/lib/project-config";

declare global {
  interface Window {
    wp?: {
      data?: {
        select?: (storeName: string) => {
          getCurrentPost?: () => unknown;
          getEditedPostAttribute?: (attribute: string) => unknown;
        };
      };
    };
  }
}

type Visibility = "password" | "private" | "draft";

type AdminRow = {
  id: number;
  title: string;
  status: string;
  visibility: Visibility;
  categoryNames: string[];
};

type ExportedProtectedPost = {
  id: number;
  date: string;
  slug: string;
  rawSlug: string;
  link: string;
  status: string;
  visibility: Visibility;
  password: string;
  title: string;
  contentHtml: string;
  excerptHtml: string;
  categoryIds: number[];
  categoryNames: string[];
  directPath: string;
  listedInArchive: boolean;
};

type EditorPostState = {
  id: number;
  date: string;
  slug?: string;
  generated_slug?: string;
  link?: string;
  status?: string;
  password?: string;
  title?: string;
  content?: string;
  categories?: unknown;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "data", "admin-wp-export");
const outputPath = path.join(outputDir, "protected-posts.json");
const browserOsHealthUrl = process.env.BROWSEROS_HEALTH_URL ?? "http://127.0.0.1:9200/health";
const browserOsCdpUrl = process.env.BROWSEROS_CDP_URL ?? "http://127.0.0.1:9100";

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function ensureBrowserOsReady() {
  const healthResponse = await fetch(browserOsHealthUrl);
  if (!healthResponse.ok) {
    throw new Error(`BrowserOS health check failed: ${healthResponse.status}`);
  }

  const health = (await healthResponse.json()) as { status?: string; cdpConnected?: boolean };
  if (health.status !== "ok" || !health.cdpConnected) {
    throw new Error(`BrowserOS health not ready: ${JSON.stringify(health)}`);
  }

  const versionResponse = await fetch(`${browserOsCdpUrl}/json/version`);
  if (!versionResponse.ok) {
    throw new Error(`BrowserOS CDP version check failed: ${versionResponse.status}`);
  }

  const version = (await versionResponse.json()) as { webSocketDebuggerUrl?: string };
  return version.webSocketDebuggerUrl ?? browserOsCdpUrl;
}

async function collectAdminRows() {
  const cdpEndpoint = await ensureBrowserOsReady();
  const browser = await chromium.connectOverCDP(cdpEndpoint);
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("BrowserOS default context not found");
  }

  const page = await context.newPage();
  try {
    await page.goto(`${sourceAdminBaseUrl}/edit.php`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const rows = (await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLTableRowElement>("#the-list tr"))
        .map((row) => {
          const id = Number(row.id.replace("post-", ""));
          const title =
            row.querySelector(".row-title")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const status = Array.from(row.classList).find((className) => className.startsWith("status-")) ?? "";
          const categoryNames = Array.from(row.querySelectorAll(".column-categories a")).map((link) =>
            link.textContent?.replace(/\s+/g, " ").trim() ?? ""
          );
          const rowText = row.textContent?.replace(/\s+/g, " ").trim() ?? "";

          let visibility: Visibility | null = null;
          if (rowText.includes("비밀번호로 보호됨")) {
            visibility = "password";
          } else if (rowText.includes("— 비공개")) {
            visibility = "private";
          } else if (status === "status-draft") {
            visibility = "draft";
          }

          return visibility
            ? {
                id,
                title,
                status: status.replace(/^status-/, ""),
                visibility,
                categoryNames
              }
            : null;
        })
        .filter((row): row is AdminRow => Boolean(row));
    })) as AdminRow[];

    const exportedPosts: ExportedProtectedPost[] = [];

    for (const row of rows) {
      await page.goto(`${sourceAdminBaseUrl}/post.php?post=${row.id}&action=edit`, {
        waitUntil: "domcontentloaded"
      });
      await page.waitForFunction(
        () => {
          const select = window.wp?.data?.select;
          if (!select) {
            return false;
          }

          const editorStore = select("core/editor");
          if (!editorStore?.getCurrentPost) {
            return false;
          }

          return Boolean(editorStore.getCurrentPost());
        },
        undefined,
        { timeout: 15_000 }
      );
      await page.waitForTimeout(400);

      const editorPost = (await page.evaluate(() => {
        const select = window.wp?.data?.select;
        const editorStore = select ? select("core/editor") : null;
        const currentPost = (editorStore?.getCurrentPost ? editorStore.getCurrentPost() : null) as EditorPostState | null;
        const excerpt = editorStore?.getEditedPostAttribute ? editorStore.getEditedPostAttribute("excerpt") ?? "" : "";
        return currentPost
          ? {
              id: currentPost.id,
              date: currentPost.date,
              slug: currentPost.slug ?? "",
              generatedSlug: currentPost.generated_slug ?? "",
              link: currentPost.link ?? "",
              status: currentPost.status ?? "",
              password: currentPost.password ?? "",
              title: currentPost.title ?? "",
              content: currentPost.content ?? "",
              excerpt,
              categories: Array.isArray(currentPost.categories) ? currentPost.categories : []
            }
          : null;
      })) as {
        id: number;
        date: string;
        slug: string;
        generatedSlug: string;
        link: string;
        status: string;
        password: string;
        title: string;
        content: string;
        excerpt: string;
        categories: number[];
      } | null;

      if (!editorPost) {
        throw new Error(`Failed to read editor state for post ${row.id}`);
      }

      exportedPosts.push({
        id: editorPost.id,
        date: editorPost.date,
        slug: decodeSlug(editorPost.generatedSlug || editorPost.slug),
        rawSlug: editorPost.slug,
        link: editorPost.link,
        status: editorPost.status,
        visibility: row.visibility,
        password: editorPost.password,
        title: editorPost.title,
        contentHtml: editorPost.content,
        excerptHtml: editorPost.excerpt,
        categoryIds: editorPost.categories,
        categoryNames: row.categoryNames,
        directPath: `/${editorPost.id}`,
        listedInArchive: false
      });
    }

    const payload = {
      capturedAt: new Date().toISOString(),
      source: "browseros-wp-admin",
      protectedPosts: exportedPosts.filter((post) => post.visibility === "password" && post.status === "publish"),
      adminOnlyPosts: exportedPosts.filter((post) => !(post.visibility === "password" && post.status === "publish"))
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

    console.log(
      JSON.stringify(
        {
          outputPath,
          protectedCount: payload.protectedPosts.length,
          adminOnlyCount: payload.adminOnlyPosts.length,
          protectedIds: payload.protectedPosts.map((post) => post.id)
        },
        null,
        2
      )
    );
  } finally {
    await page.close();
    await browser.close();
  }
}

collectAdminRows().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
