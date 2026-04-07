export function hasSalePrice(regularPriceValue: number | null, salePriceValue: number | null) {
  return (
    salePriceValue !== null &&
    regularPriceValue !== null &&
    salePriceValue > 0 &&
    salePriceValue < regularPriceValue
  );
}

export function getDisplayPriceValue(options: {
  priceValue: number | null;
  regularPriceValue: number | null;
  salePriceValue: number | null;
}) {
  return options.salePriceValue ?? options.regularPriceValue ?? options.priceValue;
}
