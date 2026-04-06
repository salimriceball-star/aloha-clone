import { CommentNode } from "@/lib/site-data";
import { RichHtml } from "@/components/rich-html";

type CommentThreadProps = {
  comments: CommentNode[];
};

export function CommentThread({ comments }: CommentThreadProps) {
  if (!comments.length) {
    return <p className="empty-state">댓글이 없습니다.</p>;
  }

  return (
    <ol className="thread">
      {comments.map((comment) => (
        <li key={comment.id} className="thread-item" id={`comment-${comment.id}`}>
          <article className="comment-card">
            <div className="comment-meta">
              <strong>{comment.authorName}</strong>
              <span>{new Date(comment.date).toLocaleDateString("ko-KR")}</span>
            </div>
            <RichHtml className="rich-text comment-body" html={comment.contentHtml} />
          </article>
          {comment.children.length > 0 ? <CommentThread comments={comment.children} /> : null}
        </li>
      ))}
    </ol>
  );
}
