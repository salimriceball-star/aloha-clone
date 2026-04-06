import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { CartNavLink } from "@/components/storefront-client";
import { getSiteMeta } from "@/lib/site-data";

export async function generateMetadata(): Promise<Metadata> {
  const siteMeta = await getSiteMeta();
  const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? siteMeta.home);
  return {
    metadataBase,
    title: siteMeta.name,
    description: siteMeta.description || `${siteMeta.name}의 글과 상품을 한곳에서 볼 수 있는 사이트`,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      title: siteMeta.name,
      description: siteMeta.description || `${siteMeta.name}의 글과 상품을 한곳에서 볼 수 있는 사이트`,
      url: "/",
      siteName: siteMeta.name,
      images: siteMeta.site_icon_url ? [{ url: siteMeta.site_icon_url }] : undefined,
      locale: "ko_KR",
      type: "website"
    }
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteMeta = await getSiteMeta();

  return (
    <html lang="ko">
      <body>
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
                <Link href="/my-account">내 계정</Link>
                <CartNavLink />
              </nav>
            </div>
          </header>
          <div className="site-main">{children}</div>
          <footer className="site-footer">
            <div className="site-footer-inner">Copyright © 2026. {siteMeta.name} all rights reserved.</div>
          </footer>
        </div>
      </body>
    </html>
  );
}
