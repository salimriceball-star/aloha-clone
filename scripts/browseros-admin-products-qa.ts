import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright-core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "browseros-admin-product-qa");
const cloneBaseUrl = process.env.CLONE_BASE_URL ?? "http://127.0.0.1:3003";
const browserOsHealthUrl = process.env.BROWSEROS_HEALTH_URL ?? "http://127.0.0.1:9200/health";
const browserOsCdpUrl = process.env.BROWSEROS_CDP_URL ?? "http://127.0.0.1:9100";

type CheckResult = {
  id: string;
  url: string;
  screenshot: string;
  title: string;
  heading: string | null;
  checks: Record<string, boolean | number | string>;
};

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
  await page.waitForTimeout(800);
}

async function readAdminPassword() {
  const envRaw = await readFile(path.join(repoRoot, ".local", "supabase.env"), "utf8");
  const password = envRaw.match(/^SUPABASE_DB_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!password) {
    throw new Error("Admin password not found");
  }

  return password;
}

async function ensureAdminSession(page: Page, adminPassword: string) {
  await page.goto(`${cloneBaseUrl}/loginpage`, { waitUntil: "domcontentloaded" });
  await waitForSettled(page);

  const passwordField = page.locator('input[name="password"]');
  if (await passwordField.count()) {
    await passwordField.fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    await waitForSettled(page);
  }
}

async function capturePage(
  page: Page,
  runDir: string,
  id: string,
  url: string,
  evaluator: (page: Page) => Promise<Record<string, boolean | number | string>>
): Promise<CheckResult> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForSettled(page);

  const screenshot = path.join(runDir, `${id}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const heading = await page
    .locator("main h1, article h1, h1")
    .first()
    .textContent()
    .catch(() => null);

  return {
    id,
    url: page.url(),
    screenshot,
    title: await page.title(),
    heading,
    checks: await evaluator(page)
  };
}

async function run() {
  const [cdpEndpoint, adminPassword] = await Promise.all([ensureBrowserOsReady(), readAdminPassword()]);
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
    await ensureAdminSession(page, adminPassword);

    const results: CheckResult[] = [];

    results.push(
      await capturePage(page, runDir, "admin-products", `${cloneBaseUrl}/loginpage/products`, async (currentPage) =>
        currentPage.evaluate(() => ({
          editorCount: document.querySelectorAll(".admin-editor-shell").length,
          checkboxCount: document.querySelectorAll('input[type="checkbox"][name="selectedSlug"]').length,
          hasCommonLink: Boolean(document.querySelector('a[href="/loginpage/products/common"]')),
          hasPageNav: document.querySelectorAll(".pagination-link").length > 0,
          hasEditLinks: document.querySelectorAll('a[href^="/loginpage/products/edit/"]').length > 0
        }))
      )
    );

    results.push(
      await capturePage(page, runDir, "admin-products-common", `${cloneBaseUrl}/loginpage/products/common`, async (currentPage) =>
        currentPage.evaluate(() => ({
          editorCount: document.querySelectorAll(".admin-editor-shell").length,
          hasIntroEditorLabel: /상품 공통 도입부/.test(document.body.textContent || ""),
          hasBackLink: Boolean(document.querySelector('a[href="/loginpage/products"]'))
        }))
      )
    );

    results.push(
      await capturePage(page, runDir, "admin-products-edit-207", `${cloneBaseUrl}/loginpage/products/edit/207`, async (currentPage) =>
        currentPage.evaluate(() => ({
          editorCount: document.querySelectorAll(".admin-editor-shell").length,
          hasPriceFields:
            Boolean(document.querySelector('input[name="regularPriceValue"]')) &&
            Boolean(document.querySelector('input[name="salePriceValue"]')),
          hasListLink:
            Boolean(document.querySelector('a[href="/loginpage/products"]')) ||
            Boolean(document.querySelector('a[href^="/loginpage/products/page/"]'))
        }))
      )
    );

    results.push(
      await capturePage(page, runDir, "shop", `${cloneBaseUrl}/shop`, async (currentPage) =>
        currentPage.evaluate(() => {
          const card208 = document.querySelector('.shop-card a[href="/product/208"]')?.closest(".shop-card");
          const card168 = document.querySelector('.shop-card a[href="/product/168"]')?.closest(".shop-card");
          const footerText = document.querySelector(".site-footer")?.textContent || "";

          return {
            cardCount: document.querySelectorAll(".shop-card").length,
            product207Hidden: !document.querySelector('.shop-card a[href="/product/207"]'),
            product208HasStrike: Boolean(card208?.querySelector(".catalog-price-strike")),
            product208HasSoldOut: /SOLD OUT/.test(card208?.textContent || ""),
            product168HasReserved: /RESERVED/.test(card168?.textContent || ""),
            footerHasOnlyMarketedCopy:
              footerText.includes("마케티드") && !footerText.includes("알로하 유튜브 연구소 all rights reserved")
          };
        })
      )
    );

    results.push(
      await capturePage(page, runDir, "product-208", `${cloneBaseUrl}/product/208`, async (currentPage) =>
        currentPage.evaluate(() => ({
          hasStrike: Boolean(document.querySelector(".product-price-hero .catalog-price-strike")),
          hasSoldOutBadge: /SOLD OUT/.test(document.querySelector(".product-buybox")?.textContent || ""),
          priceText: document.querySelector(".product-price-hero")?.textContent?.replace(/\s+/g, " ").trim() || ""
        }))
      )
    );

    results.push(
      await capturePage(page, runDir, "my-account", `${cloneBaseUrl}/my-account`, async (currentPage) =>
        currentPage.evaluate(() => ({
          inputCount: document.querySelectorAll(".account-panel input").length,
          noSignupButton: !Array.from(document.querySelectorAll("button, a")).find((element) =>
            /회원가입하기/.test(element.textContent || "")
          ),
          noPasswordField: !document.querySelector('.account-panel input[type="password"]'),
          hasAccountNotice: /온라인 회원가입과 웹 로그인 기능은 현재 운영하지 않습니다/.test(document.body.textContent || "")
        }))
      )
    );

    const report = {
      generatedAt: new Date().toISOString(),
      cloneBaseUrl,
      runDir,
      checksPassed: results.every((result) =>
        Object.values(result.checks).every((value) => (typeof value === "boolean" ? value : true))
      ),
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
