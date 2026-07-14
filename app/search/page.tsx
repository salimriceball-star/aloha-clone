import type { Metadata } from "next";

import { PostArchiveFeed } from "@/components/post-archive-feed";
import { searchPosts } from "@/lib/site-data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "글 검색",
  robots: {
    index: false,
    follow: false
  }
};

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const posts = query ? await searchPosts(query) : [];

  return (
    <main className="page-shell">
      <section className="home-archive-head search-page-head">
        <h1>글 검색</h1>
        <form action="/search" className="content-search-form">
          <label className="sr-only" htmlFor="content-search-query">검색어</label>
          <input id="content-search-query" name="q" type="search" defaultValue={query} placeholder="제목과 본문 검색" autoFocus />
          <button type="submit" className="action-button">검색</button>
        </form>
        {query ? <p className="inline-note">“{query}” 검색 결과 {posts.length}건</p> : <p className="inline-note">검색어를 입력해 주세요.</p>}
      </section>
      {posts.length > 0 ? <PostArchiveFeed posts={posts} /> : query ? <p className="empty-state">일치하는 글이 없습니다.</p> : null}
    </main>
  );
}
