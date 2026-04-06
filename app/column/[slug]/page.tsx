import Image from "next/image";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { RichHtml } from "@/components/rich-html";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPostBySlug, getPostComments, getPosts } from "@/lib/site-data";

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function ColumnDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const comments = await getPostComments(post.id);
  const coverImageUrl =
    post.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;

  return (
    <main className="shell">
      <article className="article-shell article-shell-polished">
        <header className="article-header">
          <p className="meta-line">{post.categoryNames.join(" · ") || "글"}</p>
          <h1>{post.title}</h1>
          <div className="article-meta">
            <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
            <span>댓글 {post.commentCount}</span>
          </div>
        </header>

        {coverImageUrl ? (
          <div className="article-cover">
            <Image src={coverImageUrl} alt={post.title} width={1200} height={720} />
          </div>
        ) : null}

        <RichHtml className="rich-text article-body" html={post.contentHtml} />
      </article>

      <section className="discussion-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Comments</p>
            <h2>댓글</h2>
          </div>
        </div>
        <CommentThread comments={comments} />
      </section>
    </main>
  );
}
