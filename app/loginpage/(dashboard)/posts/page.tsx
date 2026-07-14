import Link from "next/link";

import { duplicatePostAction, setPostPublicationAction } from "@/app/admin/actions";
import { listAdminPosts } from "@/lib/admin-store";

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
  const [posts, params] = await Promise.all([listAdminPosts(), searchParams]);
  const query = params.q?.trim().toLocaleLowerCase("ko-KR") ?? "";
  const filteredPosts = query
    ? posts.filter((post) => `${post.title} ${post.slug} ${post.path}`.toLocaleLowerCase("ko-KR").includes(query))
    : posts;

  return (
    <section className="stack-grid">
      <section className="panel admin-post-index">
        <div className="admin-product-head">
          <div>
            <p className="eyebrow">Posts</p>
            <h1>글 관리</h1>
            <p>목록에서는 가벼운 조회·상태 변경만 하고, 편집기는 한 글을 열 때만 로드합니다.</p>
          </div>
          <Link href="/loginpage/posts/new" className="action-button">새 글</Link>
        </div>

        {params.saved ? <p className="success-text">글을 {params.saved === "published" ? "발행" : "초안 저장"}했습니다.</p> : null}
        {params.status ? <p className="success-text">발행 상태를 변경했습니다.</p> : null}
        {params.error ? <p className="warning-text">요청한 글 작업을 완료하지 못했습니다.</p> : null}

        <form className="admin-post-filter" action="/loginpage/posts">
          <label className="field">
            <span>글 검색</span>
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
                    <span>{post.path}</span>
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
          {filteredPosts.length === 0 ? <p className="empty-state">조건에 맞는 추가 글이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
