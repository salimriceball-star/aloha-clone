import { saveProductAction } from "@/app/admin/actions";
import { getProducts } from "@/lib/site-data";

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [products, params] = await Promise.all([
    getProducts({ includeHidden: true, includePrivate: true }),
    searchParams
  ]);

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Products</p>
        <h1>상품 관리</h1>
        {params.saved === "1" ? <p className="inline-note">상품 설정이 저장되었습니다.</p> : null}
        {params.error === "1" ? <p className="warning-text">상품 식별자를 확인해 주세요.</p> : null}
      </section>

      <section className="admin-list">
        {products.map((product) => (
          <article key={product.id} className="panel admin-product-card">
            <div className="admin-product-head">
              <div>
                <strong>{product.title}</strong>
                <p className="plain-copy">{product.slug}</p>
              </div>
              <div className="flag-row">
                <span>{product.priceText ?? "가격 미확인"}</span>
                <span>{product.visibility}</span>
                <span>{product.stockState}</span>
              </div>
            </div>

            <form action={saveProductAction} className="admin-form-grid">
              <input type="hidden" name="sourceProductId" value={product.id} />
              <input type="hidden" name="slug" value={product.slug} />
              <label className="field field-wide">
                <span>상품명 override</span>
                <input name="title" defaultValue={product.title} />
              </label>
              <label className="field">
                <span>정가</span>
                <input name="regularPriceValue" type="number" min="0" defaultValue={product.regularPriceValue ?? product.priceValue ?? undefined} />
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
              <label className="field field-wide">
                <span>대표 이미지 URL</span>
                <input name="imageUrl" defaultValue={product.imageUrl ?? ""} />
              </label>
              <label className="field field-wide">
                <span>요약 HTML override</span>
                <textarea name="excerptHtml" rows={4} defaultValue={product.excerptHtml} />
              </label>
              <label className="field field-wide">
                <span>본문 HTML override</span>
                <textarea name="contentHtml" rows={10} defaultValue={product.contentHtml} />
              </label>
              <button type="submit" className="action-button">
                저장
              </button>
            </form>
          </article>
        ))}
      </section>
    </section>
  );
}
