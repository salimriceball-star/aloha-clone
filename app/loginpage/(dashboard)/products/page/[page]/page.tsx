import { notFound, redirect } from "next/navigation";

import { AdminProductsIndex } from "@/components/admin-products-index";

export default async function LoginpageProductsPaginationPage({
  params,
  searchParams
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ bulkSaved?: string; bulkError?: string; edit?: string }>;
}) {
  const [{ page }, query] = await Promise.all([params, searchParams]);
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect("/loginpage/products");
  }

  if (query.edit) {
    redirect(`/loginpage/products/edit/${encodeURIComponent(query.edit)}?page=${pageNumber}`);
  }

  return <AdminProductsIndex currentPage={pageNumber} searchParams={query} />;
}
