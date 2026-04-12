import Link from "next/link";

import { listAdminOrders } from "@/lib/admin-store";
import { formatWon } from "@/lib/purchase-flow";

function formatOrderDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const statusLabels = {
  pending: "입금대기",
  paid: "입금확인",
  done: "처리완료",
  cancelled: "취소"
} as const;

export default async function LoginpageOrdersPage() {
  const orders = await listAdminOrders();

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Orders</p>
        <div className="admin-page-actions">
          <div>
            <h1>주문 확인</h1>
            <p>최신 주문이 먼저 보이며, 주문완료 페이지로 바로 열어볼 수 있습니다.</p>
          </div>
        </div>
      </section>

      {orders.length > 0 ? (
        <section className="stack-grid">
          {orders.map((order) => (
            <article key={order.id} className="panel admin-order-card">
              <div className="admin-order-head">
                <div>
                  <p className="eyebrow">#{order.id}</p>
                  <h2>{order.customerName || "이름 미입력"}</h2>
                </div>
                <div className="admin-inline-flags">
                  <span>{statusLabels[order.status]}</span>
                  <span>{order.totalText || formatWon(order.totalValue)}</span>
                </div>
              </div>

              <div className="admin-order-meta">
                <div>
                  <span>일시</span>
                  <strong>{formatOrderDate(order.createdAt)}</strong>
                </div>
                <div>
                  <span>이메일</span>
                  <strong>{order.email || "-"}</strong>
                </div>
                <div>
                  <span>연락처</span>
                  <strong>{order.phone || "-"}</strong>
                </div>
                <div>
                  <span>주문완료</span>
                  <strong>
                    <Link href={`/checkout/order-received/${order.id}?key=${encodeURIComponent(order.key)}`} className="text-link">
                      열기
                    </Link>
                  </strong>
                </div>
              </div>

              <div className="summary-list">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.slug}-${item.quantity}`} className="summary-row">
                    <span>
                      {item.title} x {item.quantity}
                    </span>
                    <strong>{item.priceValue === null ? item.priceText ?? "" : formatWon(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>

              {order.memo ? (
                <div className="order-received-note">
                  <h3>주문 메모</h3>
                  <p>{order.memo}</p>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="panel">
          <h2>저장된 주문이 없습니다</h2>
          <p>첫 주문이 생성되면 이 화면에서 확인할 수 있습니다.</p>
        </section>
      )}
    </section>
  );
}
