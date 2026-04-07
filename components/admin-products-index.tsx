import Link from "next/link";
import { notFound } from "next/navigation";

import { bulkUpdateProductAction } from "@/app/admin/actions";
import { PaginationNav } from "@/components/pagination-nav";
import { ProductPriceContent } from "@/components/product-price-content";
import { getProducts } from "@/lib/site-data";

const adminProductPageSize = 24;

function visibilityLabel(value: "public" | "hidden" | "private") {
  if (value === "hidden") {
    return "링크 전용";
  }

  if (value === "private") {
    return "비공개";
  }

  return "공개";
}

function stockStateLabel(value: "available" | "reserved" | "soldout") {
  if (value === "reserved") {
    return "예약중";
  }

  if (value === "soldout") {
    return "판매완료";
  }

  return "판매중";
}

function hrefForPage(page: number) {
  return page <= 1 ? "/loginpage/products" : `/loginpage/products/page/${page}`;
}

export async function AdminProductsIndex({
  currentPage,
  searchParams
}: {
  currentPage: number;
  searchParams: {
    bulkSaved?: string;
    bulkError?: string;
  };
}) {
  const products = await getProducts({ includeHidden: true, includePrivate: true });
  const totalPages = Math.max(1, Math.ceil(products.length / adminProductPageSize));

  if (currentPage < 1 || currentPage > totalPages) {
    notFound();
  }

  const start = (currentPage - 1) * adminProductPageSize;
  const pageProducts = products.slice(start, start + adminProductPageSize);
  const currentListHref = hrefForPage(currentPage);

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h1>상품 관리</h1>
          </div>
          <div className="admin-page-actions">
            <Link href="/loginpage/products/common" className="action-button secondary-button">
              공통 도입부 편집
            </Link>
          </div>
        </div>

        <p className="plain-copy">
          목록에서는 상품 요약과 상태만 다룹니다. 자세한 편집은 각 상품의 편집 페이지에서 진행합니다.
        </p>
        <p className="plain-copy">
          전체 {products.length}개 상품 중 {start + 1} - {Math.min(products.length, start + pageProducts.length)}번을 보고 있습니다.
        </p>

        {searchParams.bulkSaved ? (
          <p className="inline-note">{searchParams.bulkSaved}개 상품 상태를 저장했습니다.</p>
        ) : null}
        {searchParams.bulkError === "selection" ? <p className="warning-text">선택한 상품이 없습니다.</p> : null}
        {searchParams.bulkError === "action" ? <p className="warning-text">일괄 변경할 상태를 선택해 주세요.</p> : null}

        <form action={bulkUpdateProductAction} className="admin-form-grid">
          <input type="hidden" name="returnTo" value={currentListHref} />

          <div className="admin-bulk-toolbar">
            <label className="field">
              <span>공개 범위 일괄변경</span>
              <select name="visibility">
                <option value="">변경 안 함</option>
                <option value="public">공개</option>
                <option value="hidden">링크로만 접근</option>
                <option value="private">비공개</option>
              </select>
            </label>
            <label className="field">
              <span>판매 상태 일괄변경</span>
              <select name="stockState">
                <option value="">변경 안 함</option>
                <option value="available">판매 가능</option>
                <option value="reserved">예약중</option>
                <option value="soldout">판매완료</option>
              </select>
            </label>
            <button type="submit" className="action-button">
              선택 상품 저장
            </button>
          </div>

          <div className="admin-product-selector">
            {pageProducts.map((product) => {
              const editHref = `/loginpage/products/edit/${encodeURIComponent(product.slug)}${
                currentPage > 1 ? `?page=${currentPage}` : ""
              }`;

              return (
                <article key={product.id} className="admin-product-row">
                  <label className="admin-checkbox admin-product-checkbox">
                    <input type="checkbox" name="selectedSlug" value={product.slug} />
                    <span>선택</span>
                  </label>

                  <div className="admin-product-row-body">
                    <div className="admin-product-row-head">
                      <div>
                        <strong>{product.title}</strong>
                        <p className="plain-copy">{product.slug}</p>
                      </div>
                      <div className="admin-product-actions">
                        <Link href={editHref} className="action-button secondary-button">
                          편집
                        </Link>
                        <Link href={`/product/${product.slug}`} className="action-button secondary-button">
                          보기
                        </Link>
                      </div>
                    </div>

                    <div className="admin-inline-flags">
                      <span>{visibilityLabel(product.visibility)}</span>
                      <span>{stockStateLabel(product.stockState)}</span>
                    </div>

                    <p className="catalog-price admin-product-price">
                      <ProductPriceContent
                        priceText={product.priceText}
                        priceValue={product.priceValue}
                        regularPriceValue={product.regularPriceValue}
                        salePriceValue={product.salePriceValue}
                      />
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </form>

        <PaginationNav currentPage={currentPage} totalPages={totalPages} basePath="/loginpage/products" />
      </section>
    </section>
  );
}
