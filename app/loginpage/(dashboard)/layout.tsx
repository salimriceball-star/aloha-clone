import Link from "next/link";

import { logoutAdminAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function LoginpageDashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <main className="shell admin-shell">
      <aside className="panel admin-sidebar">
        <p className="eyebrow">Admin</p>
        <nav className="admin-nav">
          <Link href="/loginpage/dashboard">대시보드</Link>
          <Link href="/loginpage/posts">글쓰기</Link>
          <Link href="/loginpage/products">상품 관리</Link>
          <Link href="/loginpage/orders">주문 확인</Link>
          <Link href="/loginpage/assets">이미지 업로드</Link>
        </nav>
        <form action={logoutAdminAction}>
          <button type="submit" className="action-button secondary-button">
            로그아웃
          </button>
        </form>
      </aside>
      <div className="admin-content">{children}</div>
    </main>
  );
}
