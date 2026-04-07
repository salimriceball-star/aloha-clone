import Image from "next/image";
import Link from "next/link";

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
          {product.imageUrl ? (
            <Link href={`/product/${product.slug}`} className="shop-card-media">
              <span className="shop-card-badges">
                <ProductStatusBadges
                  stockState={product.stockState}
                  regularPriceValue={product.regularPriceValue}
                  salePriceValue={product.salePriceValue}
                />
              </span>
              <Image src={product.imageUrl} alt={product.title} width={420} height={520} />
            </Link>
          ) : null}

          <div className="shop-card-body">
            <div className="shop-card-head">
              <div className="shop-card-status">
                <ProductStatusBadges
                  stockState={product.stockState}
                  regularPriceValue={product.regularPriceValue}
                  salePriceValue={product.salePriceValue}
                />
              </div>
              <h2>
                <Link href={`/product/${product.slug}`}>{product.title}</Link>
              </h2>
            </div>
            <p className="catalog-price">
              {product.salePriceValue !== null && product.regularPriceValue && product.salePriceValue < product.regularPriceValue ? (
                <>
                  <span className="catalog-price-strike">₩{new Intl.NumberFormat("ko-KR").format(product.regularPriceValue)}</span>{" "}
                  {product.priceText ?? "가격 확인 필요"}
                </>
              ) : (
                product.priceText ?? "가격 확인 필요"
              )}
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
