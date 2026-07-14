import Image from "next/image";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductPriceContent } from "@/components/product-price-content";
import { ProductStatusBadges } from "@/components/product-status-badges";
import { StructuredData } from "@/components/structured-data";
import { ProductPurchaseActions } from "@/components/storefront-client";
import { RichHtml } from "@/components/rich-html";
import { getProductBySlug, getProductCommonIntroHtml, getSiteMeta } from "@/lib/site-data";
import { getSiteUrl } from "@/lib/site-url";

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
    },
    robots: {
      index: product.visibility === "public",
      follow: product.visibility === "public",
      noarchive: product.visibility !== "public"
    }
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, productCommonIntroHtml, siteMeta] = await Promise.all([
    getProductBySlug(slug, { includeHidden: true }),
    getProductCommonIntroHtml(),
    getSiteMeta()
  ]);

  if (!product) {
    notFound();
  }
  if (slug !== product.slug) {
    permanentRedirect(`/product/${encodeURIComponent(product.slug)}`);
  }
  const siteUrl = getSiteUrl(siteMeta.home);
  const productUrl = new URL(`/product/${encodeURIComponent(product.slug)}`, siteUrl).toString();
  const availability = {
    available: "https://schema.org/InStock",
    reserved: "https://schema.org/PreOrder",
    soldout: "https://schema.org/OutOfStock"
  }[product.stockState];
  const offer = product.priceValue !== null
    ? {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "KRW",
        price: product.priceValue,
        availability,
        itemCondition: "https://schema.org/NewCondition"
      }
    : undefined;

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
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${productUrl}#product`,
          name: product.title,
          description: product.excerpt || product.description || product.title,
          image: product.imageUrl ? [product.imageUrl] : undefined,
          sku: product.slug,
          brand: {
            "@type": "Brand",
            name: siteMeta.name
          },
          offers: offer
        }}
      />
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
            <ProductPriceContent
              priceText={product.priceText}
              priceValue={product.priceValue}
              regularPriceValue={product.regularPriceValue}
              salePriceValue={product.salePriceValue}
            />
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
