import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type BrowserContext, type Page } from "playwright-core";

import { siteStoragePrefix, sourceBaseUrl as configuredSourceBaseUrl } from "@/lib/project-config";

type PageResult = {
  id: string;
  kind: "clone" | "source";
  url: string;
  screenshot: string;
  title: string;
  heading: string | null;
  scrollHeight: number;
  brokenImages: Array<{
    currentSrc: string;
    alt: string;
    complete: boolean;
    naturalWidth: number;
  }>;
  consoleMessages: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
};

type CaptureSpec = {
  id: string;
  kind: "clone" | "source";
  url: string;
  prepare?: (page: Page) => Promise<void>;
  cleanup?: (page: Page) => Promise<void>;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "browseros-qa");
const cloneBaseUrl = process.env.CLONE_BASE_URL ?? "http://127.0.0.1:3000";
const sourceBaseUrl = process.env.SOURCE_BASE_URL ?? configuredSourceBaseUrl.replace(/\/+$/, "");
const browserOsHealthUrl = process.env.BROWSEROS_HEALTH_URL ?? "http://127.0.0.1:9200/health";
const browserOsCdpUrl = process.env.BROWSEROS_CDP_URL ?? "http://127.0.0.1:9100";
const cartStorageKey = `${siteStoragePrefix}/cart`;
const cartUpdatedEvent = `${siteStoragePrefix}:cart-updated`;

const cloneCartSeed = [
  { productId: 2768, quantity: 1 },
  { productId: 2760, quantity: 1 },
  { productId: 2754, quantity: 1 }
];

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function trimText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function sanitizeMessage(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clampMessages(values: string[]) {
  return values.slice(0, 20);
}

function shouldIgnoreRequestFailure(url: string, errorText: string) {
  return (
    url.includes("analytics.google.com") ||
    (errorText === "net::ERR_ABORTED" && url.includes("_rsc="))
  );
}

function shouldIgnorePageError(message: string) {
  return message.includes("The document is sandboxed and lacks the 'allow-same-origin' flag.");
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

  if (browserOsCdpUrl.startsWith("ws://") || browserOsCdpUrl.startsWith("wss://")) {
    return {
      cdpEndpoint: browserOsCdpUrl,
      health
    };
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

async function waitForSettled(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 5_000 });
  } catch {}
  await page.waitForTimeout(1_000);
}

async function seedCloneCart(page: Page) {
  await page.goto(cloneBaseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ storageKey, items, updatedEvent }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
      window.dispatchEvent(new Event(updatedEvent));
    },
    { storageKey: cartStorageKey, items: cloneCartSeed, updatedEvent: cartUpdatedEvent }
  );
  await page.waitForTimeout(300);
}

async function clearCloneCart(page: Page) {
  await page.goto(cloneBaseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ storageKey, updatedEvent }) => {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(updatedEvent));
  }, { storageKey: cartStorageKey, updatedEvent: cartUpdatedEvent });
  await page.waitForTimeout(200);
}

async function capturePage(context: BrowserContext, runDir: string, spec: CaptureSpec): Promise<PageResult> {
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(`${message.type()}: ${sanitizeMessage(message.text())}`);
    }
  });
  page.on("pageerror", (error) => {
    const message = sanitizeMessage(error.message);
    if (shouldIgnorePageError(message)) {
      return;
    }
    pageErrors.push(message);
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "failed";
    if (shouldIgnoreRequestFailure(request.url(), errorText)) {
      return;
    }
    failedRequests.push(`${request.method()} ${request.url()} :: ${errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.setViewportSize({ width: 1440, height: 1800 });
    page.setDefaultNavigationTimeout(60_000);
    await page.bringToFront();
    if (spec.prepare) {
      await spec.prepare(page);
    }

    await page.goto(spec.url, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);

    const screenshot = path.join(runDir, `${spec.id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    const diagnostics = await page.evaluate(() => ({
      title: document.title,
      heading:
        document.querySelector("main h1, article h1, section h1, h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      scrollHeight: document.documentElement.scrollHeight,
      brokenImages: Array.from(document.images)
        .map((image) => ({
          resolvedSrc: image.currentSrc || image.getAttribute("src") || "",
          loadedSrc: image.currentSrc || "",
          alt: image.alt,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          loading: image.loading
        }))
        .filter((image) => (image.loadedSrc || image.loading !== "lazy") && (!image.complete || image.naturalWidth === 0))
        .map((image) => ({
          currentSrc: image.resolvedSrc,
          alt: image.alt,
          complete: image.complete,
          naturalWidth: image.naturalWidth
        }))
    }));

    return {
      id: spec.id,
      kind: spec.kind,
      url: page.url(),
      screenshot,
      title: trimText(diagnostics.title) ?? "",
      heading: trimText(diagnostics.heading),
      scrollHeight: diagnostics.scrollHeight,
      brokenImages: diagnostics.brokenImages,
      consoleMessages: clampMessages(consoleMessages),
      pageErrors: clampMessages(pageErrors),
      failedRequests: clampMessages([...new Set(failedRequests)]),
      badResponses: clampMessages([...new Set(badResponses)])
    };
  } finally {
    if (spec.cleanup) {
      await spec.cleanup(page);
    }
    await page.close();
  }
}

async function captureCloneCheckoutFlow(context: BrowserContext, runDir: string) {
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(`${message.type()}: ${sanitizeMessage(message.text())}`);
    }
  });
  page.on("pageerror", (error) => {
    const message = sanitizeMessage(error.message);
    if (shouldIgnorePageError(message)) {
      return;
    }
    pageErrors.push(message);
  });
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText ?? "failed";
    if (shouldIgnoreRequestFailure(request.url(), errorText)) {
      return;
    }
    failedRequests.push(`${request.method()} ${request.url()} :: ${errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.setViewportSize({ width: 1440, height: 1800 });
    page.setDefaultNavigationTimeout(60_000);
    await page.bringToFront();
    await seedCloneCart(page);
    await page.goto(`${cloneBaseUrl}/checkout`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);

    const fields = page.locator(".field input");
    await fields.nth(0).fill("안누리");
    await fields.nth(1).fill("hello@example.com");
    await fields.nth(2).fill("010-1234-5678");
    await page.locator(".field textarea").fill("BrowserOS QA");
    await page.waitForTimeout(400);

    const checkoutFilledScreenshot = path.join(runDir, "clone-checkout-filled.png");
    await page.screenshot({ path: checkoutFilledScreenshot, fullPage: true });

    await Promise.all([
      page.waitForURL(/\/checkout\/order-received\/\d+/),
      page.getByRole("button", { name: "주문 확정" }).click()
    ]);
    await waitForSettled(page);

    const orderReceivedScreenshot = path.join(runDir, "clone-order-received.png");
    await page.screenshot({ path: orderReceivedScreenshot, fullPage: true });

    const diagnostics = await page.evaluate(() => ({
      title: document.title,
      heading:
        document.querySelector("main h1, article h1, section h1, h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      scrollHeight: document.documentElement.scrollHeight,
      brokenImages: Array.from(document.images)
        .map((image) => ({
          resolvedSrc: image.currentSrc || image.getAttribute("src") || "",
          loadedSrc: image.currentSrc || "",
          alt: image.alt,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          loading: image.loading
        }))
        .filter((image) => (image.loadedSrc || image.loading !== "lazy") && (!image.complete || image.naturalWidth === 0))
        .map((image) => ({
          currentSrc: image.resolvedSrc,
          alt: image.alt,
          complete: image.complete,
          naturalWidth: image.naturalWidth
        }))
    }));

    return [
      {
        id: "clone-checkout-filled",
        kind: "clone" as const,
        url: `${cloneBaseUrl}/checkout`,
        screenshot: checkoutFilledScreenshot,
        title: "무통장입금 결제",
        heading: "무통장입금 결제",
        scrollHeight: diagnostics.scrollHeight,
        brokenImages: [],
        consoleMessages: clampMessages(consoleMessages),
        pageErrors: clampMessages(pageErrors),
        failedRequests: clampMessages([...new Set(failedRequests)]),
        badResponses: clampMessages([...new Set(badResponses)])
      },
      {
        id: "clone-order-received",
        kind: "clone" as const,
        url: page.url(),
        screenshot: orderReceivedScreenshot,
        title: trimText(diagnostics.title) ?? "",
        heading: trimText(diagnostics.heading),
        scrollHeight: diagnostics.scrollHeight,
        brokenImages: diagnostics.brokenImages,
        consoleMessages: clampMessages(consoleMessages),
        pageErrors: clampMessages(pageErrors),
        failedRequests: clampMessages([...new Set(failedRequests)]),
        badResponses: clampMessages([...new Set(badResponses)])
      }
    ];
  } finally {
    await clearCloneCart(page);
    await page.close();
  }
}

async function main() {
  const timestamp = buildTimestamp();
  const runDir = path.join(artifactsRoot, timestamp);
  await mkdir(runDir, { recursive: true });

  const readiness = await ensureBrowserOsReady();
  const browser = await chromium.connectOverCDP(readiness.cdpEndpoint);
  const browserSession = await browser.newBrowserCDPSession();
  await browserSession.send("Security.setIgnoreCertificateErrors", { ignore: true });
  const context = browser.contexts()[0];

  if (!context) {
    throw new Error("BrowserOS default context not found");
  }

  const specs: CaptureSpec[] = [
    { id: "clone-home", kind: "clone", url: `${cloneBaseUrl}/` },
    { id: "clone-column", kind: "clone", url: `${cloneBaseUrl}/column` },
    { id: "clone-post-notice", kind: "clone", url: `${cloneBaseUrl}/2025/06/notice` },
    { id: "clone-shop", kind: "clone", url: `${cloneBaseUrl}/shop` },
    { id: "clone-product-208", kind: "clone", url: `${cloneBaseUrl}/product/208` },
    { id: "clone-product-207", kind: "clone", url: `${cloneBaseUrl}/product/207` },
    { id: "clone-product-206", kind: "clone", url: `${cloneBaseUrl}/product/206` },
    { id: "clone-product-205", kind: "clone", url: `${cloneBaseUrl}/product/205` },
    { id: "clone-deposit", kind: "clone", url: `${cloneBaseUrl}/deposit` },
    { id: "clone-my-account", kind: "clone", url: `${cloneBaseUrl}/my-account` },
    { id: "clone-terms", kind: "clone", url: `${cloneBaseUrl}/terms` },
    {
      id: "clone-cart",
      kind: "clone",
      url: `${cloneBaseUrl}/cart`,
      prepare: seedCloneCart,
      cleanup: clearCloneCart
    },
    { id: "source-home", kind: "source", url: `${sourceBaseUrl}/` },
    { id: "source-post-notice", kind: "source", url: `${sourceBaseUrl}/2025/06/notice/` },
    { id: "source-shop", kind: "source", url: `${sourceBaseUrl}/shop/` },
    { id: "source-product-208", kind: "source", url: `${sourceBaseUrl}/product/208/` },
    { id: "source-product-207", kind: "source", url: `${sourceBaseUrl}/product/207/` },
    { id: "source-product-206", kind: "source", url: `${sourceBaseUrl}/product/206/` },
    { id: "source-product-205", kind: "source", url: `${sourceBaseUrl}/product/205/` },
    { id: "source-deposit", kind: "source", url: `${sourceBaseUrl}/deposit/` },
    { id: "source-my-account", kind: "source", url: `${sourceBaseUrl}/my-account/` },
    { id: "source-terms", kind: "source", url: `${sourceBaseUrl}/terms/` },
    { id: "source-checkout", kind: "source", url: `${sourceBaseUrl}/checkout/` }
  ];

  const results: PageResult[] = [];

  for (const spec of specs) {
    const result = await capturePage(context, runDir, spec);
    results.push(result);
  }

  results.push(...(await captureCloneCheckoutFlow(context, runDir)));

  const report = {
    generatedAt: new Date().toISOString(),
    browserOsHealth: readiness.health,
    cdpEndpoint: readiness.cdpEndpoint,
    cloneBaseUrl,
    sourceBaseUrl,
    runDir,
    pages: results,
    summary: {
      pageCount: results.length,
      pagesWithBrokenImages: results.filter((result) => result.brokenImages.length > 0).length,
      pagesWithConsoleMessages: results.filter((result) => result.consoleMessages.length > 0).length,
      pagesWithErrors:
        results.filter(
          (result) =>
            result.pageErrors.length > 0 || result.failedRequests.length > 0 || result.badResponses.length > 0
        ).length
    }
  };

  const cloneIssues = results.filter(
    (result) =>
      result.kind === "clone" &&
      (result.brokenImages.length > 0 ||
        result.consoleMessages.length > 0 ||
        result.pageErrors.length > 0 ||
        result.failedRequests.length > 0 ||
        result.badResponses.length > 0)
  );

  const sourceIssues = results.filter(
    (result) =>
      result.kind === "source" &&
      (result.brokenImages.length > 0 ||
        result.consoleMessages.length > 0 ||
        result.pageErrors.length > 0 ||
        result.failedRequests.length > 0 ||
        result.badResponses.length > 0)
  );

  await writeFile(path.join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        runDir,
        summary: report.summary,
        cloneIssueCount: cloneIssues.length,
        sourceIssueCount: sourceIssues.length
      },
      null,
      2
    )
  );
  await browser.close();

  if (cloneIssues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
