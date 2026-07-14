import { notFound } from "next/navigation";

import { AdminPostForm } from "@/components/admin-post-form";
import { getAdminPostById } from "@/lib/admin-store";

export default async function EditPostPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; copied?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const post = await getAdminPostById(Number(id));
  if (!post) notFound();
  return <AdminPostForm post={post} error={query.error} copied={query.copied === "1"} />;
}
