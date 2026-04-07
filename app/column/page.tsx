import { PostArchiveFeed } from "@/components/post-archive-feed";
import { getPosts } from "@/lib/site-data";

export const revalidate = 60;

export default async function ColumnIndexPage() {
  const posts = await getPosts();

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Archive</p>
          <h1>글 목록</h1>
        </div>
      </section>

      <PostArchiveFeed posts={posts} />
    </main>
  );
}
