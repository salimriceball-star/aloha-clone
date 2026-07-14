import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "장바구니",
  robots: { index: false, follow: false, noarchive: true }
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
