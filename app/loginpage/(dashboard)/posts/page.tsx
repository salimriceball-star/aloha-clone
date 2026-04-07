import { savePostAction } from "@/app/admin/actions";
import { listAdminPosts } from "@/lib/admin-store";

export default async function LoginpagePostsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [posts, params] = await Promise.all([listAdminPosts(), searchParams]);

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Posts</p>
        <h1>글쓰기</h1>
        <form action={savePostAction} className="admin-form-grid">
          <label className="field">
            <span>제목</span>
            <input name="title" required />
          </label>
          <label className="field">
            <span>슬러그</span>
            <input name="slug" placeholder="auto-generated-if-empty" />
          </label>
          <label className="field">
            <span>발행일시</span>
            <input type="datetime-local" name="publishedAt" defaultValue={new Date().toISOString().slice(0, 16)} />
          </label>
          <label className="field">
            <span>공개범위</span>
            <select name="visibility" defaultValue="public">
              <option value="public">공개</option>
              <option value="hidden">링크로만 접근</option>
              <option value="private">비공개</option>
              <option value="password">비밀번호 보호</option>
            </select>
          </label>
          <label className="field field-wide">
            <span>직접 경로</span>
            <input name="path" placeholder="/2026/04/sample-post" />
          </label>
          <label className="field field-wide">
            <span>비밀번호</span>
            <input name="accessPassword" placeholder="visibility=password 인 경우만 입력" />
          </label>
          <label className="field field-wide">
            <span>요약 HTML</span>
            <textarea name="excerptHtml" rows={5} />
          </label>
          <label className="field field-wide">
            <span>본문 HTML</span>
            <textarea name="contentHtml" rows={16} required />
          </label>
          <label className="admin-checkbox">
            <input type="checkbox" name="listedInArchive" defaultChecked />
            <span>글 목록과 홈에 노출</span>
          </label>
          <button type="submit" className="action-button">
            저장
          </button>
          {params.saved === "1" ? <p className="inline-note">저장되었습니다.</p> : null}
          {params.error === "1" ? <p className="warning-text">필수 입력값을 확인해 주세요.</p> : null}
        </form>
      </section>

      <section className="panel">
        <h2>등록된 추가 글</h2>
        <div className="admin-list">
          {posts.map((post) => (
            <article key={post.id} className="admin-list-card">
              <strong>{post.title}</strong>
              <span>{post.path}</span>
              <span>
                {post.visibility} · {post.listedInArchive ? "archive" : "direct"}
              </span>
            </article>
          ))}
          {posts.length === 0 ? <p className="empty-state">아직 추가 글이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
