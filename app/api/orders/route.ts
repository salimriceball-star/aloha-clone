import { NextResponse } from "next/server";

import { saveAdminOrder } from "@/lib/admin-store";
import type { StoredOrder, StoredOrderItem } from "@/lib/purchase-flow";

function buildOrderId() {
  return `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function buildOrderKey() {
  return `wc_order_${Math.random().toString(36).slice(2, 12)}`;
}

function isStockState(value: unknown): value is "available" | "reserved" | "soldout" {
  return value === "available" || value === "reserved" || value === "soldout";
}

function normalizeItem(input: unknown) {
  if (!input || typeof input !== "object") {
    return null as StoredOrderItem | null;
  }

  const item = input as Record<string, unknown>;
  const quantity = Number(item.quantity ?? 0);
  const lineTotal = Number(item.lineTotal ?? 0);

  if (!Number.isFinite(quantity) || quantity < 1 || !String(item.slug ?? "").trim() || !String(item.title ?? "").trim()) {
    return null as StoredOrderItem | null;
  }

  return {
    id: Number(item.id ?? 0),
    slug: String(item.slug),
    title: String(item.title),
    excerpt: String(item.excerpt ?? ""),
    priceText: item.priceText === null || item.priceText === undefined ? null : String(item.priceText),
    priceValue:
      item.priceValue === null || item.priceValue === undefined || item.priceValue === ""
        ? null
        : Number(item.priceValue),
    imageUrl: item.imageUrl === null || item.imageUrl === undefined ? null : String(item.imageUrl),
    reviewCount: Number(item.reviewCount ?? 0),
    stockState: isStockState(item.stockState) ? item.stockState : undefined,
    quantity,
    lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0
  };
}

function isStoredOrderItem(value: StoredOrderItem | null): value is StoredOrderItem {
  return value !== null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const items = Array.isArray(body.items) ? body.items.map(normalizeItem).filter(isStoredOrderItem) : [];
    const customerName = String(body.customerName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const memo = String(body.memo ?? "").trim();

    if (!customerName || !email || items.length === 0) {
      return NextResponse.json({ error: "주문 정보를 다시 확인해 주세요." }, { status: 400 });
    }

    const totalValue = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const order: StoredOrder = {
      id: buildOrderId(),
      key: buildOrderKey(),
      createdAt: new Date().toISOString(),
      customerName,
      email,
      phone,
      memo,
      items,
      totalValue,
      totalText: String(body.totalText ?? "")
    };

    const savedOrder = await saveAdminOrder(order);
    if (!savedOrder) {
      return NextResponse.json({ error: "주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }

    return NextResponse.json({ order: savedOrder });
  } catch {
    return NextResponse.json({ error: "주문 처리 중 문제가 발생했습니다." }, { status: 500 });
  }
}
