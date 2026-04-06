import { OrderReceivedClient } from "@/components/storefront-client";

export const dynamic = "force-dynamic";

export default async function OrderReceivedPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <main className="shell">
      <OrderReceivedClient orderId={orderId} />
    </main>
  );
}
