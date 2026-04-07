import { formatWon } from "@/lib/purchase-flow";
import { hasSalePrice } from "@/lib/product-pricing";

type ProductPriceContentProps = {
  priceText: string | null;
  priceValue: number | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
};

export function ProductPriceContent({
  priceText,
  priceValue,
  regularPriceValue,
  salePriceValue
}: ProductPriceContentProps) {
  if (hasSalePrice(regularPriceValue, salePriceValue)) {
    return (
      <>
        <span className="catalog-price-current">{formatWon(salePriceValue as number)}</span>{" "}
        <span className="catalog-price-strike">{formatWon(regularPriceValue as number)}</span>
      </>
    );
  }

  if (priceValue !== null) {
    return <span className="catalog-price-current">{formatWon(priceValue)}</span>;
  }

  return <>{priceText ?? "가격 확인 필요"}</>;
}
