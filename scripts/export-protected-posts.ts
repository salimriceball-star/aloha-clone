import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright-core";

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

async function captureRenderedProtectedContent(page: Page, link: string, password: string) {
  await page.goto(link, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const passwordInput = page.locator('form.post-password-form input[type="password"], form.post-password-form input[name="post_password"]').first();
  if ((await passwordInput.count()) > 0) {
    await passwordInput.fill(password);
    const submitButton = page.locator('form.post-password-form button[type="submit"], form.post-password-form input[type="submit"]').first();
    await Promise.all([
      page.waitForLoadState("domcontentloaded"),
      submitButton.click()
    ]);
    await page.waitForTimeout(1200);
  }

  return page.evaluate(() => {
    const contentHtml =
      document.querySelector(".entry-content")?.innerHTML.trim() ??
      document.querySelector(".post-content")?.innerHTML.trim() ??
      document.querySelector("article")?.innerHTML.trim() ??
      "";
    const title = (
      document.querySelector("main h1")?.textContent ??
      document.querySelector("article h1")?.textContent ??
      document.querySelector("h1")?.textContent ??
      ""
    ).replace(/\s+/g, " ").trim();

    return {
      title,
      contentHtml
    };
  });
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
    const rows: AdminRow[] = [];
    const seenIds = new Set<number>();

    for (let paged = 1; paged <= 30; paged += 1) {
      await page.goto(`${sourceAdminBaseUrl}/edit.php?paged=${paged}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      const pageRows = (await page.evaluate(() => {
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

      const freshRows = pageRows.filter((row) => !seenIds.has(row.id));
      freshRows.forEach((row) => seenIds.add(row.id));
      rows.push(...freshRows);

      if (pageRows.length === 0) {
        break;
      }
    }

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

      const renderedPost =
        row.visibility === "password"
          ? await captureRenderedProtectedContent(page, editorPost.link, editorPost.password)
          : null;

      exportedPosts.push({
        id: editorPost.id,
        date: editorPost.date,
        slug: decodeSlug(editorPost.generatedSlug || editorPost.slug),
        rawSlug: editorPost.slug,
        link: editorPost.link,
        status: editorPost.status,
        visibility: row.visibility,
        password: editorPost.password,
        title: renderedPost?.title || editorPost.title,
        contentHtml: renderedPost?.contentHtml || editorPost.content,
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
