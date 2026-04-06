import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const envFilePaths = [".local/supabase.env", ".local/cloudinary.env", ".local/admin.env"];

let cachedLocalEnv: Record<string, string> | null = null;

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(content: string) {
  const result: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(normalized.slice(separatorIndex + 1).trim());
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function loadLocalEnv() {
  if (cachedLocalEnv) {
    return cachedLocalEnv;
  }

  cachedLocalEnv = {};
  const projectRoot = process.cwd();

  for (const relativePath of envFilePaths) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }

    Object.assign(cachedLocalEnv, parseEnvFile(readFileSync(absolutePath, "utf8")));
  }

  return cachedLocalEnv;
}

export function getServerEnv(key: string) {
  return process.env[key] ?? loadLocalEnv()[key];
}

export function hasServerEnv(key: string) {
  return Boolean(getServerEnv(key));
}

export function requireServerEnv(key: string) {
  const value = getServerEnv(key);
  if (!value) {
    throw new Error(`Missing required server env: ${key}`);
  }

  return value;
}
