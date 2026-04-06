import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

import { sourceBaseUrl as configuredSourceBaseUrl } from "@/lib/project-config";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "browseros-protected-qa");
const cloneBaseUrl = process.env.CLONE_BASE_URL ?? "http://127.0.0.1:3000";
const sourceBaseUrl = process.env.SOURCE_BASE_URL ?? configuredSourceBaseUrl.replace(/\/+$/, "");
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
  return {
    cdpEndpoint: version.webSocketDebuggerUrl ?? browserOsCdpUrl,
    health
  };
}

async function waitForSettled(page: import("playwright-core").Page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 5_000 });
  } catch {}
  await page.waitForTimeout(800);
}

async function loadProtectedSpecs() {
  const payload = JSON.parse(
    await (await import("node:fs/promises")).readFile(
      path.join(repoRoot, "data", "admin-wp-export", "protected-posts.json"),
      "utf8"
    )
  ) as {
    protectedPosts: Array<{ id: number; password: string; title: string }>;
  };

  return payload.protectedPosts.map((post) => ({
    id: post.id,
    password: post.password,
    title: post.title
  }));
}

async function run() {
  const protectedSpecs = await loadProtectedSpecs();
  const timestamp = buildTimestamp();
  const runDir = path.join(artifactsRoot, timestamp);
  await mkdir(runDir, { recursive: true });

  const readiness = await ensureBrowserOsReady();
  const browser = await chromium.connectOverCDP(readiness.cdpEndpoint);
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("BrowserOS default context not found");
  }

  const reportEntries: Array<{
    id: number;
    cloneLockedHeading: string | null;
    cloneUnlockedHeading: string | null;
    sourceLockedHeading: string | null;
    clonePasswordForm: boolean;
    sourcePasswordForm: boolean;
  }> = [];

  for (const spec of protectedSpecs) {
    const clonePage = await context.newPage();
    await clonePage.setViewportSize({ width: 1440, height: 1800 });
    await clonePage.goto(`${cloneBaseUrl}/${spec.id}`, { waitUntil: "domcontentloaded" });
    await waitForSettled(clonePage);

    const cloneLockedHeading = await clonePage.locator("h1").textContent();
    const clonePasswordForm = (await clonePage.locator(".password-form").count()) > 0;
    await clonePage.screenshot({ path: path.join(runDir, `clone-${spec.id}-locked.png`), fullPage: true });

    await clonePage.locator('input[type="password"]').fill(spec.password);
    await Promise.all([
      clonePage.locator("h1").filter({ hasText: spec.title }).waitFor({ timeout: 5_000 }),
      clonePage.getByRole("button", { name: "확인" }).click()
    ]);
    await waitForSettled(clonePage);

    const cloneUnlockedHeading = await clonePage.locator("h1").textContent();
    await clonePage.screenshot({ path: path.join(runDir, `clone-${spec.id}-unlocked.png`), fullPage: true });
    await clonePage.close();

    const sourcePage = await context.newPage();
    await sourcePage.setViewportSize({ width: 1440, height: 1800 });
    await sourcePage.goto(`${sourceBaseUrl}/${spec.id}/`, { waitUntil: "domcontentloaded" });
    await waitForSettled(sourcePage);

    const sourceLockedHeading = await sourcePage.locator("h1").textContent();
    const sourcePasswordForm = (await sourcePage.locator("form.post-password-form").count()) > 0;
    await sourcePage.screenshot({ path: path.join(runDir, `source-${spec.id}-locked.png`), fullPage: true });
    await sourcePage.close();

    reportEntries.push({
      id: spec.id,
      cloneLockedHeading: cloneLockedHeading?.trim() ?? null,
      cloneUnlockedHeading: cloneUnlockedHeading?.trim() ?? null,
      sourceLockedHeading: sourceLockedHeading?.trim() ?? null,
      clonePasswordForm,
      sourcePasswordForm
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    browserOsHealth: readiness.health,
    cloneBaseUrl,
    sourceBaseUrl,
    entries: reportEntries
  };

  await writeFile(path.join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ runDir, entries: reportEntries }, null, 2));
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
