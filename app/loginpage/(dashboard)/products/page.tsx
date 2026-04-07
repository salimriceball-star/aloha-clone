import { redirect } from "next/navigation";

import { AdminProductsIndex } from "@/components/admin-products-index";

export default async function LoginpageProductsPage({
  searchParams
}: {
  searchParams: Promise<{ bulkSaved?: string; bulkError?: string; edit?: string }>;
}) {
  const params = await searchParams;

  if (params.edit) {
    redirect(`/loginpage/products/edit/${encodeURIComponent(params.edit)}`);
  }

  return <AdminProductsIndex currentPage={1} searchParams={params} />;
}
