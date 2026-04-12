import { OrderReceivedClient } from "@/components/storefront-client";
import { getAdminOrderById } from "@/lib/admin-store";
import type { StoredOrder } from "@/lib/purchase-flow";

export const dynamic = "force-dynamic";

export default async function OrderReceivedPage({
  params,
  searchParams
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { orderId } = await params;
  const { key } = await searchParams;
  const order = await getAdminOrderById(orderId);
  const initialOrder: StoredOrder | null = order && (!key || order.key === key) ? order : null;

  return (
    <main className="shell">
      <OrderReceivedClient orderId={orderId} orderKey={key ?? null} initialOrder={initialOrder} />
    </main>
  );
}
