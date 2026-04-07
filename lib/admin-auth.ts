import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/server-env";

const adminSessionCookie = "aloha_admin_session";
const sessionDurationSeconds = 60 * 60 * 24 * 30;

type AdminSessionPayload = {
  sub: "admin";
  exp: number;
};

function getAdminPassword() {
  return getServerEnv("ADMIN_PASSWORD") ?? getServerEnv("SUPABASE_DB_PASSWORD");
}

function getAdminSessionSecret() {
  return (
    getServerEnv("ADMIN_SESSION_SECRET") ??
    getServerEnv("SUPABASE_DB_PASSWORD") ??
    getServerEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    "aloha-admin-session"
  );
}

function base64urlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSession(value: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("base64url");
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readSessionPayload(token: string | undefined) {
  if (!token) {
    return null as AdminSessionPayload | null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null as AdminSessionPayload | null;
  }

  const expectedSignature = signSession(encodedPayload);
  if (!safeEquals(signature, expectedSignature)) {
    return null as AdminSessionPayload | null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as AdminSessionPayload;
    if (payload.sub !== "admin" || payload.exp < Date.now()) {
      return null as AdminSessionPayload | null;
    }

    return payload;
  } catch {
    return null as AdminSessionPayload | null;
  }
}

export async function verifyAdminPassword(input: string) {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }

  return safeEquals(input, expected);
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  const payload: AdminSessionPayload = {
    sub: "admin",
    exp: Date.now() + sessionDurationSeconds * 1000
  };
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const token = `${encodedPayload}.${signSession(encodedPayload)}`;

  cookieStore.set(adminSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return Boolean(readSessionPayload(cookieStore.get(adminSessionCookie)?.value));
}

export async function requireAdminSession() {
  if (!(await isAdminAuthenticated())) {
    redirect("/loginpage");
  }
}
