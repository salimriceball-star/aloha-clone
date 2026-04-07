import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright-core";

type CheckResult = {
  id: string;
  url: string;
  screenshot: string;
  title: string;
  heading: string | null;
  checks: Record<string, boolean>;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "browseros-targeted-qa");
const cloneBaseUrl = process.env.CLONE_BASE_URL ?? "http://127.0.0.1:3000";
const browserOsHealthUrl = process.env.BROWSEROS_HEALTH_URL ?? "http://127.0.0.1:9200/health";
const browserOsCdpUrl = process.env.BROWSEROS_CDP_URL ?? "http://127.0.0.1:9100";

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
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

async function waitForSettled(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 5_000 });
  } catch {}
  await page.waitForTimeout(1_000);
}

async function capturePage(page: Page, runDir: string, id: string, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForSettled(page);
  const screenshot = path.join(runDir, `${id}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const diagnostics = await page.evaluate(() => ({
    title: document.title.trim(),
    heading: document.querySelector("main h1, article h1, h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null
  }));

  return {
    screenshot,
    title: diagnostics.title,
    heading: diagnostics.heading
  };
}

async function clearProtectedPostState(page: Page, postId: number) {
  await page.goto(cloneBaseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, `aloha-clone/protected-post/${postId}`);
  await page.waitForTimeout(200);
}

async function run() {
  const cdpEndpoint = await ensureBrowserOsReady();
  const browser = await chromium.connectOverCDP(cdpEndpoint);
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("BrowserOS default context not found");
  }

  const runDir = path.join(artifactsRoot, buildTimestamp());
  await mkdir(runDir, { recursive: true });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1800 });

  try {
    const results: CheckResult[] = [];

    {
      const url = `${cloneBaseUrl}/`;
      const capture = await capturePage(page, runDir, "home", url);
      const checks = await page.evaluate(() => ({
        noSidebar: document.querySelector(".editorial-sidebar") === null,
        headingIsArchive: document.querySelector("main h1")?.textContent?.trim() === "글 목록",
        hasPage2Link: Boolean(document.querySelector('a[href="/page/2"]'))
      }));
      results.push({ id: "home", url, ...capture, checks });
    }

    {
      const url = `${cloneBaseUrl}/page/2`;
      const capture = await capturePage(page, runDir, "home-page-2", url);
      const checks = await page.evaluate(() => ({
        headingIsArchive: document.querySelector("main h1")?.textContent?.trim() === "글 목록",
        hasPrevLink: Boolean(document.querySelector('a[href="/"]')),
        hasCurrentPage: document.querySelector('[aria-current="page"]')?.textContent?.trim() === "2"
      }));
      results.push({ id: "home-page-2", url, ...capture, checks });
    }

    {
      const url = `${cloneBaseUrl}/shop`;
      const capture = await capturePage(page, runDir, "shop", url);
      const checks = await page.evaluate(() => ({
        hidesDirectOnlyProduct207: !document.body.innerHTML.includes("/product/207"),
        hasPage2Link: Boolean(document.querySelector('a[href="/shop/page/2"]')),
        visibleCardsAtMost16: document.querySelectorAll(".shop-card").length <= 16
      }));
      results.push({ id: "shop", url, ...capture, checks });
    }

    {
      const url = `${cloneBaseUrl}/product/207`;
      const capture = await capturePage(page, runDir, "product-207-direct", url);
      const checks = await page.evaluate(() => ({
        hasProductHero: Boolean(document.querySelector(".product-hero")),
        showsHiddenDirectProduct: document.querySelector("h1")?.textContent?.includes("207") ?? false
      }));
      results.push({ id: "product-207-direct", url, ...capture, checks });
    }

    {
      const url = `${cloneBaseUrl}/loginpage`;
      const capture = await capturePage(page, runDir, "loginpage", url);
      const checks = await page.evaluate(() => ({
        hasPasswordField: Boolean(document.querySelector('input[type="password"][name="password"]')),
        noAdminPathCopy: !document.body.textContent?.includes("/admin")
      }));
      results.push({ id: "loginpage", url, ...capture, checks });
    }

    {
      const url = `${cloneBaseUrl}/352`;
      await clearProtectedPostState(page, 352);
      const capture = await capturePage(page, runDir, "protected-352-locked", url);
      const checks = await page.evaluate(() => ({
        hasPasswordForm: Boolean(document.querySelector(".password-form")),
        lockedHeadingPrefixed: document.querySelector("h1")?.textContent?.startsWith("보호된 글:") ?? false
      }));
      results.push({ id: "protected-352-locked", url, ...capture, checks });
    }

    {
      const url = `${cloneBaseUrl}/352`;
      await clearProtectedPostState(page, 352);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await waitForSettled(page);
      await page.locator('input[type="password"]').fill("caution1245");
      await page.locator(".password-form button[type='submit']").click();
      await page.waitForFunction(() => !document.querySelector(".password-form"), undefined, { timeout: 15_000 });
      await page.waitForTimeout(500);
      const screenshot = path.join(runDir, "protected-352-unlocked.png");
      await page.screenshot({ path: screenshot, fullPage: true });
      const capture = await page.evaluate(() => ({
        title: document.title.trim(),
        heading: document.querySelector("main h1, article h1, h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
        hasPasswordForm: Boolean(document.querySelector(".password-form")),
        bodyHasContent: Boolean(document.querySelector(".article-body")?.textContent?.trim()),
        unlockedHeadingNormalized: !(document.querySelector("h1")?.textContent?.startsWith("보호된 글:") ?? false)
      }));
      results.push({
        id: "protected-352-unlocked",
        url: page.url(),
        screenshot,
        title: capture.title,
        heading: capture.heading,
        checks: {
          unlockedHeadingNormalized: capture.unlockedHeadingNormalized,
          passwordFormRemoved: !capture.hasPasswordForm,
          bodyHasContent: capture.bodyHasContent
        }
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      cloneBaseUrl,
      runDir,
      checksPassed: results.every((result) => Object.values(result.checks).every(Boolean)),
      results
    };

    const reportPath = path.join(runDir, "report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ reportPath, checksPassed: report.checksPassed }, null, 2));
  } finally {
    await page.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
