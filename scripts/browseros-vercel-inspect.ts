import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright-core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "browseros-vercel");
const browserOsHealthUrl = process.env.BROWSEROS_HEALTH_URL ?? "http://127.0.0.1:9200/health";
const browserOsCdpUrl = process.env.BROWSEROS_CDP_URL ?? "http://127.0.0.1:9100";
const targetUrl = process.argv[2] ?? "https://vercel.com/dashboard";

type ScrollCandidate = {
  index: number;
  tagName: string;
  text: string;
  className: string;
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
  overflowY: string;
  score: number;
};

type ScrollSnapshot = {
  ratio: number;
  scrollTop: number;
  text: string;
};

type PageInfo = {
  title: string;
  url: string;
  bodyText: string;
  heading: string;
  candidates: ScrollCandidate[];
  snapshots: ScrollSnapshot[];
};

type NetworkEntry = {
  url: string;
  status: number;
  contentType: string;
  bodyPreview: string;
};

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getDeploymentIdFromUrl(url: string) {
  const directMatch = url.match(/\/(dpl_[A-Za-z0-9]+)(?:[/?#]|$)/);
  if (directMatch) {
    return directMatch[1];
  }

  const match = url.match(/\/([A-Za-z0-9]+)(?:[/?#]|$)/);
  if (!match) {
    return null;
  }

  const candidate = match[1];
  if (["settings", "deployments", "logs", "analytics", "speed-insights", "observability", "domains"].includes(candidate)) {
    return null;
  }

  return candidate.startsWith("dpl_") ? candidate : `dpl_${candidate}`;
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
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  } catch {}
  await page.waitForTimeout(2_000);
}

async function main() {
  const readiness = await ensureBrowserOsReady();
  const browser = await chromium.connectOverCDP(readiness.cdpEndpoint);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("BrowserOS default context not found");
  }

  const page = await context.newPage();
  const network: NetworkEntry[] = [];
  try {
    await page.setViewportSize({ width: 1600, height: 1800 });
    page.on("response", async (response) => {
      const url = response.url();
      if (!/vercel\.com|api\.vercel\.com/.test(url)) {
        return;
      }
      if (!/deploy|build|log|graphql|events|project/i.test(url)) {
        return;
      }

      let bodyPreview = "";
      try {
        const contentType = response.headers()["content-type"] ?? "";
        if (contentType.includes("application/json") || contentType.includes("text/plain")) {
          bodyPreview = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 1200);
        }
      } catch {}

      network.push({
        url,
        status: response.status(),
        contentType: response.headers()["content-type"] ?? "",
        bodyPreview
      });
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);

    const deploymentId = getDeploymentIdFromUrl(targetUrl);
    const events = deploymentId
      ? await page.evaluate(`
          (async () => {
            const response = await fetch("/api/v3/deployments/${deploymentId}/events?builds=1&direction=forward", {
              credentials: "include"
            });
            return await response.json();
          })()
        `)
      : null;

    const pageInfo = (await page.evaluate(`
      (async () => {
        const normalize = (value) => value ? value.replace(/\\s+/g, " ").trim() : "";
        const elements = Array.from(document.querySelectorAll("*"));
        const candidates = elements
          .map((element, index) => {
            const text = normalize(element.innerText || element.textContent || "");
            const style = window.getComputedStyle(element);
            const delta = element.scrollHeight - element.clientHeight;
            const score =
              (/(Build Failed|Command \\"npm run build\\" exited with 1|Running \\"install\\" command|npm install|added \\d+ packages|Production|Error)/i.test(text)
                ? 1000
                : 0) + delta;

            return {
              index,
              tagName: element.tagName,
              text,
              className: String(element.className || ""),
              scrollHeight: element.scrollHeight,
              clientHeight: element.clientHeight,
              scrollTop: element.scrollTop,
              overflowY: style.overflowY,
              score
            };
          })
          .filter((candidate) => candidate.scrollHeight > candidate.clientHeight + 100 && candidate.text)
          .sort((left, right) => right.score - left.score)
          .slice(0, 10);

        const snapshots = [];
        const picked = candidates[0];
        if (picked) {
          const element = elements[picked.index];
          const limit = Math.max(0, element.scrollHeight - element.clientHeight);
          for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
            element.scrollTop = Math.round(limit * ratio);
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            snapshots.push({
              ratio,
              scrollTop: element.scrollTop,
              text: normalize(element.innerText || element.textContent || "")
            });
          }
        }

        return {
          title: document.title,
          url: window.location.href,
          bodyText: normalize(document.body.innerText),
          heading: normalize(document.querySelector("h1")?.textContent),
          candidates,
          snapshots
        };
      })()
    `)) as PageInfo;

    const runDir = path.join(artifactsRoot, buildTimestamp());
    await mkdir(runDir, { recursive: true });
    const screenshotPath = path.join(runDir, "page.png");
    const reportPath = path.join(runDir, "report.json");

    await page.screenshot({ path: screenshotPath, fullPage: true });
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          targetUrl,
          screenshot: screenshotPath,
          network,
          events,
          ...(pageInfo as PageInfo)
        },
        null,
        2
      )
    );

    console.log(JSON.stringify({ runDir, reportPath, screenshotPath, title: pageInfo.title, url: pageInfo.url }, null, 2));
  } finally {
    await page.close();
    await browser.close();
  }
}

await main();
