export type PurchaseProduct = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  priceText: string | null;
  priceValue: number | null;
  imageUrl: string | null;
  reviewCount: number;
  stockState?: "available" | "reserved" | "soldout";
};

export type StoredCartItem = {
  productId: number;
  quantity: number;
};

export type StoredOrderItem = PurchaseProduct & {
  quantity: number;
  lineTotal: number;
};

export type StoredOrder = {
  id: string;
  key: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  memo: string;
  items: StoredOrderItem[];
  totalValue: number;
  totalText: string;
};

export const bankTransferAccount = {
  bankName: "카카오뱅크",
  accountHolder: "안*리",
  accountNumber: "3333137744634"
} as const;

export const checkoutFieldLabels = [
  "주문자 성함(입금자명과 같아야 합니다.)",
  "이메일 주소",
  "연락처",
  "주문 메모"
] as const;

export const checkoutBoxNotes = [
  "성함과 이메일 주소를 정확히 입력해 주세요.",
  "입금 확인 후 순차적으로 주문 안내가 진행됩니다."
] as const;

export function formatWon(value: number) {
  return `₩${new Intl.NumberFormat("ko-KR").format(value)}`;
}
