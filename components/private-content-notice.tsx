import Link from "next/link";

type PrivateContentKind = "product" | "post" | "page";

const KIND_LABEL: Record<PrivateContentKind, string> = {
  product: "상품",
  post: "글",
  page: "페이지"
};

// "페이지은"이 되지 않도록 조사까지 붙여둔 표기
const KIND_TOPIC: Record<PrivateContentKind, string> = {
  product: "상품은",
  post: "글은",
  page: "페이지는"
};

const BACK_LINK: Record<PrivateContentKind, { href: string; label: string }> = {
  product: { href: "/shop", label: "상점으로 가기" },
  post: { href: "/", label: "홈으로 가기" },
  page: { href: "/", label: "홈으로 가기" }
};

/**
 * 비공개(visibility === "private") 콘텐츠에 접근했을 때 404 대신 보여주는 안내 화면.
 * 관리자용 편집 링크는 루트 레이아웃의 AdminPublicToolbar가 로그인 상태에서만 따로 띄우므로
 * 이 화면에는 넣지 않는다(비로그인 방문자에게 관리 주소를 노출하지 않기 위함).
 */
export function PrivateContentNotice({ kind }: { kind: PrivateContentKind }) {
  const label = KIND_LABEL[kind];
  const back = BACK_LINK[kind];

  return (
    <main className="shell">
      <article className="article-shell">
        <header className="article-header">
          <p className="meta-line">비공개</p>
          <h1>비공개 {label}입니다</h1>
        </header>

        <section className="panel account-panel">
          <p className="account-form-copy">
            이 {KIND_TOPIC[kind]} 현재 <strong>비공개</strong>로 설정되어 있어 내용을 볼 수 없습니다. 주소가 잘못된 것은 아닙니다.
          </p>
          <p className="account-form-copy">
            공개로 전환되면 같은 주소에서 바로 보실 수 있습니다. 급하시면 고객센터로 문의해 주세요.
          </p>
          <p className="account-form-copy">
            <a href="https://open.kakao.com/me/npn1212/chat" target="_blank" rel="noreferrer">
              고객센터 바로가기
            </a>
          </p>
          <p>
            <Link className="action-button" href={back.href}>
              {back.label}
            </Link>
          </p>
        </section>
      </article>
    </main>
  );
}
