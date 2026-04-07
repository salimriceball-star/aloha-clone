import Image from "next/image";
import Link from "next/link";

import type { PostEntry } from "@/lib/site-data";

type PostArchiveFeedProps = {
  posts: PostEntry[];
};

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}…` : value;
}

export function PostArchiveFeed({ posts }: PostArchiveFeedProps) {
  return (
    <section className="archive-feed">
      {posts.map((post) => (
        <article key={post.id} className="feed-card archive-card">
          {post.coverImageUrl ? (
            <Link href={post.legacyPath} className="feed-card-media">
              <Image src={post.coverImageUrl} alt={post.title} width={720} height={420} />
            </Link>
          ) : null}
          <div className="feed-card-body">
            <div className="feed-card-meta">
              <span>{post.categoryNames.join(" · ") || "글"}</span>
              <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
              <span>댓글 {post.commentCount}</span>
            </div>
            <h2>
              <Link href={post.legacyPath}>{post.title}</Link>
            </h2>
            <p>{clampText(post.excerpt, 180)}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
