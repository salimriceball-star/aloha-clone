import { CheckoutPageClient } from "@/components/storefront-client";
import { getProducts } from "@/lib/site-data";

export const revalidate = 60;

export default async function CheckoutPage() {
  const products = await getProducts({ includeHidden: true });
  const catalog = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    excerpt: product.excerpt,
    priceText: product.priceText,
    priceValue: product.priceValue,
    imageUrl: product.imageUrl,
    reviewCount: product.reviewCount,
    stockState: product.stockState
  }));

  return (
    <main className="page-shell">
      <section className="page-banner">
        <div className="page-banner-inner">
          <p className="eyebrow">Checkout</p>
          <h1>결제</h1>
        </div>
      </section>
      <CheckoutPageClient catalog={catalog} />
    </main>
  );
}
