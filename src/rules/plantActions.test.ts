import { describe, expect, it } from "vitest";
import { PLANTS, type Plant, type PlantCategory } from "../data/plants";
import { resolvePlantAction } from "./plantActions";

function plantByCategory(category: PlantCategory): Plant {
  const plant = PLANTS.find((candidate) => candidate.category === category);

  if (!plant) {
    throw new Error(`Missing test plant for category: ${category}`);
  }

  return plant;
}

describe("resolvePlantAction", () => {
  it("includes common household additions in the expected safety categories", () => {
    expect(Object.fromEntries(PLANTS.map((plant) => [plant.id, plant.category]))).toMatchObject({
      "ficus-benjamina": "dangerous",
      rose: "neutral",
      rosemary: "neutral",
      sunflower: "neutral",
      lavender: "dangerous"
    });
  });

  it("awards one purr when the cat eats an edible plant", () => {
    const result = resolvePlantAction(plantByCategory("edible"), "eat");

    expect(result.outcome).toBe("gain-purr");
    expect(result.purrDelta).toBe(1);
    expect(result.removePlant).toBe(true);
    expect(result.isLoss).toBe(false);
  });

  it("removes an edible plant without reward when knocked down", () => {
    const result = resolvePlantAction(plantByCategory("edible"), "knock");

    expect(result.outcome).toBe("no-reward");
    expect(result.purrDelta).toBe(0);
    expect(result.removePlant).toBe(true);
  });

  it("does not reward eating a neutral plant", () => {
    const result = resolvePlantAction(plantByCategory("neutral"), "eat");

    expect(result.outcome).toBe("no-reward");
    expect(result.purrDelta).toBe(0);
    expect(result.removePlant).toBe(true);
    expect(result.isLoss).toBe(false);
  });

  it("removes a dangerous plant when knocked down", () => {
    const result = resolvePlantAction(plantByCategory("dangerous"), "knock");

    expect(result.outcome).toBe("remove-hazard");
    expect(result.purrDelta).toBe(0);
    expect(result.removePlant).toBe(true);
    expect(result.isLoss).toBe(false);
  });

  it("loses only when the cat eats a dangerous plant", () => {
    const result = resolvePlantAction(plantByCategory("dangerous"), "eat");

    expect(result.outcome).toBe("lose");
    expect(result.isLoss).toBe(true);
    expect(result.removePlant).toBe(false);
  });

  it("keeps sniff cards free of direct safety labels", () => {
    const forbiddenHints = /\b(edible|neutral|dangerous|safe|unsafe|toxic|non-toxic)\b/i;

    for (const plant of PLANTS) {
      const result = resolvePlantAction(plant, "sniff");

      expect(result.outcome).toBe("show-sniff-card");
      expect(result.revealCategory).toBe(false);
      expect(result.purrDelta).toBe(0);
      expect(result.removePlant).toBe(false);
      expect(result.isLoss).toBe(false);
      expect(result.body).not.toMatch(forbiddenHints);
    }
  });
});
