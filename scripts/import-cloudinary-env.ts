import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { projectRoot } from "@/lib/project-config";

type CloudinaryValues = {
  CLOUDINARY_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER?: string;
};

const aliases: Record<string, keyof CloudinaryValues> = {
  CLOUDINARY_URL: "CLOUDINARY_URL",
  CLOUDINARY_CLOUD_NAME: "CLOUDINARY_CLOUD_NAME",
  CLOUDINARY_API_KEY: "CLOUDINARY_API_KEY",
  CLOUDINARY_API_SECRET: "CLOUDINARY_API_SECRET",
  CLOUDINARY_FOLDER: "CLOUDINARY_FOLDER",
  "CLOUD NAME": "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY CLOUD NAME": "CLOUDINARY_CLOUD_NAME",
  "API KEY": "CLOUDINARY_API_KEY",
  "CLOUDINARY API KEY": "CLOUDINARY_API_KEY",
  "API SECRET": "CLOUDINARY_API_SECRET",
  "CLOUDINARY API SECRET": "CLOUDINARY_API_SECRET"
};

function argumentValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function toLinuxPath(input: string) {
  const windowsPath = input.match(/^([a-zA-Z]):[\\/](.*)$/);
  if (!windowsPath) return resolve(input);
  const drive = windowsPath[1].toLowerCase();
  const rest = windowsPath[2].replaceAll("\\", "/");
  return `/mnt/${drive}/${rest}`;
}

function cleanMarkdownValue(input: string) {
  let value = input.trim().replace(/^[:=\s]+/, "").trim();
  value = value.replace(/^`{1,3}/, "").replace(/`{1,3}$/, "").trim();
  value = value.replace(/^['"]|['"]$/g, "").trim();
  value = value.replace(/\s+\|\s*$/, "").trim();
  value = value.replace(/\s+(?:#|<!--).*$/, "").trim();
  return value;
}

function extractValues(markdown: string) {
  const values: CloudinaryValues = {};
  const url = markdown.match(/cloudinary:\/\/[^\s`'"<>|]+/i)?.[0];
  if (url) values.CLOUDINARY_URL = cleanMarkdownValue(url);

  for (const line of markdown.split(/\r?\n/)) {
    const normalized = line
      .replace(/^\s*(?:[-*+]\s+|\d+\.\s+|>\s*)/, "")
      .replace(/^\s*\|\s*/, "")
      .trim();
    const match = normalized.match(/^([^:=|]{2,80})\s*(?:=|:|\|)\s*(.+?)\s*\|?$/);
    if (!match) continue;
    const label = match[1].replace(/[*_`]/g, "").trim().toUpperCase().replace(/[-_]+/g, " ");
    const canonicalLabel = label.startsWith("CLOUDINARY ")
      ? label.replaceAll(" ", "_")
      : label;
    const key = aliases[canonicalLabel] ?? aliases[label];
    if (!key) continue;
    const value = cleanMarkdownValue(match[2]);
    if (value && !/[\r\n\0]/.test(value)) values[key] = value;
  }
  return values;
}

function validate(values: CloudinaryValues) {
  if (values.CLOUDINARY_URL) {
    const parsed = new URL(values.CLOUDINARY_URL);
    if (parsed.protocol !== "cloudinary:" || !parsed.username || !parsed.password || !parsed.hostname) {
      throw new Error("CLOUDINARY_URL must contain API key, secret, and cloud name");
    }
    return;
  }
  const required = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
  const missing = required.filter((key) => !values[key]);
  if (missing.length > 0) throw new Error(`Missing Cloudinary fields: ${missing.join(", ")}`);
}

function serialize(values: CloudinaryValues) {
  const order = [
    "CLOUDINARY_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_FOLDER"
  ] as const;
  return `${order
    .filter((key) => values[key])
    .map((key) => `${key}=${values[key]}`)
    .join("\n")}\n`;
}

async function main() {
  const sourceArgument = argumentValue("--source") ?? process.argv[2];
  if (!sourceArgument) throw new Error("usage: npm run import:cloudinary-env -- --source <markdown-path>");
  const sourcePath = toLinuxPath(sourceArgument);
  const outputPath = resolve(argumentValue("--output") ?? join(projectRoot, ".local", "cloudinary.env"));
  const markdown = await readFile(sourcePath, "utf8");
  const values = extractValues(markdown);
  validate(values);
  values.CLOUDINARY_FOLDER ??= "aloha-clone";

  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, serialize(values), { mode: 0o600, flag: "wx" });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, outputPath);
    await chmod(outputPath, 0o600);
  } finally {
    await rm(temporaryPath, { force: true });
  }
  const presentKeys = Object.keys(values).sort();
  console.log(JSON.stringify({ sourcePath, outputPath, mode: "600", presentKeys }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
