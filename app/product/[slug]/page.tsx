import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductStatusBadges } from "@/components/product-status-badges";
import { ProductPurchaseActions } from "@/components/storefront-client";
import { RichHtml } from "@/components/rich-html";
import { getProductBySlug, getProductCommonIntroHtml } from "@/lib/site-data";

export const revalidate = 60;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug, { includeHidden: true });
  if (!product) {
    return {};
  }

  return {
    title: product.title,
    description: product.excerpt || product.title,
    alternates: {
      canonical: `/product/${product.slug}`
    },
    openGraph: {
      title: product.title,
      description: product.excerpt || product.title,
      url: `/product/${product.slug}`,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
      type: "article"
    }
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, productCommonIntroHtml] = await Promise.all([
    getProductBySlug(slug, { includeHidden: true }),
    getProductCommonIntroHtml()
  ]);

  if (!product) {
    notFound();
  }

  const purchaseProduct = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    excerpt: product.excerpt,
    priceText: product.priceText,
    priceValue: product.priceValue,
    imageUrl: product.imageUrl,
    reviewCount: product.reviewCount,
    stockState: product.stockState
  };

  return (
    <main className="page-shell product-page">
      <article className="product-hero">
        {product.imageUrl ? (
          <div className="product-gallery">
            <div className="product-gallery-frame">
              <Image src={product.imageUrl} alt={product.title} className="product-image" width={960} height={1180} />
            </div>
          </div>
        ) : null}

        <div className="product-buybox">
          <p className="eyebrow">Product</p>
          <ProductStatusBadges
            stockState={product.stockState}
            regularPriceValue={product.regularPriceValue}
            salePriceValue={product.salePriceValue}
          />
          <h1>{product.title}</h1>
          <div className="star-row">
            <span aria-hidden="true">★★★★★</span>
            <span>{product.ratingValue ? `평점 ${product.ratingValue}` : "평점 미확인"}</span>
          </div>
          <p className="product-price-hero">
            {product.salePriceValue !== null && product.regularPriceValue && product.salePriceValue < product.regularPriceValue ? (
              <>
                <span className="catalog-price-strike">₩{new Intl.NumberFormat("ko-KR").format(product.regularPriceValue)}</span>{" "}
                {product.priceText ?? "가격 미확인"}
              </>
            ) : (
              product.priceText ?? "가격 미확인"
            )}
          </p>
          <RichHtml className="rich-text product-lede-html" html={product.excerptHtml} />
          <div className="signal-list">
            {product.publicSignals.hasRefundText ? <span>환불정책</span> : null}
            {product.publicSignals.hasGmailDeliveryText ? <span>지메일 전달</span> : null}
          </div>
          <ProductPurchaseActions product={purchaseProduct} />
        </div>
      </article>

      <article className="article-shell article-shell-polished">
        {productCommonIntroHtml ? <RichHtml className="rich-text article-body" html={productCommonIntroHtml} /> : null}
        <RichHtml className="rich-text article-body" html={product.contentHtml} />
      </article>
    </main>
  );
}
