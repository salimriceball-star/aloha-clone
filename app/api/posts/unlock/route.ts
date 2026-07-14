import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPostByPath } from "@/lib/site-data";

type Attempt = {
  count: number;
  resetAt: number;
};

declare global {
  var __alohaPostUnlockAttempts__: Map<string, Attempt> | undefined;
}

const attempts = globalThis.__alohaPostUnlockAttempts__ ?? new Map<string, Attempt>();
globalThis.__alohaPostUnlockAttempts__ = attempts;

function passwordsMatch(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const body = (await request.json().catch(() => null)) as { path?: string; password?: string } | null;
  const path = body?.path?.trim() ?? "";
  const password = body?.password ?? "";
  const key = `${forwardedFor}:${path}`;
  const now = Date.now();
  const previous = attempts.get(key);
  const attempt = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + 10 * 60_000 };

  if (attempt.count >= 8) {
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const post = path ? await getPostByPath(path) : null;
  if (!post || post.visibility !== "password" || !post.accessPassword || !passwordsMatch(password, post.accessPassword)) {
    attempts.set(key, { ...attempt, count: attempt.count + 1 });
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  attempts.delete(key);
  const coverImageUrl =
    post.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;
  return NextResponse.json(
    { title: post.title, contentHtml: post.contentHtml, coverImageUrl },
    { headers: { "cache-control": "private, no-store" } }
  );
}
