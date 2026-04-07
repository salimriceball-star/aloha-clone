import { hasSalePrice } from "@/lib/product-pricing";

type ProductStatusBadgesProps = {
  stockState: "available" | "reserved" | "soldout";
  regularPriceValue: number | null;
  salePriceValue: number | null;
};

export function ProductStatusBadges({
  stockState,
  regularPriceValue,
  salePriceValue
}: ProductStatusBadgesProps) {
  const hasSale = hasSalePrice(regularPriceValue, salePriceValue);

  return (
    <div className="status-badges" aria-label="상품 상태">
      {stockState === "soldout" ? <span className="status-badge soldout">SOLD OUT</span> : null}
      {stockState === "reserved" ? <span className="status-badge reserved">RESERVED</span> : null}
      {hasSale ? <span className="status-badge sale">SALE</span> : null}
    </div>
  );
}
