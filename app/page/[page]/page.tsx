import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PaginationNav } from "@/components/pagination-nav";
import { PostArchiveFeed } from "@/components/post-archive-feed";
import { getPosts } from "@/lib/site-data";

export const revalidate = 60;

const homePostsPerPage = 10;

export async function generateStaticParams() {
  const posts = await getPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / homePostsPerPage));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `글 목록 ${page}페이지`,
    alternates: {
      canonical: `/page/${page}`
    }
  };
}

export default async function HomeArchivePage({
  params
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect("/");
  }

  const posts = await getPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / homePostsPerPage));
  if (pageNumber > totalPages) {
    notFound();
  }

  const start = (pageNumber - 1) * homePostsPerPage;
  const end = start + homePostsPerPage;

  return (
    <main className="page-shell">
      <section className="home-archive-head">
        <h1>글 목록</h1>
      </section>
      <PostArchiveFeed posts={posts.slice(start, end)} />
      <PaginationNav currentPage={pageNumber} totalPages={totalPages} basePath="/" />
    </main>
  );
}
