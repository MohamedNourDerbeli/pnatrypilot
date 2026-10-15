export type Unit = "g" | "kg" | "ml" | "l" | "tsp" | "tbsp" | "cup" | "piece";
export type Dimension = "mass" | "volume" | "count";

const TABLE: Record<Unit, { dim: Dimension; factor: number }> = {
  g: { dim: "mass", factor: 1 },
  kg: { dim: "mass", factor: 1000 },
  ml: { dim: "volume", factor: 1 },
  l: { dim: "volume", factor: 1000 },
  tsp: { dim: "volume", factor: 4.92892 },
  tbsp: { dim: "volume", factor: 14.7868 },
  cup: { dim: "volume", factor: 236.588 },
  piece: { dim: "count", factor: 1 },
};

export const BASE_UNIT: Record<Dimension, Unit> = {
  mass: "g",
  volume: "ml",
  count: "piece",
};

export function dimensionOf(unit: Unit): Dimension {
  return TABLE[unit].dim;
}

export function toBase(quantity: number, unit: Unit): number {
  return quantity * TABLE[unit].factor;
}
