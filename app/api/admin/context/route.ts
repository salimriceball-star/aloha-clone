import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminPostByPathRequired } from "@/lib/admin-store";
import type { AdminPostRecord } from "@/lib/admin-store";
import { ensureAdminContentCatalog } from "@/lib/site-data";

export const dynamic = "force-dynamic";

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow"
  };
}

function normalizePathname(value: string | null) {
  if (!value || !value.startsWith("/") || value.length > 500) {
    return "/";
  }
  return value === "/" ? value : `/${value.replace(/^\/+|\/+$/g, "")}`;
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new Response(null, { status: 204, headers: noStoreHeaders() });
  }

  const pathname = normalizePathname(request.nextUrl.searchParams.get("path"));
  const productMatch = pathname.match(/^\/product\/([^/]+)$/);

  if (productMatch) {
    let slug = productMatch[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      // Keep the normalized path segment when it contains malformed escaping.
    }
    return NextResponse.json(
      {
        editHref: `/loginpage/products/edit/${encodeURIComponent(slug)}`,
        editLabel: "이 상품 편집",
        contentLabel: `상품 · ${slug}`,
        listHref: "/loginpage/products",
        listLabel: "상품 관리"
      },
      { headers: noStoreHeaders() }
    );
  }

  let content: AdminPostRecord | null = null;
  if (pathname !== "/") {
    try {
      content = await getAdminPostByPathRequired(pathname);
      if (!content) {
        const catalog = await ensureAdminContentCatalog();
        const normalized = pathname.replace(/\/+$/, "");
        content =
          catalog.find((record) => record.path.replace(/\/+$/, "") === normalized) ??
          catalog.find((record) => record.slug === pathname.split("/").filter(Boolean).at(-1)) ??
          null;
      }
    } catch (error) {
      console.error("[admin-public-context]", error instanceof Error ? error.message : "Unknown database error");
    }
  }

  const isProductArea = pathname === "/shop" || pathname.startsWith("/shop/");
  const listHref = isProductArea ? "/loginpage/products" : "/loginpage/posts";
  const listLabel = isProductArea ? "상품 관리" : "글·페이지 관리";

  return NextResponse.json(
    {
      editHref: content ? `/loginpage/posts/edit/${content.id}` : null,
      editLabel: content ? "이 내용 편집" : null,
      contentLabel: content ? `${content.contentType === "page" ? "페이지" : "글"} · ${content.title}` : null,
      listHref,
      listLabel
    },
    { headers: noStoreHeaders() }
  );
}
