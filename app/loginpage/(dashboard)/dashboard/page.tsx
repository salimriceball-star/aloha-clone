import { listAdminAssets, listAdminPosts, listAdminProductOverrides } from "@/lib/admin-store";

export default async function LoginpageDashboardPage() {
  const [posts, products, assets] = await Promise.all([
    listAdminPosts(),
    listAdminProductOverrides(),
    listAdminAssets()
  ]);

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Overview</p>
        <h1>운영 대시보드</h1>
        <div className="stats-grid">
          <article className="stat-card">
            <span>작성 글</span>
            <strong>{posts.length}</strong>
          </article>
          <article className="stat-card">
            <span>상품 오버라이드</span>
            <strong>{products.length}</strong>
          </article>
          <article className="stat-card">
            <span>업로드 자산</span>
            <strong>{assets.length}</strong>
          </article>
        </div>
      </section>
    </section>
  );
}
