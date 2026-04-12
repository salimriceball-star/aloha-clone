import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright-core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "browseros-order-admin-qa");
const cloneBaseUrl = process.env.CLONE_BASE_URL ?? "http://127.0.0.1:3003";
const browserOsCdpUrl = process.env.BROWSEROS_CDP_URL ?? "http://127.0.0.1:9100";
const orderEmail = `qa-${Date.now()}@gmail.com`;
const testProductId = Number(process.env.TEST_PRODUCT_ID ?? 2768);

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function ensureBrowserOsReady() {
  const versionResponse = await fetch(`${browserOsCdpUrl}/json/version`);
  if (!versionResponse.ok) {
    throw new Error(`BrowserOS CDP version check failed: ${versionResponse.status}`);
  }

  const version = (await versionResponse.json()) as { webSocketDebuggerUrl?: string };
  return version.webSocketDebuggerUrl ?? browserOsCdpUrl;
}

async function readAdminPassword() {
  const envRaw = await readFile(path.join(repoRoot, ".local", "supabase.env"), "utf8");
  const password = envRaw.match(/^SUPABASE_DB_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!password) {
    throw new Error("Admin password not found");
  }

  return password;
}

async function waitForSettled(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 5_000 });
  } catch {}
  await page.waitForTimeout(800);
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

async function clearCloneStorage(page: Page) {
  await page.goto(`${cloneBaseUrl}/`, { waitUntil: "domcontentloaded" });
  await waitForSettled(page);
  await page.evaluate(() => {
    window.localStorage.removeItem("aloha-clone/cart");
  });
}

async function seedCart(page: Page) {
  await page.goto(`${cloneBaseUrl}/cart`, { waitUntil: "domcontentloaded" });
  await waitForSettled(page);
  await page.evaluate((productId) => {
    window.localStorage.setItem("aloha-clone/cart", JSON.stringify([{ productId, quantity: 1 }]));
  }, testProductId);
}

async function createOrder(page: Page) {
  await seedCart(page);
  await page.goto(`${cloneBaseUrl}/checkout`, { waitUntil: "domcontentloaded" });
  await waitForSettled(page);

  await page.locator('input[required]').first().fill("주문테스트");
  await page.locator('input[type="email"]').fill(orderEmail);
  await page.locator('input[type="tel"]').fill("010-1234-5678");
  const memoField = page.locator("textarea").first();
  if (await memoField.count()) {
    await memoField.fill("BrowserOS order QA");
  }

  await Promise.all([
    page.waitForURL(/\/checkout\/order-received\/[^/?]+/),
    page.getByRole("button", { name: "주문 확정" }).click()
  ]);
  await waitForSettled(page);

  const match = page.url().match(/\/checkout\/order-received\/([^/?]+)\?key=([^&]+)/);
  if (!match) {
    throw new Error(`Order confirmation URL not found: ${page.url()}`);
  }

  return {
    orderId: decodeURIComponent(match[1]),
    orderKey: decodeURIComponent(match[2])
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
    await clearCloneStorage(page);
    const order = await createOrder(page);
    await page.screenshot({ path: path.join(runDir, "order-received.png"), fullPage: true });

    await ensureAdminSession(page, adminPassword);
    await page.goto(`${cloneBaseUrl}/loginpage/orders`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);

    const adminChecks = await page.evaluate(
      ({ orderId, email }) => ({
        hasOrderId: document.body.textContent?.includes(orderId) ?? false,
        hasEmail: document.body.textContent?.includes(email) ?? false,
        cardCount: document.querySelectorAll(".admin-order-card").length
      }),
      { orderId: order.orderId, email: orderEmail }
    );

    await page.screenshot({ path: path.join(runDir, "admin-orders.png"), fullPage: true });

    const report = {
      generatedAt: new Date().toISOString(),
      cloneBaseUrl,
      orderEmail,
      order,
      adminChecks
    };

    const reportPath = path.join(runDir, "report.json");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ reportPath, report }, null, 2));
  } finally {
    await page.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
