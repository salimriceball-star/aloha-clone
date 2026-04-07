import Link from "next/link";
import { notFound } from "next/navigation";

import { saveProductAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { ProductPriceContent } from "@/components/product-price-content";
import { getProductBySlug } from "@/lib/site-data";

function listHrefFor(page: number) {
  return page > 1 ? `/loginpage/products/page/${page}` : "/loginpage/products";
}

export default async function LoginpageProductEditPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string; page?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug, { includeHidden: true, includePrivate: true });

  if (!product) {
    notFound();
  }

  const pageNumber = Number(query.page ?? "1");
  const normalizedPage = Number.isInteger(pageNumber) && pageNumber > 1 ? pageNumber : 1;
  const listHref = listHrefFor(normalizedPage);
  const returnTo =
    normalizedPage > 1
      ? `/loginpage/products/edit/${encodeURIComponent(product.slug)}?page=${normalizedPage}`
      : `/loginpage/products/edit/${encodeURIComponent(product.slug)}`;

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Product Editor</p>
            <h1>{product.title}</h1>
          </div>
          <div className="admin-page-actions">
            <Link href="/loginpage/products/common" className="action-button secondary-button">
              공통 도입부 편집
            </Link>
            <Link href={listHref} className="action-button secondary-button">
              목록으로
            </Link>
          </div>
        </div>

        <div className="admin-inline-flags">
          <span>{product.slug}</span>
          <span>{product.visibility}</span>
          <span>{product.stockState}</span>
        </div>

        <p className="catalog-price admin-product-price">
          <ProductPriceContent
            priceText={product.priceText}
            priceValue={product.priceValue}
            regularPriceValue={product.regularPriceValue}
            salePriceValue={product.salePriceValue}
          />
        </p>

        {query.saved === "1" ? <p className="inline-note">상품 설정이 저장되었습니다.</p> : null}
        {query.error === "1" ? <p className="warning-text">상품 식별자를 확인해 주세요.</p> : null}
      </section>

      <article className="panel admin-product-card admin-product-editor-panel">
        <form action={saveProductAction} className="admin-form-grid">
          <input type="hidden" name="sourceProductId" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="field field-wide">
            <span>상품명 override</span>
            <input name="title" defaultValue={product.title} />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>정가</span>
              <input
                name="regularPriceValue"
                type="number"
                min="0"
                defaultValue={product.regularPriceValue ?? product.priceValue ?? undefined}
              />
            </label>

            <label className="field">
              <span>할인가</span>
              <input name="salePriceValue" type="number" min="0" defaultValue={product.salePriceValue ?? undefined} />
            </label>

            <label className="field">
              <span>공개범위</span>
              <select name="visibility" defaultValue={product.visibility}>
                <option value="public">공개</option>
                <option value="hidden">링크로만 접근</option>
                <option value="private">비공개</option>
              </select>
            </label>

            <label className="field">
              <span>판매 상태</span>
              <select name="stockState" defaultValue={product.stockState}>
                <option value="available">판매 가능</option>
                <option value="reserved">예약중</option>
                <option value="soldout">판매완료</option>
              </select>
            </label>
          </div>

          <label className="field field-wide">
            <span>대표 이미지 URL</span>
            <input name="imageUrl" defaultValue={product.imageUrl ?? ""} />
          </label>

          <AdminHtmlEditor label="요약 override" name="excerptHtml" initialHtml={product.excerptHtml} minHeight={180} />
          <AdminHtmlEditor label="본문 override" name="contentHtml" initialHtml={product.contentHtml} minHeight={360} />

          <button type="submit" className="action-button">
            저장
          </button>
        </form>
      </article>
    </section>
  );
}
