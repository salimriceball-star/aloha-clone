import { timingSafeEqual } from "node:crypto";

import { recordAdminDbHeartbeat } from "@/lib/admin-db";
import { getServerEnv } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

function secretsMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  const cronSecret = getServerEnv("CRON_SECRET");
  if (!cronSecret) {
    console.error("[supabase-health] CRON_SECRET is not configured.");
    return Response.json({ ok: false, error: "health-check-not-configured" }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!secretsMatch(authorization, `Bearer ${cronSecret}`)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await recordAdminDbHeartbeat();
    console.info("[supabase-health]", result);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("[supabase-health]", error instanceof Error ? error.message : "Unknown database error");
    return Response.json(
      { ok: false, error: "database-unavailable", checkedAt: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
