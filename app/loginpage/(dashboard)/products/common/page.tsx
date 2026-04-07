import Link from "next/link";

import { saveProductCommonIntroAction } from "@/app/admin/actions";
import { AdminHtmlEditor } from "@/components/admin-html-editor";
import { getProductCommonIntroHtml } from "@/lib/site-data";

export default async function LoginpageProductCommonPage({
  searchParams
}: {
  searchParams: Promise<{ introSaved?: string }>;
}) {
  const [productCommonIntroHtml, params] = await Promise.all([getProductCommonIntroHtml(), searchParams]);

  return (
    <section className="stack-grid">
      <section className="panel admin-product-browser">
        <div className="admin-product-browser-head">
          <div>
            <p className="eyebrow">Products</p>
            <h1>상품 공통 도입부</h1>
          </div>
          <div className="admin-page-actions">
            <Link href="/loginpage/products" className="action-button secondary-button">
              목록으로
            </Link>
          </div>
        </div>

        <p className="plain-copy">모든 상품 상세 상단에 공통으로 들어가는 안내 영역입니다.</p>
        {params.introSaved === "1" ? <p className="inline-note">공통 안내가 저장되었습니다.</p> : null}

        <form action={saveProductCommonIntroAction} className="admin-form-grid">
          <input type="hidden" name="returnTo" value="/loginpage/products/common" />
          <AdminHtmlEditor label="상품 공통 도입부" name="value" initialHtml={productCommonIntroHtml} minHeight={420} />
          <button type="submit" className="action-button">
            공통 안내 저장
          </button>
        </form>
      </section>
    </section>
  );
}
