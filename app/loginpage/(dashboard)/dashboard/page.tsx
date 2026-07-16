import { listAdminAssets, listAdminOrders, listAdminProductOverrides } from "@/lib/admin-store";
import { getAdminDbHealthStatus } from "@/lib/admin-db";
import { ensureAdminContentCatalog, getSiteMeta } from "@/lib/site-data";
import { getSiteUrlInfo } from "@/lib/site-url";

function connectionModeLabel(mode: Awaited<ReturnType<typeof getAdminDbHealthStatus>>["connectionMode"]) {
  if (mode === "supavisor-transaction") return "Supavisor transaction pooler";
  if (mode === "supavisor-session") return "Supavisor session pooler";
  if (mode === "direct") return "Direct PostgreSQL";
  return "미설정";
}

export default async function LoginpageDashboardPage() {
  const [posts, products, assets, orders, dbHealth, siteMeta] = await Promise.all([
    ensureAdminContentCatalog(),
    listAdminProductOverrides(),
    listAdminAssets(),
    listAdminOrders(12),
    getAdminDbHealthStatus(),
    getSiteMeta()
  ]);
  const siteUrlInfo = getSiteUrlInfo(siteMeta.home);
  const heartbeatAge = dbHealth.lastCronSuccessAt ? Date.now() - Date.parse(dbHealth.lastCronSuccessAt) : null;
  const heartbeatRecent = heartbeatAge !== null && heartbeatAge < 36 * 60 * 60 * 1_000;

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Overview</p>
        <h1>운영 대시보드</h1>
        <div className="stats-grid">
          <article className="stat-card">
            <span>글·페이지</span>
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
          <article className="stat-card">
            <span>최근 주문</span>
            <strong>{orders.length}</strong>
          </article>
          <article className="stat-card">
            <span>Supabase DB</span>
            <strong>{dbHealth.available ? "정상" : "연결 실패"}</strong>
          </article>
        </div>

        <div className="admin-inline-flags">
          <span>{connectionModeLabel(dbHealth.connectionMode)}</span>
          <span>현재 확인 {new Date(dbHealth.checkedAt).toLocaleString("ko-KR")}</span>
        </div>
        {dbHealth.lastCronSuccessAt ? (
          <p className={heartbeatRecent ? "inline-note" : "warning-text"}>
            일일 DB 확인 최근 성공: {new Date(dbHealth.lastCronSuccessAt).toLocaleString("ko-KR")}
            {heartbeatRecent ? "" : " · 36시간 이상 새 성공 기록이 없습니다."}
          </p>
        ) : (
          <p className="warning-text">아직 일일 DB 확인 성공 기록이 없습니다. CRON_SECRET과 Vercel Cron 설정을 확인해 주세요.</p>
        )}

        <div className="admin-inline-flags">
          <span>SEO 기준 주소 {siteUrlInfo.url.origin}</span>
          <span>{siteUrlInfo.source === "explicit" ? "직접 설정" : siteUrlInfo.source === "vercel-production" ? "Vercel 운영 도메인" : "원본 fallback"}</span>
        </div>
        {siteUrlInfo.source === "source-fallback" ? (
          <p className="warning-text">커스텀 도메인 연결 전에 NEXT_PUBLIC_SITE_URL을 최종 HTTPS 주소로 설정해 주세요.</p>
        ) : null}
      </section>
    </section>
  );
}
