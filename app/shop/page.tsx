import Image from "next/image";
import Link from "next/link";

import { ProductPurchaseActions } from "@/components/storefront-client";
import { getProducts } from "@/lib/site-data";

export const revalidate = 60;

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Marketplace</p>
          <h1>상점</h1>
        </div>
      </section>

      <section className="catalog-grid">
        {products.map((product) => (
          <article key={product.id} className="catalog-card catalog-card-strong">
            {product.imageUrl ? (
              <Link href={`/product/${product.slug}`} className="catalog-art">
                <Image src={product.imageUrl} alt={product.title} width={420} height={520} />
              </Link>
            ) : null}
            <div className="star-row" aria-hidden="true">
              ★★★★★
            </div>
            <h2>
              <Link href={`/product/${product.slug}`}>{product.title}</Link>
            </h2>
            <p className="catalog-price">{product.priceText ?? "가격 확인 필요"}</p>
            <ProductPurchaseActions
              compact
              product={{
                id: product.id,
                slug: product.slug,
                title: product.title,
                excerpt: product.excerpt,
                priceText: product.priceText,
                priceValue: product.priceValue,
                imageUrl: product.imageUrl,
                reviewCount: product.reviewCount,
                stockState: product.stockState
              }}
            />
          </article>
        ))}
      </section>
    </main>
  );
}
