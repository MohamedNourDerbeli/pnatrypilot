import type { Dimension, Unit } from "./units";
import { dimensionOf, toBase } from "./units";

export interface PriceRecord {
  ingredientId: string;
  priceCents: number;
  quantity: number;
  unit: Unit;
}

export function estimateCostCents(
  ingredientId: string,
  dimension: Dimension,
  toBuyBase: number,
  prices: PriceRecord[],
): number | null {
  const price = prices.find(
    (item) =>
      item.ingredientId === ingredientId &&
      dimensionOf(item.unit) === dimension,
  );

  if (!price || price.quantity <= 0) return null;

  return Math.round(
    (toBuyBase / toBase(price.quantity, price.unit)) * price.priceCents,
  );
}
