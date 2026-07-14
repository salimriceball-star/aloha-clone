import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "주문",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true }
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
