import Link from "next/link";

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

function hrefFor(basePath: string, page: number) {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath.replace(/\/+$/, "")}/page/${page}`;
}

export function PaginationNav({ currentPage, totalPages, basePath }: PaginationNavProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="pagination-nav" aria-label="페이지 이동">
      {currentPage > 1 ? (
        <Link href={hrefFor(basePath, currentPage - 1)} className="pagination-link">
          이전
        </Link>
      ) : null}

      <div className="pagination-pages">
        {pages.map((page) => (
          <Link
            key={page}
            href={hrefFor(basePath, page)}
            className={`pagination-link${page === currentPage ? " current" : ""}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Link>
        ))}
      </div>

      {currentPage < totalPages ? (
        <Link href={hrefFor(basePath, currentPage + 1)} className="pagination-link">
          다음
        </Link>
      ) : null}
    </nav>
  );
}
