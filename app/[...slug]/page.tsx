import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { CommentThread } from "@/components/comment-thread";
import { PrivateContentNotice } from "@/components/private-content-notice";
import { ProtectedPostGate } from "@/components/protected-post-gate";
import { RichHtml } from "@/components/rich-html";
import { StructuredData } from "@/components/structured-data";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import { getPageByPath, getPostByPath, getPostComments, getProductAliasTarget, getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 60;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (path === "/my-account" || path.startsWith("/my-account/")) {
    return {
      title: path.endsWith("lost-password") ? "비밀번호 재설정" : "내 계정",
      robots: { index: false, follow: false, noarchive: true }
    };
  }
  const post = await getPostByPath(path, { includePrivate: true });
  if (post?.visibility === "private") {
    return {
      title: "비공개 글",
      description: "비공개로 설정된 글입니다.",
      robots: { index: false, follow: false, noarchive: true }
    };
  }
  if (post) {
    const canIndex = post.visibility === "public" && post.allowIndexing;
    const isPasswordProtected = post.visibility === "password";
    return {
      title: isPasswordProtected ? `보호된 글: ${post.title}` : post.title,
      description: isPasswordProtected ? "비밀번호로 보호된 글입니다." : post.excerpt || post.title,
      alternates: {
        canonical: post.legacyPath
      },
      openGraph: {
        title: isPasswordProtected ? `보호된 글: ${post.title}` : post.title,
        description: isPasswordProtected ? "비밀번호로 보호된 글입니다." : post.excerpt || post.title,
        url: post.legacyPath,
        images: !isPasswordProtected && post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.updatedAt
      },
      robots: {
        index: canIndex,
        follow: canIndex,
        noarchive: !canIndex
      }
    };
  }

  const page = await getPageByPath(path, { includePrivate: true });
  if (page?.visibility === "private") {
    return {
      title: "비공개 페이지",
      description: "비공개로 설정된 페이지입니다.",
      robots: { index: false, follow: false, noarchive: true }
    };
  }
  if (page) {
    const canIndex = page.visibility === "public" && page.allowIndexing;
    const isPasswordProtected = page.visibility === "password";
    return {
      title: isPasswordProtected ? `보호된 페이지: ${page.title}` : page.title,
      description: isPasswordProtected ? "비밀번호로 보호된 페이지입니다." : undefined,
      alternates: {
        canonical: page.legacyPath
      },
      openGraph: {
        title: isPasswordProtected ? `보호된 페이지: ${page.title}` : page.title,
        url: page.legacyPath,
        type: "article"
      },
      robots: {
        index: canIndex,
        follow: canIndex,
        noarchive: !canIndex
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

  const post = await getPostByPath(path, { includePrivate: true });
  if (post?.visibility === "private") {
    return <PrivateContentNotice kind="post" />;
  }
  if (post) {
    const comments = await getPostComments(post.id);

    if (post.visibility === "password") {
      return (
        <main className="shell">
          <ProtectedPostGate post={{
            id: post.id,
            path,
            title: post.title,
            date: post.date,
            categoryNames: post.categoryNames
          }} />
        </main>
      );
    }

    const siteMeta = await getSiteMeta();
    const siteUrl = getSiteUrl(siteMeta.home);
    const postUrl = new URL(post.legacyPath, siteUrl).toString();

    const coverImageUrl =
      post.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;

    return (
      <main className="shell">
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${postUrl}#article`,
            headline: post.title,
            description: post.excerpt || post.title,
            datePublished: post.date,
            dateModified: post.updatedAt,
            mainEntityOfPage: postUrl,
            image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
            author: {
              "@type": "Organization",
              name: siteMeta.name,
              url: siteUrl.toString()
            },
            publisher: {
              "@type": "Organization",
              name: siteMeta.name,
              url: siteUrl.toString(),
              logo: siteMeta.site_icon_url
                ? { "@type": "ImageObject", url: new URL(siteMeta.site_icon_url, siteUrl).toString() }
                : undefined
            }
          }}
        />
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

  const page = await getPageByPath(path, { includePrivate: true });
  if (page?.visibility === "private") {
    return <PrivateContentNotice kind="page" />;
  }
  if (!page && slug.length === 1) {
    const productSlug = await getProductAliasTarget(slug[0]);
    if (productSlug) {
      permanentRedirect(`/product/${productSlug}`);
    }
  }
  if (!page) {
    notFound();
  }

  if (page.visibility === "password") {
    return (
      <main className="shell">
        <ProtectedPostGate post={{
          id: page.id,
          path,
          title: page.title,
          date: page.date,
          categoryNames: ["페이지"]
        }} />
      </main>
    );
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
