"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AdminToolbarContext = {
  editHref: string | null;
  editLabel: string | null;
  contentLabel: string | null;
  listHref: string;
  listLabel: string;
};

function isAdminRoute(pathname: string) {
  return pathname === "/loginpage" || pathname.startsWith("/loginpage/") || pathname.startsWith("/admin");
}

export function AdminPublicToolbar() {
  const pathname = usePathname();
  const [context, setContext] = useState<AdminToolbarContext | null>(null);
  const hidden = isAdminRoute(pathname);

  useEffect(() => {
    if (hidden) {
      setContext(null);
      return;
    }

    const controller = new AbortController();
    setContext(null);

    fetch(`/api/admin/context?path=${encodeURIComponent(pathname)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal
    })
      .then(async (response) => {
        if (response.status === 204) {
          return null;
        }
        if (!response.ok) {
          throw new Error(`Admin context request failed: ${response.status}`);
        }
        return (await response.json()) as AdminToolbarContext;
      })
      .then((payload) => setContext(payload))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setContext(null);
      });

    return () => controller.abort();
  }, [hidden, pathname]);

  if (hidden || !context) {
    return null;
  }

  return (
    <aside className="admin-public-toolbar" aria-label="공개 페이지 관리자 도구">
      <div className="admin-public-toolbar-inner">
        <span className="admin-public-toolbar-mode">관리자 모드</span>
        {context.contentLabel ? <span className="admin-public-toolbar-context">{context.contentLabel}</span> : null}
        <nav className="admin-public-toolbar-nav">
          {context.editHref && context.editLabel ? (
            <Link href={context.editHref} className="admin-public-toolbar-primary">
              {context.editLabel}
            </Link>
          ) : null}
          <Link href="/loginpage/dashboard">대시보드</Link>
          <Link href={context.listHref}>{context.listLabel}</Link>
          <Link href="/loginpage/posts/new">새 글</Link>
        </nav>
      </div>
    </aside>
  );
}
