import Image from "next/image";
import Link from "next/link";

import { getHomeSnapshot, getSiteMeta } from "@/lib/site-data";

export const revalidate = 60;

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}…` : value;
}

function formatCommentDate(value: string) {
  const parsed = new Date(value);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}년 ${month}월 ${day}일, ${hour}:${minute}`;
}

export default async function HomePage() {
  const [siteMeta, { manifest, latestComments, posts, products }] = await Promise.all([getSiteMeta(), getHomeSnapshot()]);
  const featurePosts = posts.slice(0, 7);
  const featuredProducts = products.slice(0, 4);
  const sidebarPosts = posts.slice(0, 6);
  const showComments = latestComments.length > 0;

  return (
    <main className="page-shell home-page">
      <section className="editorial-grid">
        <aside className="editorial-sidebar">
          <p className="section-number">01</p>
          <p className="eyebrow">{showComments ? "최신 댓글" : "최신 글"}</p>
          <h1 className="editorial-title">{siteMeta.name}</h1>
          <div className="stats-inline">
            <span>글 {manifest.counts.posts}</span>
            <span>상품 {manifest.counts.products}</span>
            <span>댓글 {manifest.counts.comments}</span>
          </div>
          <ul className="sidebar-post-list">
            {showComments
              ? latestComments.map((comment) => (
                  <li key={comment.id} className="sidebar-post-item">
                    <p className="sidebar-comment-copy">
                      <strong>{comment.authorName}</strong>님의 댓글:
                      {" “"}
                      <Link href={comment.commentPath} className="sidebar-comment-link">
                        {clampText(comment.excerpt, 42)}
                      </Link>
                      {"”"}
                    </p>
                    <Link href={comment.commentPath} className="sidebar-post-link">
                      {comment.postTitle}
                    </Link>
                    <span>{formatCommentDate(comment.date)}</span>
                  </li>
                ))
              : sidebarPosts.map((post) => (
                  <li key={post.id} className="sidebar-post-item">
                    <Link href={post.legacyPath} className="sidebar-post-link">
                      {post.title}
                    </Link>
                    <p className="sidebar-comment-copy">{clampText(post.excerpt, 66)}</p>
                    <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
                  </li>
                ))}
          </ul>
          <Link href="/column" className="text-link">
            글 목록 보기
          </Link>
        </aside>

        <div className="editorial-feed">
          {featurePosts.map((post, index) => (
            <article key={post.id} className={`feed-card${index === 0 ? " featured" : ""}`}>
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
                <p>{clampText(post.excerpt, index === 0 ? 180 : 132)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalog-preview">
        <div className="section-head section-head-tight">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2>최근 상품</h2>
          </div>
          <Link href="/shop" className="text-link">
            상점 보기
          </Link>
        </div>
        <div className="catalog-grid">
          {featuredProducts.map((product) => (
            <article key={product.id} className="catalog-card">
              {product.imageUrl ? (
                <Link href={`/product/${product.slug}`} className="catalog-art">
                  <Image src={product.imageUrl} alt={product.title} width={420} height={520} />
                </Link>
              ) : null}
              <div className="star-row" aria-hidden="true">
                ★★★★★
              </div>
              <h3>
                <Link href={`/product/${product.slug}`}>{product.title}</Link>
              </h3>
              <p className="catalog-price">{product.priceText ?? "가격 확인 필요"}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
