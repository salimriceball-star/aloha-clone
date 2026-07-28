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
          <p className="inline-note">
            독립 복사본을 만들었습니다. 공개범위는 <strong>링크로만 접근</strong>으로 시작하니, 슬러그와 상품 정보를 확인한 뒤 상점
            목록에도 띄우려면 &lsquo;공개&rsquo;로 바꿔 저장해 주세요.
          </p>
        ) : null}

        {product.visibility === "private" ? (
          <p className="warning-text" role="alert">
            이 상품은 <strong>비공개</strong>라서 저장은 되었지만 방문자에게는 보이지 않습니다. <code>/product/{product.slug}</code>
            {" 와 "}
            <code>/{product.slug}</code> 주소 모두 404가 됩니다. 아래 <strong>공개범위</strong>를 &lsquo;공개&rsquo; 또는 &lsquo;링크로만
            접근&rsquo;으로 바꾼 뒤 다시 저장해 주세요.
          </p>
        ) : null}
        {product.visibility === "hidden" ? (
          <p className="inline-note">
            공개범위가 <strong>링크로만 접근</strong>입니다. <code>/product/{product.slug}</code> 주소를 아는 사람은 볼 수 있지만 상점
            목록·검색·사이트맵에는 나오지 않습니다.
          </p>
        ) : null}
        {query.error === "slug" ? <p className="warning-text" role="alert">사용할 수 있는 상품 슬러그를 입력해 주세요.</p> : null}
        {query.error === "save" ? (
          <p className="warning-text" role="alert">상품 변경 사항을 DB에 저장하지 못했습니다. 내용은 브라우저 임시 저장본에서 복원할 수 있습니다.</p>
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
                <option value="private">비공개 (주소 접근 시 404)</option>
              </select>
              <small className="editor-description">
                복사본은 &lsquo;링크로만 접근&rsquo;으로 만들어집니다. 상점 목록·검색에도 띄우려면 &lsquo;공개&rsquo;로 바꿔 주세요.
              </small>
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

          <div className="admin-publish-actions admin-sticky-action-bar field-wide">
            <span className="admin-sticky-status">
              <span className="status-indicator-dot" aria-hidden="true" />
              업로드한 이미지와 편집 내용은 저장 버튼을 눌러야 반영됩니다.
            </span>
            <div className="admin-sticky-buttons">
              <Link href={`/product/${encodeURIComponent(product.slug)}`} target="_blank" className="action-button secondary-button">
                공개 화면
              </Link>
              <button type="submit" className="action-button">상품 저장</button>
            </div>
          </div>
        </form>
      </article>
    </section>
  );
}
