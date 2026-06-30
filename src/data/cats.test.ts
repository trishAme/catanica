import { describe, expect, it } from "vitest";
import { CAT_COATS, CAT_EYE_PALETTES, createCatVariant } from "./cats";

describe("createCatVariant", () => {
  it("generates eye colors from the selected coat palette", () => {
    for (const coat of CAT_COATS) {
      const variant = createCatVariant(coat, () => 0);

      expect(variant.coat).toBe(coat);
      expect(CAT_EYE_PALETTES[coat]).toContain(variant.eyeColor);
    }
  });

  it("keeps the generated eye color stable in the returned variant", () => {
    const variant = createCatVariant("white", () => 0.99);

    expect(variant).toEqual({
      coat: "white",
      eyeColor: "odd"
    });
  });
});
