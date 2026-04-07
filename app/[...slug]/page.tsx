import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { ProtectedPostGate } from "@/components/protected-post-gate";
import { RichHtml } from "@/components/rich-html";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPageByPath, getPostByPath, getPostComments } from "@/lib/site-data";

export const revalidate = 60;

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
    <section className="panel account-panel">
      <h2>내 계정</h2>
      <p className="account-form-copy">주문이나 예약을 원하시면 고객센터(아래)로 연락주세요.</p>
      <p className="account-form-copy">
        <a href="https://open.kakao.com/me/npn1212/chat" target="_blank" rel="noreferrer">
          고객센터 바로가기
        </a>
      </p>
    </section>
  );
}

function LostPasswordPage() {
  return (
    <section className="panel account-panel">
      <h2>비밀번호 재설정</h2>
      <p className="account-form-copy">웹 로그인 기능을 운영하지 않아 비밀번호 재설정도 제공하지 않습니다.</p>
      <Link className="action-button" href="/my-account">
        내 계정으로 돌아가기
      </Link>
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
