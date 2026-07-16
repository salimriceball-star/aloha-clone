import { PaginationNav } from "@/components/pagination-nav";
import { PostArchiveFeed } from "@/components/post-archive-feed";
import { RichHtml } from "@/components/rich-html";
import { getPageByPath, getPosts } from "@/lib/site-data";

export const revalidate = 60;

const homePostsPerPage = 10;

export default async function HomePage() {
  const [posts, homePage] = await Promise.all([getPosts(), getPageByPath("/")]);
  const totalPages = Math.max(1, Math.ceil(posts.length / homePostsPerPage));

  return (
    <main className="page-shell">
      <section className="home-archive-head">
        <h1>{homePage?.title ?? "글 목록"}</h1>
        {homePage?.contentHtml ? <RichHtml className="rich-text" html={homePage.contentHtml} /> : null}
      </section>
      <PostArchiveFeed posts={posts.slice(0, homePostsPerPage)} />
      <PaginationNav currentPage={1} totalPages={totalPages} basePath="/" />
    </main>
  );
}
