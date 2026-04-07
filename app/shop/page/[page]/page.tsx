import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PaginationNav } from "@/components/pagination-nav";
import { ShopCatalog } from "@/components/shop-catalog";
import { getProducts, getShopPageCount } from "@/lib/site-data";

export const revalidate = 60;

const shopPageSize = 16;

export async function generateStaticParams() {
  const totalPages = await getShopPageCount(shopPageSize);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `상점 ${page}페이지`,
    alternates: {
      canonical: `/shop/page/${page}`
    }
  };
}

export default async function ShopPaginationPage({
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
    redirect("/shop");
  }

  const [products, totalPages] = await Promise.all([getProducts(), getShopPageCount(shopPageSize)]);
  if (pageNumber > totalPages) {
    notFound();
  }

  const start = (pageNumber - 1) * shopPageSize;
  const end = start + shopPageSize;

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Marketplace</p>
          <h1>상점</h1>
        </div>
      </section>

      <ShopCatalog products={products.slice(start, end)} />
      <PaginationNav currentPage={pageNumber} totalPages={totalPages} basePath="/shop" />
    </main>
  );
}
