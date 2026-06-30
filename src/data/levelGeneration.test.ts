import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { generateValidatedShelfLayout, createPlantPlan, TREATS_TO_WIN } from "./levelGeneration";
import { validateResolvedLevelLayout } from "./levelValidation";
import { PLANTS } from "./plants";
import { getRoomPlantPool } from "./roomPlantPools";

const plantById = new Map(PLANTS.map((plant) => [plant.id, plant]));

function countSlots(shelves: readonly { width: number }[], includeWindowSill: boolean): number {
  const shelfSlots = shelves.reduce(
    (sum, shelf) => sum + Math.max(2, Math.floor(shelf.width / 58)),
    0
  );

  return shelfSlots + (includeWindowSill ? 1 : 0);
}

describe("level generation", () => {
  it("generates valid, reachable shelf layouts across seeds", () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 160; seed += 1) {
        const shelves = generateValidatedShelfLayout(level, seed);
        const issues = validateResolvedLevelLayout(level, shelves);

        expect(issues, level.id + " seed " + seed).toEqual([]);
        expect(countSlots(shelves, level.id !== "desk-laptop" && level.id !== "greenhouse"), level.id + " seed " + seed).toBeGreaterThanOrEqual(TREATS_TO_WIN);
      }
    }
  });

  it("keeps generated plant plans winnable and room-themed", () => {
    for (const level of LEVELS) {
      const pool = getRoomPlantPool(level.id);
      const allowedIds = new Set([...pool.edible, ...pool.neutral, ...pool.dangerous]);

      for (let seed = 1; seed <= 40; seed += 1) {
        const shelves = generateValidatedShelfLayout(level, seed);
        const slotCount = countSlots(shelves, level.id !== "desk-laptop" && level.id !== "greenhouse");
        const plan = createPlantPlan(level.id, slotCount, seed);
        const edibleCount = plan.filter((id) => plantById.get(id)?.category === "edible").length;

        expect(plan, level.id + " seed " + seed).toHaveLength(slotCount);
        expect(edibleCount, level.id + " seed " + seed).toBeGreaterThanOrEqual(TREATS_TO_WIN);
        expect(plan.every((id) => allowedIds.has(id)), level.id + " seed " + seed).toBe(true);
      }
    }
  });

  it("repeats the same layout and plant plan for the same seed", () => {
    const level = LEVELS[1];

    expect(generateValidatedShelfLayout(level, 4242)).toEqual(generateValidatedShelfLayout(level, 4242));
    expect(createPlantPlan(level.id, 12, 4242)).toEqual(createPlantPlan(level.id, 12, 4242));
  });
});
