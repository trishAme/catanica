import { describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { PLANTS, type PlantCategory } from "./plants";
import { ROOM_PLANT_POOLS, getWeightedRoomPlantIds } from "./roomPlantPools";

const plantCategoryById = new Map(PLANTS.map((plant) => [plant.id, plant.category]));

function expectIdsToMatchCategory(ids: readonly string[], category: PlantCategory): void {
  ids.forEach((id) => {
    expect(plantCategoryById.get(id)).toBe(category);
  });
}

describe("room plant pools", () => {
  it("defines a themed plant pool for every room", () => {
    LEVELS.forEach((level) => {
      expect(ROOM_PLANT_POOLS[level.id]).toBeDefined();
    });
  });

  it("keeps every room varied enough for the current five-treat goal", () => {
    LEVELS.forEach((level) => {
      expect(ROOM_PLANT_POOLS[level.id].edible.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("uses valid plant ids with matching safety categories", () => {
    Object.values(ROOM_PLANT_POOLS).forEach((pool) => {
      expectIdsToMatchCategory(pool.edible, "edible");
      expectIdsToMatchCategory(pool.neutral, "neutral");
      expectIdsToMatchCategory(pool.dangerous, "dangerous");
    });
  });

  it("weights each room toward its own theme", () => {
    expect(getWeightedRoomPlantIds(ROOM_PLANT_POOLS["window-bed"])).toContain("cat-grass");
    expect(getWeightedRoomPlantIds(ROOM_PLANT_POOLS["window-bed"])).toContain("rosemary");
    expect(getWeightedRoomPlantIds(ROOM_PLANT_POOLS.greenhouse)).toContain("lily");
    expect(getWeightedRoomPlantIds(ROOM_PLANT_POOLS.greenhouse)).toContain("sunflower");
    expect(getWeightedRoomPlantIds(ROOM_PLANT_POOLS["grandma-corner"])).toContain("aloe-vera");
    expect(getWeightedRoomPlantIds(ROOM_PLANT_POOLS["grandma-corner"])).toContain("ficus-benjamina");
    expect(ROOM_PLANT_POOLS["window-bed"].dangerous).not.toContain("lily");
  });
});
