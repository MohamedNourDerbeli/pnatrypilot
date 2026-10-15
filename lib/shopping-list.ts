import type { Dimension, Unit } from "./units";
import { BASE_UNIT, dimensionOf, toBase } from "./units";
import type { PriceRecord } from "./cost-calculator";
import { estimateCostCents } from "./cost-calculator";

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  defaultServings: number;
  ingredients: RecipeIngredient[];
}

export interface PlannedMeal {
  recipe: Recipe;
  servings: number;
}

export interface PantryItem {
  ingredientId: string;
  quantity: number;
  unit: Unit;
}

export type Flag = "pantry_unit_mismatch" | "no_price";

export interface ShoppingLine {
  ingredientId: string;
  dimension: Dimension;
  unit: Unit;
  needed: number;
  have: number;
  toBuy: number;
  costCents: number | null;
  flags: Flag[];
}

export interface ShoppingList {
  lines: ShoppingLine[];
  knownTotalCents: number;
  unknownPriceCount: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const key = (id: string, dimension: Dimension) => `${id}|${dimension}`;

export function buildShoppingList(
  meals: PlannedMeal[],
  pantry: PantryItem[],
  prices: PriceRecord[],
): ShoppingList {
  const needed = new Map<string, number>();

  for (const { recipe, servings } of meals) {
    if (
      servings <= 0 ||
      recipe.defaultServings <= 0 ||
      !Number.isFinite(servings) ||
      !Number.isFinite(recipe.defaultServings)
    ) {
      throw new Error(`Invalid servings for recipe ${recipe.id}`);
    }

    const scale = servings / recipe.defaultServings;

    for (const ingredient of recipe.ingredients) {
      if (ingredient.optional) continue;

      if (
        !Number.isFinite(ingredient.quantity) ||
        ingredient.quantity < 0
      ) {
        throw new Error(`Invalid quantity for ingredient ${ingredient.ingredientId}`);
      }

      const dimension = dimensionOf(ingredient.unit);
      const ingredientKey = key(ingredient.ingredientId, dimension);

      needed.set(
        ingredientKey,
        (needed.get(ingredientKey) ?? 0) +
          toBase(ingredient.quantity, ingredient.unit) * scale,
      );
    }
  }

  const have = new Map<string, number>();
  const pantryDims = new Map<string, Set<Dimension>>();

  for (const item of pantry) {
    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      throw new Error(`Invalid pantry quantity for ingredient ${item.ingredientId}`);
    }

    const dimension = dimensionOf(item.unit);
    const ingredientKey = key(item.ingredientId, dimension);

    have.set(
      ingredientKey,
      (have.get(ingredientKey) ?? 0) +
        toBase(item.quantity, item.unit),
    );

    const dimensions =
      pantryDims.get(item.ingredientId) ?? new Set<Dimension>();

    dimensions.add(dimension);
    pantryDims.set(item.ingredientId, dimensions);
  }

  const lines: ShoppingLine[] = [];

  for (const [ingredientKey, required] of needed) {
    const [ingredientId, dimension] =
      ingredientKey.split("|") as [string, Dimension];

    const stock = have.get(ingredientKey) ?? 0;
    const toBuy = Math.max(0, required - stock);

    if (round2(toBuy) === 0) continue;

    const flags: Flag[] = [];
    const dimensions = pantryDims.get(ingredientId);

    if (stock === 0 && dimensions && !dimensions.has(dimension)) {
      flags.push("pantry_unit_mismatch");
    }

    const costCents = estimateCostCents(
      ingredientId,
      dimension,
      toBuy,
      prices,
    );

    if (costCents === null) flags.push("no_price");

    lines.push({
      ingredientId,
      dimension,
      unit: BASE_UNIT[dimension],
      needed: round2(required),
      have: round2(stock),
      toBuy: round2(toBuy),
      costCents,
      flags,
    });
  }

  return {
    lines,
    knownTotalCents: lines.reduce(
      (total, line) => total + (line.costCents ?? 0),
      0,
    ),
    unknownPriceCount: lines.filter((line) => line.costCents === null).length,
  };
}
