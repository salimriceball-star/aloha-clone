"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type FormEvent } from "react";

import {
  bankTransferAccount,
  checkoutBoxNotes,
  checkoutFieldLabels,
  formatWon,
  type PurchaseProduct,
  type StoredCartItem,
  type StoredOrder
} from "@/lib/purchase-flow";

const CART_STORAGE_KEY = "aloha-clone/cart";
const ORDER_STORAGE_PREFIX = "aloha-clone/order/";
const CART_EVENT = "aloha-clone:cart-updated";
const NORMALIZED_CART_STORAGE_KEY = "aloha-clone/cart";

type ResolvedCartItem = {
  product: PurchaseProduct;
  quantity: number;
  lineTotal: number;
};

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}…` : value;
}

function sanitizeCartItems(items: StoredCartItem[]) {
  return items
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(0, Math.floor(item.quantity))
    }))
    .filter((item) => item.quantity > 0);
}

function readCart() {
  if (typeof window === "undefined") {
    return [] as StoredCartItem[];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const nextRaw = raw ?? window.localStorage.getItem(NORMALIZED_CART_STORAGE_KEY);
    if (!nextRaw) {
      return [] as StoredCartItem[];
    }

    const parsed = JSON.parse(nextRaw) as StoredCartItem[];
    return sanitizeCartItems(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [] as StoredCartItem[];
  }
}

function writeCart(items: StoredCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(NORMALIZED_CART_STORAGE_KEY, JSON.stringify(sanitizeCartItems(items)));
  window.dispatchEvent(new Event(CART_EVENT));
}

function updateStoredCart(recipe: (items: StoredCartItem[]) => StoredCartItem[]) {
  writeCart(recipe(readCart()));
}

function writeOrder(order: StoredOrder) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${ORDER_STORAGE_PREFIX}${order.id}`, JSON.stringify(order));
}

function readOrder(orderId: string) {
  if (typeof window === "undefined") {
    return null as StoredOrder | null;
  }

  try {
    const raw = window.localStorage.getItem(`${ORDER_STORAGE_PREFIX}${orderId}`);
    return raw ? (JSON.parse(raw) as StoredOrder) : null;
  } catch {
    return null as StoredOrder | null;
  }
}

function resolveCartItems(catalog: PurchaseProduct[], items: StoredCartItem[]) {
  const catalogMap = new Map(catalog.map((product) => [product.id, product]));

  return sanitizeCartItems(items)
    .map((item) => {
      const product = catalogMap.get(item.productId);
      if (!product) {
        return null;
      }

      return {
        product,
        quantity: item.quantity,
        lineTotal: (product.priceValue ?? 0) * item.quantity
      };
    })
    .filter((item): item is ResolvedCartItem => item !== null);
}

function lineTotalLabel(item: ResolvedCartItem) {
  if (item.product.priceValue === null) {
    return item.product.priceText ?? "";
  }

  return formatWon(item.lineTotal);
}

function buildOrderId() {
  return `${Date.now()}`.slice(-6);
}

function buildOrderKey() {
  return `wc_order_${Math.random().toString(36).slice(2, 12)}`;
}

function useCartState(catalog: PurchaseProduct[]) {
  const [cartItems, setCartItems] = useState<ResolvedCartItem[]>([]);

  useEffect(() => {
    const syncCart = () => {
      startTransition(() => {
        setCartItems(resolveCartItems(catalog, readCart()));
      });
    };

    const handleSync = () => {
      syncCart();
    };

    syncCart();
    window.addEventListener("storage", handleSync);
    window.addEventListener(CART_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(CART_EVENT, handleSync);
    };
  }, [catalog]);

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    cartItems,
    totalCount,
    totalValue,
    totalText: totalValue > 0 ? formatWon(totalValue) : "",
    addItem(product: PurchaseProduct) {
      updateStoredCart((current) => {
        const existing = current.find((item) => item.productId === product.id);
        if (existing) {
          return current.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }

        return [...current, { productId: product.id, quantity: 1 }];
      });
    },
    updateQuantity(productId: number, quantity: number) {
      updateStoredCart((current) =>
        current
          .map((item) => (item.productId === productId ? { ...item, quantity } : item))
          .filter((item) => item.quantity > 0)
      );
    },
    removeItem(productId: number) {
      updateStoredCart((current) => current.filter((item) => item.productId !== productId));
    },
    clearCart() {
      writeCart([]);
    }
  };
}

export function CartNavLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const syncCount = () => {
      startTransition(() => {
        setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
      });
    };

    const handleSync = () => {
      syncCount();
    };

    syncCount();
    window.addEventListener("storage", handleSync);
    window.addEventListener(CART_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(CART_EVENT, handleSync);
    };
  }, []);

  return (
    <Link href="/cart" className="cart-link">
      장바구니{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}

export function ProductPurchaseActions({
  product,
  compact = false
}: {
  product: PurchaseProduct;
  compact?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const soldOut = product.stockState === "soldout" || product.stockState === "reserved";

  const addItem = () => {
    if (soldOut) {
      return;
    }
    updateStoredCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { productId: product.id, quantity: 1 }];
    });
    setMessage("장바구니에 담았습니다.");
  };

  const goCheckout = () => {
    if (soldOut) {
      return;
    }
    addItem();
    router.push("/checkout");
  };

  return (
    <div className={`action-stack${compact ? " compact" : ""}`}>
      <div className="action-row">
        <button type="button" className="action-button" onClick={addItem} disabled={soldOut}>
          {soldOut ? (product.stockState === "reserved" ? "예약중" : "판매완료") : "장바구니 담기"}
        </button>
        <button type="button" className="action-button secondary-button" onClick={goCheckout} disabled={soldOut}>
          바로 결제
        </button>
      </div>
      {message ? <p className="inline-note">{message}</p> : null}
    </div>
  );
}

export function CartPageClient({ catalog }: { catalog: PurchaseProduct[] }) {
  const { cartItems, totalCount, totalText, updateQuantity, removeItem } = useCartState(catalog);

  if (!cartItems.length) {
    return (
      <section className="panel">
        <h2>장바구니가 비어 있습니다</h2>
        <p>구매 가능한 상품을 먼저 선택해 주세요.</p>
        <Link href="/shop" className="text-link">
          상점으로 이동
        </Link>
      </section>
    );
  }

  return (
    <div className="commerce-layout">
      <section className="commerce-list">
        {cartItems.map((item) => (
          <article key={item.product.id} className="commerce-card">
            {item.product.imageUrl ? (
              <div className="cart-thumb">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.title}
                  width={240}
                  height={240}
                  loading="eager"
                />
              </div>
            ) : null}
            <div className="commerce-card-body">
              <div className="flag-row">
                <span>{item.product.priceText ?? "가격 확인 필요"}</span>
                <span>상품평 {item.product.reviewCount}</span>
              </div>
              <h2>
                <Link href={`/product/${encodeURIComponent(item.product.slug)}`}>{item.product.title}</Link>
              </h2>
              <p className="summary">{clampText(item.product.excerpt, 140)}</p>
              <div className="quantity-row">
                <button type="button" className="quantity-button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                  -
                </button>
                <strong>{item.quantity}</strong>
                <button type="button" className="quantity-button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                  +
                </button>
                <span>{lineTotalLabel(item)}</span>
              </div>
              <button type="button" className="inline-link" onClick={() => removeItem(item.product.id)}>
                항목 제거
              </button>
            </div>
          </article>
        ))}
      </section>

      <aside className="panel order-card">
        <p className="eyebrow">Cart</p>
        <h2>장바구니 합계</h2>
        <div className="summary-row">
          <span>상품 수량</span>
          <strong>{totalCount}</strong>
        </div>
        <div className="summary-row summary-row-strong">
          <span>총계</span>
          <strong>{totalText}</strong>
        </div>
        <Link href="/checkout" className="action-button link-button">
          결제 진행하기
        </Link>
      </aside>
    </div>
  );
}

export function CheckoutPageClient({ catalog }: { catalog: PurchaseProduct[] }) {
  const router = useRouter();
  const { cartItems, totalText, totalValue, clearCart } = useCartState(catalog);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cartItems.length) {
      return;
    }

    setSubmitting(true);

    const id = buildOrderId();
    const key = buildOrderKey();
    const order: StoredOrder = {
      id,
      key,
      createdAt: new Date().toISOString(),
      customerName,
      email,
      phone,
      memo,
      items: cartItems.map((item) => ({
        ...item.product,
        quantity: item.quantity,
        lineTotal: item.lineTotal
      })),
      totalValue,
      totalText
    };

    writeOrder(order);
    clearCart();
    router.push(`/checkout/order-received/${id}?key=${encodeURIComponent(key)}`);
  };

  if (!cartItems.length) {
    return (
      <section className="panel">
        <h2>결제할 상품이 없습니다</h2>
        <p>장바구니에서 상품을 담아 주세요.</p>
        <Link href="/shop" className="text-link">
          상점으로 이동
        </Link>
      </section>
    );
  }

  return (
    <form className="checkout-grid" onSubmit={submitOrder}>
      <section className="panel">
        <p className="eyebrow">Billing</p>
        <h2>주문자 정보</h2>
        <div className="field-grid">
          <label className="field">
            <span>{checkoutFieldLabels[0]}</span>
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
          </label>
          <label className="field">
            <span>{checkoutFieldLabels[1]}</span>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>{checkoutFieldLabels[2]}</span>
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>{checkoutFieldLabels[3]}</span>
            <textarea
              rows={4}
              placeholder="주문 관련 메시지, 예) 전달 관련 메모."
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </label>
        </div>
      </section>

      <aside className="checkout-sidebar">
        <section className="panel order-card">
          <p className="eyebrow">Review</p>
          <h2>고객님의 주문</h2>
          <div className="summary-list">
            {cartItems.map((item) => (
              <div key={item.product.id} className="summary-row">
                <span>
                  {item.product.title} x {item.quantity}
                </span>
                <strong>{lineTotalLabel(item)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-row summary-row-strong">
            <span>총계</span>
            <strong>{totalText}</strong>
          </div>
        </section>

        <section className="panel payment-card">
          <p className="eyebrow">BACS</p>
          <h2>무통장입금</h2>
          {checkoutBoxNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <div className="bank-card">
            <strong>{bankTransferAccount.bankName}</strong>
            <span>{bankTransferAccount.accountHolder}</span>
            <span>{bankTransferAccount.accountNumber}</span>
          </div>
          <button type="submit" className="action-button" disabled={submitting}>
            주문 확정
          </button>
        </section>
      </aside>
    </form>
  );
}

export function OrderReceivedClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<StoredOrder | null>(null);

  useEffect(() => {
    const syncOrder = () => {
      startTransition(() => {
        setOrder(readOrder(orderId));
      });
    };

    syncOrder();
  }, [orderId]);
  const createdAtText = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : null;
  const lineItems = order?.items ?? [];

  return (
    <div className="stack-grid">
      <section className="panel success-panel">
        <p className="eyebrow">Order Received</p>
        <h1>주문이 접수되었습니다</h1>
        <p>입금 확인 후 순차적으로 안내가 진행됩니다.</p>
      </section>

      <section className="commerce-layout">
        <article className="panel order-card">
          <h2>주문 상세</h2>
          <div className="order-meta-grid">
            <div className="order-meta-card">
              <span>주문번호</span>
              <strong>{order?.id ?? orderId}</strong>
            </div>
            {createdAtText ? (
              <div className="order-meta-card">
                <span>날짜</span>
                <strong>{createdAtText}</strong>
              </div>
            ) : null}
            {order?.email ? (
              <div className="order-meta-card">
                <span>이메일</span>
                <strong>{order.email}</strong>
              </div>
            ) : null}
            {order?.totalText ? (
              <div className="order-meta-card">
                <span>총계</span>
                <strong>{order.totalText}</strong>
              </div>
            ) : null}
            <div className="order-meta-card">
              <span>결제 방법</span>
              <strong>무통장입금</strong>
            </div>
          </div>
          {lineItems.length > 0 ? (
            <div className="summary-list">
              {lineItems.map((item) => (
                <div key={`${item.id}-${item.quantity}`} className="summary-row">
                  <span>
                    {item.title} x {item.quantity}
                  </span>
                  <strong>{item.priceValue === null ? item.priceText ?? "" : formatWon(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {order?.memo ? (
            <div className="order-received-note">
              <h3>주문 메모</h3>
              <p>{order.memo}</p>
            </div>
          ) : null}
        </article>

        <aside className="stack-grid">
          <section className="panel bank-card bank-card-large">
            <p className="eyebrow">Bank Transfer</p>
            <h2>입금 안내</h2>
            <strong>{bankTransferAccount.bankName}</strong>
            <span>{bankTransferAccount.accountHolder}</span>
            <span>{bankTransferAccount.accountNumber}</span>
          </section>

          <section className="panel order-card">
            <h2>주문 상품</h2>
            {lineItems.length > 0 ? (
              <div className="summary-list">
                {lineItems.map((item) => (
                  <div key={`${item.id}-summary-${item.quantity}`} className="summary-row">
                    <span>
                      {item.title} x {item.quantity}
                    </span>
                    <strong>{item.priceValue === null ? item.priceText ?? "" : formatWon(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="summary-row">
                <span>주문 상품</span>
                <strong>결제 직후 확인하실 수 있습니다.</strong>
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
