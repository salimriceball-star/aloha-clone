import { AdminPostForm } from "@/components/admin-post-form";

export default async function NewPostPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <AdminPostForm error={params.error} />;
}
