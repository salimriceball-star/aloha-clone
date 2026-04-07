import { PaginationNav } from "@/components/pagination-nav";
import { ShopCatalog } from "@/components/shop-catalog";
import { getProducts, getShopPageCount } from "@/lib/site-data";

export const revalidate = 60;

const shopPageSize = 16;

export default async function ShopPage() {
  const [products, totalPages] = await Promise.all([getProducts(), getShopPageCount(shopPageSize)]);

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Marketplace</p>
          <h1>상점</h1>
        </div>
      </section>

      <ShopCatalog products={products.slice(0, shopPageSize)} />
      <PaginationNav currentPage={1} totalPages={totalPages} basePath="/shop" />
    </main>
  );
}
