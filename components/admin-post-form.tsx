import Link from "next/link";

import { savePostAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import type { AdminPostRecord } from "@/lib/admin-store";

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function AdminPostForm({
  post,
  error,
  copied = false
}: {
  post?: AdminPostRecord | null;
  error?: string;
  copied?: boolean;
}) {
  const isEdit = Boolean(post);
  const draftKey = post ? `post-${post.id}` : "post-new";

  return (
    <section className="panel admin-post-editor-panel">
      <div className="admin-product-head">
        <div>
          <p className="eyebrow">Posts</p>
          <h1>{isEdit ? "글 수정" : "새 글"}</h1>
        </div>
        <Link href="/loginpage/posts" className="action-button secondary-button">글 목록</Link>
      </div>

      {copied ? <p className="success-text">복사본을 비공개 초안으로 만들었습니다. 주소와 제목을 확인한 뒤 발행하세요.</p> : null}
      {error === "required" ? <p className="warning-text">제목과 본문은 필수입니다.</p> : null}
      {error === "password" ? <p className="warning-text">비밀번호 보호 글에는 비밀번호가 필요합니다.</p> : null}
      {error === "save" ? <p className="warning-text">저장하지 못했습니다. 경로 중복이나 데이터베이스 연결을 확인해 주세요.</p> : null}

      <form action={savePostAction} className="admin-form-grid">
        {post ? <input type="hidden" name="id" value={post.id} /> : null}
        <input type="hidden" name="publicationStatus" value={post?.publicationStatus ?? "draft"} />
        <input type="hidden" name="returnTo" value={post ? `/loginpage/posts/edit/${post.id}` : "/loginpage/posts/new"} />

        <label className="field field-wide">
          <span>제목</span>
          <input name="title" defaultValue={post?.title} required />
        </label>

        <div className="admin-post-fields-grid field-wide">
          <label className="field">
            <span>슬러그</span>
            <input name="slug" defaultValue={post?.slug} placeholder="비우면 제목에서 자동 생성" />
          </label>
          <label className="field">
            <span>발행일시</span>
            <input type="datetime-local" name="publishedAt" defaultValue={toDateTimeLocal(post?.publishedAt ?? new Date().toISOString())} />
            <small>미래 시각으로 발행하면 그 시각 전까지 공개되지 않습니다.</small>
          </label>
        </div>

        <label className="field field-wide">
          <span>직접 경로</span>
          <input name="path" defaultValue={post?.path} placeholder="/2026/07/sample-post" />
          <small>주소를 바꾸면 기존 주소는 자동 리다이렉트되지 않으므로 발행 전 확정하는 편이 안전합니다.</small>
        </label>

        <section className="admin-publishing-box field-wide" aria-labelledby="publishing-heading">
          <div>
            <h2 id="publishing-heading">공개·접근 정책</h2>
            <p>발행 여부, 주소 접근, 목록/검색 노출, 검색엔진 색인을 서로 독립적으로 설정합니다.</p>
          </div>
          <label className="field">
            <span>주소 접근 방식</span>
            <select name="visibility" defaultValue={post?.visibility ?? "public"}>
              <option value="public">공개 — 누구나 접근</option>
              <option value="hidden">링크 전용 — 목록에는 기본 비노출</option>
              <option value="password">비밀번호 — 암호 입력 후 접근</option>
              <option value="private">완전 비공개 — URL을 알아도 접근 불가</option>
            </select>
          </label>
          <label className="field">
            <span>글 비밀번호</span>
            <input name="accessPassword" type="password" defaultValue={post?.accessPassword ?? ""} autoComplete="new-password" placeholder="비밀번호 보호 선택 시 필수" />
          </label>
          <div className="admin-post-surface-options">
            <label className="admin-checkbox">
              <input type="checkbox" name="listedInArchive" defaultChecked={post?.listedInArchive ?? true} />
              <span>홈·글 목록에 표시</span>
            </label>
            <label className="admin-checkbox">
              <input type="checkbox" name="listedInSearch" defaultChecked={post?.listedInSearch ?? true} />
              <span>사이트 검색 결과에 표시</span>
            </label>
            <label className="admin-checkbox">
              <input type="checkbox" name="allowIndexing" defaultChecked={post?.allowIndexing ?? true} />
              <span>검색엔진 색인 허용</span>
            </label>
          </div>
          <p className="inline-note">
            검색에만 보이게 하려면 <strong>링크 전용</strong> + <strong>홈·글 목록 끄기</strong> + <strong>사이트 검색 켜기</strong>를 선택하세요.
            완전 차단은 <strong>완전 비공개</strong> 또는 <strong>초안 저장</strong>을 사용합니다.
          </p>
        </section>

        <AdminHtmlEditor
          label="요약"
          name="excerptHtml"
          initialHtml={post?.excerptHtml}
          minHeight={150}
          draftStorageKey={`${draftKey}-excerpt`}
          description="목록과 검색 결과의 짧은 소개입니다. 비우면 본문에서 자동 생성됩니다."
        />
        <AdminHtmlEditor
          label="본문"
          name="contentHtml"
          initialHtml={post?.contentHtml}
          minHeight={420}
          required
          draftStorageKey={`${draftKey}-content`}
        />

        <div className="admin-publish-actions field-wide">
          <button type="submit" name="intent" value="draft" className="action-button secondary-button">초안 저장</button>
          <button type="submit" name="intent" value="publish" className="action-button">발행 또는 업데이트</button>
          {post ? <span className="inline-note">최근 저장: {new Date(post.updatedAt).toLocaleString("ko-KR")}</span> : null}
        </div>
      </form>
    </section>
  );
}
