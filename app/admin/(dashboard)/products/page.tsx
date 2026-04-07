import Link from "next/link";

import { saveProductAction, saveProductCommonIntroAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { getProductCommonIntroHtml, getProducts } from "@/lib/site-data";

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string; introSaved?: string; edit?: string }>;
}) {
  const [products, params, productCommonIntroHtml] = await Promise.all([
    getProducts({ includeHidden: true, includePrivate: true }),
    searchParams,
    getProductCommonIntroHtml()
  ]);
  const selectedProduct = products.find((product) => product.slug === params.edit) ?? products[0] ?? null;
  const selectedHref = selectedProduct ? `/admin/products?edit=${encodeURIComponent(selectedProduct.slug)}` : "/admin/products";

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Products</p>
        <h1>상품 관리</h1>
        <form action={saveProductCommonIntroAction} className="admin-form-grid">
          <input type="hidden" name="returnTo" value={selectedHref} />
          <AdminHtmlEditor
            label="상품 공통 도입부"
            name="value"
            initialHtml={productCommonIntroHtml}
            minHeight={360}
            description="모든 상품 상세 상단에 공통으로 들어가는 안내 영역입니다."
          />
          <button type="submit" className="action-button">
            공통 안내 저장
          </button>
        </form>
        {params.introSaved === "1" ? <p className="inline-note">공통 안내가 저장되었습니다.</p> : null}
        {params.saved === "1" ? <p className="inline-note">상품 설정이 저장되었습니다.</p> : null}
        {params.error === "1" ? <p className="warning-text">상품 식별자를 확인해 주세요.</p> : null}
      </section>

      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2>편집할 상품 선택</h2>
          </div>
          <p className="plain-copy">목록에서는 요약만 보여주고, 실제 편집기는 선택한 상품 한 건만 엽니다.</p>
        </div>
        <div className="admin-product-selector">
          {products.map((product) => {
            const href = `/admin/products?edit=${encodeURIComponent(product.slug)}`;
            const isActive = selectedProduct?.slug === product.slug;

            return (
              <Link key={product.id} href={href} className={`admin-product-link ${isActive ? "is-active" : ""}`}>
                <strong>{product.title}</strong>
                <span>{product.slug}</span>
                <span>
                  {product.priceText ?? "가격 미확인"} · {product.visibility} · {product.stockState}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {selectedProduct ? (
        <article className="panel admin-product-card admin-product-editor-panel">
          <div className="admin-product-head">
            <div>
              <strong>{selectedProduct.title}</strong>
              <p className="plain-copy">{selectedProduct.slug}</p>
            </div>
            <div className="flag-row">
              <span>{selectedProduct.priceText ?? "가격 미확인"}</span>
              <span>{selectedProduct.visibility}</span>
              <span>{selectedProduct.stockState}</span>
            </div>
          </div>

          <form action={saveProductAction} className="admin-form-grid">
            <input type="hidden" name="sourceProductId" value={selectedProduct.id} />
            <input type="hidden" name="slug" value={selectedProduct.slug} />
            <input type="hidden" name="returnTo" value={selectedHref} />
            <label className="field field-wide">
              <span>상품명 override</span>
              <input name="title" defaultValue={selectedProduct.title} />
            </label>
            <label className="field">
              <span>정가</span>
              <input
                name="regularPriceValue"
                type="number"
                min="0"
                defaultValue={selectedProduct.regularPriceValue ?? selectedProduct.priceValue ?? undefined}
              />
            </label>
            <label className="field">
              <span>할인가</span>
              <input name="salePriceValue" type="number" min="0" defaultValue={selectedProduct.salePriceValue ?? undefined} />
            </label>
            <label className="field">
              <span>공개범위</span>
              <select name="visibility" defaultValue={selectedProduct.visibility}>
                <option value="public">공개</option>
                <option value="hidden">링크로만 접근</option>
                <option value="private">비공개</option>
              </select>
            </label>
            <label className="field">
              <span>판매 상태</span>
              <select name="stockState" defaultValue={selectedProduct.stockState}>
                <option value="available">판매 가능</option>
                <option value="reserved">예약중</option>
                <option value="soldout">판매완료</option>
              </select>
            </label>
            <label className="field field-wide">
              <span>대표 이미지 URL</span>
              <input name="imageUrl" defaultValue={selectedProduct.imageUrl ?? ""} />
            </label>
            <AdminHtmlEditor
              label="요약 override"
              name="excerptHtml"
              initialHtml={selectedProduct.excerptHtml}
              minHeight={180}
            />
            <AdminHtmlEditor
              label="본문 override"
              name="contentHtml"
              initialHtml={selectedProduct.contentHtml}
              minHeight={320}
            />
            <button type="submit" className="action-button">
              저장
            </button>
          </form>
        </article>
      ) : null}
    </section>
  );
}
