import Image from "next/image";
import Link from "next/link";

import { ProductPriceContent } from "@/components/product-price-content";
import { ProductPurchaseActions } from "@/components/storefront-client";
import { ProductStatusBadges } from "@/components/product-status-badges";
import type { ProductEntry } from "@/lib/site-data";

type ShopCatalogProps = {
  products: ProductEntry[];
};

export function ShopCatalog({ products }: ShopCatalogProps) {
  return (
    <section className="shop-list">
      {products.map((product) => (
        <article key={product.id} className="shop-card">
          <Link href={`/product/${product.slug}`} className="shop-card-media">
            <span className="shop-card-badges">
              <ProductStatusBadges
                stockState={product.stockState}
                regularPriceValue={product.regularPriceValue}
                salePriceValue={product.salePriceValue}
              />
            </span>
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.title}
                width={420}
                height={520}
                sizes="(max-width: 560px) calc(100vw - 24px), (max-width: 980px) 50vw, 33vw"
              />
            ) : (
              <span className="shop-card-placeholder" aria-hidden="true" />
            )}
          </Link>

          <div className="shop-card-body">
            <div className="shop-card-head">
              <h2>
                <Link href={`/product/${product.slug}`}>{product.title}</Link>
              </h2>
            </div>
            <p className="catalog-price">
              <ProductPriceContent
                priceText={product.priceText}
                priceValue={product.priceValue}
                regularPriceValue={product.regularPriceValue}
                salePriceValue={product.salePriceValue}
              />
            </p>
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
          </div>
        </article>
      ))}
    </section>
  );
}
