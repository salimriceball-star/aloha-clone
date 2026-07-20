import Link from "next/link";

import { duplicatePostAction, setPostPublicationAction } from "@/app/admin/actions";
import { ensureAdminContentCatalog } from "@/lib/site-data";

const visibilityLabel = {
  public: "공개",
  hidden: "링크 전용",
  password: "비밀번호",
  private: "완전 비공개"
} as const;

export default async function LoginpagePostsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; saved?: string; status?: string; error?: string }>;
}) {
  const params = await searchParams;
  let databaseAvailable = true;
  const posts = await ensureAdminContentCatalog().catch((error) => {
    databaseAvailable = false;
    console.error("[admin-posts-list]", error instanceof Error ? error.message : "Unknown database error");
    return [];
  });
  const query = params.q?.trim().toLocaleLowerCase("ko-KR") ?? "";
  const filteredPosts = query
    ? posts.filter((post) => `${post.title} ${post.slug} ${post.path}`.toLocaleLowerCase("ko-KR").includes(query))
    : posts;

  return (
    <section className="stack-grid">
      <section className="panel admin-post-index">
        <div className="admin-product-head">
          <div>
            <p className="eyebrow">Content</p>
            <h1>글·페이지 관리</h1>
            <p>기존 글, 이용약관 같은 고정 페이지, 홈 설정을 한곳에서 관리합니다. 상품은 상품 관리에서 별도로 다룹니다.</p>
          </div>
          <Link href="/loginpage/posts/new" className="action-button">새 콘텐츠</Link>
        </div>

        {params.saved ? <p className="success-text">글을 {params.saved === "published" ? "발행" : "초안 저장"}했습니다.</p> : null}
        {params.status ? <p className="success-text">발행 상태를 변경했습니다.</p> : null}
        {params.error ? <p className="warning-text">요청한 글 작업을 완료하지 못했습니다.</p> : null}
        {!databaseAvailable ? (
          <p className="warning-text">
            Supabase DB에 연결하지 못해 글·페이지 목록을 불러오지 못했습니다. 현재 0개인 것이 아니므로 잠시 후 새로고침해 주세요.
          </p>
        ) : null}

        <form className="admin-post-filter" action="/loginpage/posts">
          <label className="field">
            <span>콘텐츠 검색</span>
            <input type="search" name="q" defaultValue={params.q} placeholder="제목, 슬러그, 경로" />
          </label>
          <button type="submit" className="action-button secondary-button">찾기</button>
        </form>

        <div className="admin-list">
          {filteredPosts.map((post) => {
            const scheduled = post.publicationStatus === "published" && Date.parse(post.publishedAt) > Date.now();
            const live = post.publicationStatus === "published" && !scheduled && post.visibility !== "private";
            return (
              <article key={post.id} className="admin-list-card admin-post-card">
                <div className="admin-product-head">
                  <div>
                    <strong>{post.title}</strong>
                    <span>{post.contentType === "page" ? "페이지" : "글"} · {post.path}</span>
                  </div>
                  <div className="admin-inline-flags">
                    <span>{post.publicationStatus === "draft" ? "초안" : scheduled ? "예약" : "발행"}</span>
                    <span>{visibilityLabel[post.visibility]}</span>
                    {post.listedInArchive ? <span>목록</span> : null}
                    {post.listedInSearch ? <span>검색</span> : null}
                    {post.allowIndexing ? <span>색인</span> : <span>noindex</span>}
                  </div>
                </div>
                <span>발행일 {new Date(post.publishedAt).toLocaleString("ko-KR")} · 수정 {new Date(post.updatedAt).toLocaleString("ko-KR")}</span>
                <div className="admin-page-actions">
                  <Link href={`/loginpage/posts/edit/${post.id}`} className="action-button secondary-button">수정</Link>
                  {live ? <Link href={post.path} target="_blank" className="action-button secondary-button">보기</Link> : null}
                  <form action={duplicatePostAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <button type="submit" className="action-button secondary-button">복사</button>
                  </form>
                  <form action={setPostPublicationAction}>
                    <input type="hidden" name="id" value={post.id} />
                    <input type="hidden" name="publicationStatus" value={post.publicationStatus === "published" ? "draft" : "published"} />
                    <button type="submit" className="action-button secondary-button">
                      {post.publicationStatus === "published" ? "초안으로 전환" : "발행"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {databaseAvailable && filteredPosts.length === 0 ? (
            <p className="empty-state">조건에 맞는 글 또는 페이지가 없습니다.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
