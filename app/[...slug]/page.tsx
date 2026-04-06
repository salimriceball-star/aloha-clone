import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { ProtectedPostGate } from "@/components/protected-post-gate";
import { RichHtml } from "@/components/rich-html";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPageByPath, getPages, getPostByPath, getPostComments, getPosts, getProtectedPosts } from "@/lib/site-data";

const reservedPageSlugs = new Set(["cart", "checkout", "shop"]);

export const revalidate = 60;

export async function generateStaticParams() {
  const [posts, protectedPosts, pages] = await Promise.all([getPosts(), getProtectedPosts(), getPages()]);

  return [
    ...posts.map((post) => ({ slug: post.pathSegments })),
    ...protectedPosts.map((post) => ({ slug: post.pathSegments })),
    ...pages
      .filter((page) => !reservedPageSlugs.has(page.slug))
      .map((page) => ({ slug: page.pathSegments }))
  ];
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const post = await getPostByPath(path);
  if (post) {
    return {
      title: post.title,
      description: post.excerpt || post.title,
      alternates: {
        canonical: post.legacyPath
      },
      openGraph: {
        title: post.title,
        description: post.excerpt || post.title,
        url: post.legacyPath,
        images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
        type: "article"
      }
    };
  }

  const page = await getPageByPath(path);
  if (page) {
    return {
      title: page.title,
      alternates: {
        canonical: page.legacyPath
      },
      openGraph: {
        title: page.title,
        url: page.legacyPath,
        type: "article"
      }
    };
  }

  return {};
}

function AccountPage() {
  return (
    <section className="account-auth-grid">
      <section className="panel account-panel">
        <h2>로그인</h2>
        <form className="account-form">
          <label className="account-form-row">
            <span>사용자명 또는 이메일 주소 *</span>
            <input type="text" autoComplete="username" />
          </label>
          <label className="account-form-row">
            <span>비밀번호 *</span>
            <input type="password" autoComplete="current-password" />
          </label>
          <div className="account-form-actions">
            <label className="account-form-check">
              <input type="checkbox" />
              <span>기억하기</span>
            </label>
            <button type="button" className="action-button">
              로그인
            </button>
          </div>
          <Link className="text-link account-inline-link" href="/my-account/lost-password/">
            비밀번호를 잊으셨나요?
          </Link>
        </form>
      </section>

      <section className="panel account-panel">
        <h2>회원가입하기</h2>
        <form className="account-form">
          <label className="account-form-row">
            <span>이메일 주소 *</span>
            <input type="email" autoComplete="email" />
          </label>
          <p className="account-form-copy">새 비밀번호를 설정하는 링크가 회원님의 이메일 주소로 전송됩니다.</p>
          <p className="account-form-copy">
            개인 데이터는 사이트 이용 지원, 계정 관리, 안내 문서에 명시된 목적을 위해 사용됩니다.
          </p>
          <button type="button" className="action-button">
            회원가입하기
          </button>
        </form>
      </section>
    </section>
  );
}

function LostPasswordPage() {
  return (
    <section className="panel account-panel">
      <h2>비밀번호 재설정</h2>
      <form className="account-form">
        <label className="account-form-row">
          <span>사용자명 또는 이메일 주소 *</span>
          <input type="text" autoComplete="username" />
        </label>
        <p className="account-form-copy">가입 시 사용한 이메일 주소로 비밀번호 재설정 링크가 전송됩니다.</p>
        <button type="button" className="action-button">
          재설정 링크 받기
        </button>
      </form>
    </section>
  );
}

export default async function CatchAllPage({
  params
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;

  if (path === "/my-account/lost-password") {
    return (
      <main className="shell">
        <article className="article-shell">
          <header className="article-header">
            <h1>비밀번호 재설정</h1>
          </header>
          <LostPasswordPage />
        </article>
      </main>
    );
  }

  const post = await getPostByPath(path);
  if (post) {
    const comments = await getPostComments(post.id);

    if (post.visibility === "password") {
      return (
        <main className="shell">
          <ProtectedPostGate post={post} />
        </main>
      );
    }

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

  const page = await getPageByPath(path);
  if (!page) {
    notFound();
  }

  return (
    <main className="shell">
      <article className="article-shell">
        <header className="article-header">
          <h1>{page.title}</h1>
          <div className="article-meta">
            <span>{new Date(page.date).toLocaleDateString("ko-KR")}</span>
          </div>
        </header>

        {page.slug === "my-account" ? <AccountPage /> : <RichHtml className="rich-text article-body" html={page.contentHtml} />}
      </article>
    </main>
  );
}
