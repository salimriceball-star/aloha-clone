import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { CartNavLink } from "@/components/storefront-client";
import { StructuredData } from "@/components/structured-data";
import { getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  const metadataBase = getSiteUrl(siteMeta.home);
  const description = siteMeta.description || `${siteMeta.name}의 글과 상품을 한곳에서 볼 수 있는 사이트`;
  return {
    metadataBase,
    title: {
      default: siteMeta.name,
      template: `%s | ${siteMeta.name}`
    },
    description,
    alternates: {
      canonical: "/",
      types: {
        "application/rss+xml": "/feed.xml"
      }
    },
    openGraph: {
      title: siteMeta.name,
      description,
      url: "/",
      siteName: siteMeta.name,
      images: siteMeta.site_icon_url ? [{ url: siteMeta.site_icon_url }] : undefined,
      locale: "ko_KR",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: siteMeta.name,
      description,
      images: siteMeta.site_icon_url ? [siteMeta.site_icon_url] : undefined
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
    formatDetection: {
      email: false,
      address: false,
      telephone: false
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteMeta = await getSiteMeta();
  const siteUrl = getSiteUrl(siteMeta.home);
  const logoUrl = new URL(siteMeta.site_icon_url || "/icon.png", siteUrl).toString();

  return (
    <html lang="ko">
      <body>
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": new URL("/#organization", siteUrl).toString(),
            name: siteMeta.name,
            url: siteUrl.toString(),
            logo: logoUrl
          }}
        />
        <div className="site-frame">
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="brand">
                <Image
                  src={siteMeta.site_icon_url || "/site-logo.png"}
                  alt=""
                  aria-hidden="true"
                  width={38}
                  height={35}
                  className="brand-logo-image"
                />
                <span>{siteMeta.name}</span>
              </Link>
              <nav className="site-nav">
                <Link href="/">자주 묻는 질문</Link>
                <Link href="/shop">상점</Link>
                <CartNavLink />
                <form action="/search" className="site-search-form">
                  <label className="sr-only" htmlFor="site-search-query">글 검색</label>
                  <input id="site-search-query" name="q" type="search" placeholder="글 검색" />
                  <button type="submit">검색</button>
                </form>
              </nav>
            </div>
          </header>
          <div className="site-main">{children}</div>
          <footer className="site-footer">
            <div className="site-footer-inner">
              <div className="footer-legal-block">
                <p>
                  상호명: 마케티드 | 대표: 안누리 | 사업자등록번호: 283-74-00474
                  <br />
                  주소: 전북특별자치도 전주시 완산구 문학대5길 6 202
                  <br />
                  <a href="https://open.kakao.com/me/npn1212/chat" target="_blank" rel="noreferrer">
                    고객센터 (카카오톡 문의)
                  </a>{" "}
                  | 통신판매업신고번호: 제2025-전주완산-0574호
                </p>
                <p className="footer-policy-links">
                  <Link href="/terms">이용약관</Link> | <Link href="/privacy">개인정보처리방침</Link>
                </p>
                <p className="footer-copy footer-copy-muted">Copyright © 2025 마케티드. All Rights Reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
