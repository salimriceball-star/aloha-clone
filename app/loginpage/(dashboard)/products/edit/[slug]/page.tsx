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
  searchParams: Promise<{ saved?: string; copied?: string; error?: string; page?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug, { includeHidden: true, includePrivate: true });

  if (!product) {
    notFound();
  }

  const pageNumber = Number(query.page ?? "1");
  const normalizedPage = Number.isInteger(pageNumber) && pageNumber > 1 ? pageNumber : 1;
  const listHref = listHrefFor(normalizedPage);

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Product Editor</p>
            <h1>{product.title}</h1>
          </div>
          <div className="admin-page-actions">
            <Link
              href={`/product/${encodeURIComponent(product.slug)}`}
              className="action-button"
              target="_blank"
              rel="noreferrer"
            >
              공개 상품 보기
            </Link>
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
        {query.copied === "1" ? (
          <p className="inline-note">독립 복사본을 만들었습니다. 슬러그와 상품 정보를 확인한 뒤 저장해 주세요.</p>
        ) : null}
        {query.error === "slug" ? <p className="warning-text">사용할 수 있는 상품 슬러그를 입력해 주세요.</p> : null}
        {query.error === "save" ? (
          <p className="warning-text">상품 변경 사항을 DB에 저장하지 못했습니다. 내용은 브라우저 임시 저장본에서 복원할 수 있습니다.</p>
        ) : null}
      </section>

      <article className="panel admin-product-card admin-product-editor-panel">
        <form action={saveProductAction} className="admin-form-grid">
          <input type="hidden" name="overrideId" value={product.overrideId ?? ""} />
          <input type="hidden" name="sourceProductId" value={product.sourceProductId ?? ""} />
          <input type="hidden" name="originalSlug" value={product.slug} />
          <input type="hidden" name="page" value={normalizedPage} />

          <label className="field field-wide">
            <span>주소 슬러그</span>
            <input name="slug" defaultValue={product.slug} required />
            <small className="editor-description">저장 후 공개 주소는 /product/입력한-슬러그 형식으로 바뀝니다.</small>
          </label>

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

          <AdminHtmlEditor
            label="요약 override"
            name="excerptHtml"
            initialHtml={product.excerptHtml}
            minHeight={180}
            draftStorageKey={`product:${product.overrideId ?? product.sourceProductId ?? product.slug}:excerpt`}
          />
          <AdminHtmlEditor
            label="본문 override"
            name="contentHtml"
            initialHtml={product.contentHtml}
            minHeight={360}
            draftStorageKey={`product:${product.overrideId ?? product.sourceProductId ?? product.slug}:content`}
          />

          <button type="submit" className="action-button">
            저장
          </button>
        </form>
      </article>
    </section>
  );
}
