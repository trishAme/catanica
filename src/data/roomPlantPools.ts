export type RoomPlantPool = {
  edible: readonly string[];
  neutral: readonly string[];
  dangerous: readonly string[];
};

export const ROOM_PLANT_POOLS: Record<string, RoomPlantPool> = {
  "window-bed": {
    edible: ["cat-grass", "oat-grass", "wheat-grass"],
    neutral: ["spider-plant", "rosemary"],
    dangerous: ["aloe-vera", "pothos"]
  },
  "desk-laptop": {
    edible: ["oat-grass", "wheat-grass", "barley-grass"],
    neutral: ["spider-plant", "boston-fern", "rosemary"],
    dangerous: ["snake-plant", "pothos", "ficus-benjamina"]
  },
  "cat-hammock": {
    edible: ["cat-grass", "wheat-grass", "barley-grass"],
    neutral: ["spider-plant", "moth-orchid", "rose", "sunflower"],
    dangerous: ["pothos", "snake-plant", "ficus-benjamina"]
  },
  bedroom: {
    edible: ["cat-grass", "oat-grass", "barley-grass"],
    neutral: ["moth-orchid", "spider-plant", "rose"],
    dangerous: ["snake-plant", "pothos", "lavender"]
  },
  greenhouse: {
    edible: ["cat-grass", "oat-grass", "wheat-grass", "barley-grass"],
    neutral: ["boston-fern", "moth-orchid", "spider-plant", "rose", "sunflower", "rosemary"],
    dangerous: ["lily", "aloe-vera", "pothos", "snake-plant", "ficus-benjamina", "lavender"]
  },
  "grandma-corner": {
    edible: ["barley-grass", "wheat-grass", "oat-grass"],
    neutral: ["boston-fern", "moth-orchid", "rose"],
    dangerous: ["lily", "aloe-vera", "snake-plant", "pothos", "ficus-benjamina", "lavender"]
  }
};

export function getRoomPlantPool(levelId: string): RoomPlantPool {
  return ROOM_PLANT_POOLS[levelId] ?? ROOM_PLANT_POOLS["window-bed"];
}

export function getWeightedRoomPlantIds(pool: RoomPlantPool): string[] {
  return [
    ...pool.edible,
    ...pool.edible,
    ...pool.neutral,
    ...pool.dangerous,
    ...pool.dangerous
  ];
}
