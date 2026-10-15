import { describe, expect, it } from "vitest";
import { buildShoppingList } from "../lib/shopping-list";
import type { Recipe } from "../lib/shopping-list";
import type { PriceRecord } from "../lib/cost-calculator";

const riceRecipe = (
  id: string,
  quantity: number,
  servings = 2,
): Recipe => ({
  id,
  defaultServings: 2,
  ingredients: [{ ingredientId: "rice", quantity, unit: "g" }],
});

const ricePrice: PriceRecord = {
  ingredientId: "rice",
  priceCents: 300,
  quantity: 1000,
  unit: "g",
};

describe("buildShoppingList", () => {
  it("combines the same ingredient across multiple meals", () => {
    const result = buildShoppingList(
      [
        { recipe: riceRecipe("a", 200), servings: 2 },
        { recipe: riceRecipe("b", 300), servings: 2 },
      ],
      [],
      [ricePrice],
    );

    expect(result.lines[0].needed).toBe(500);
    expect(result.lines[0].toBuy).toBe(500);
  });

  it("scales ingredients for the planned serving count", () => {
    const result = buildShoppingList(
      [{ recipe: riceRecipe("a", 200), servings: 4 }],
      [],
      [ricePrice],
    );

    expect(result.lines[0].needed).toBe(400);
  });

  it("subtracts pantry stock from the total requirement", () => {
    const result = buildShoppingList(
      [{ recipe: riceRecipe("a", 500), servings: 2 }],
      [{ ingredientId: "rice", quantity: 200, unit: "g" }],
      [ricePrice],
    );

    expect(result.lines[0].toBuy).toBe(300);
  });

  it("omits ingredients already fully covered by the pantry", () => {
    const result = buildShoppingList(
      [{ recipe: riceRecipe("a", 200), servings: 2 }],
      [{ ingredientId: "rice", quantity: 300, unit: "g" }],
      [ricePrice],
    );

    expect(result.lines).toHaveLength(0);
  });

  it("converts kilograms to grams", () => {
    const result = buildShoppingList(
      [{ recipe: riceRecipe("a", 1500), servings: 2 }],
      [{ ingredientId: "rice", quantity: 1, unit: "kg" }],
      [ricePrice],
    );

    expect(result.lines[0].toBuy).toBe(500);
  });

  it("flags incompatible pantry dimensions", () => {
    const result = buildShoppingList(
      [{
        recipe: {
          id: "soup",
          defaultServings: 2,
          ingredients: [{ ingredientId: "rice", quantity: 200, unit: "g" }],
        },
        servings: 2,
      }],
      [{ ingredientId: "rice", quantity: 1, unit: "l" }],
      [ricePrice],
    );

    expect(result.lines[0].flags).toContain("pantry_unit_mismatch");
  });

  it("marks ingredients without a compatible price", () => {
    const result = buildShoppingList(
      [{ recipe: riceRecipe("a", 200), servings: 2 }],
      [],
      [],
    );

    expect(result.lines[0].costCents).toBeNull();
    expect(result.unknownPriceCount).toBe(1);
  });

  it("calculates and rounds the proportional cost", () => {
    const result = buildShoppingList(
      [{ recipe: riceRecipe("a", 250), servings: 2 }],
      [],
      [ricePrice],
    );

    expect(result.lines[0].costCents).toBe(75);
    expect(result.knownTotalCents).toBe(75);
  });

  it("rejects invalid serving counts", () => {
    expect(() =>
      buildShoppingList(
        [{ recipe: riceRecipe("a", 200), servings: 0 }],
        [],
        [ricePrice],
      ),
    ).toThrow("Invalid servings");
  });
});
