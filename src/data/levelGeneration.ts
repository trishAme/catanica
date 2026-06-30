import type { LevelConfig, RectSpec } from "./levels";
import { getRoomPlantPool, getWeightedRoomPlantIds } from "./roomPlantPools";
import { validateResolvedLevelLayout, type ResolvedShelfSpec } from "./levelValidation";

const WORLD_WIDTH = 768;
const SHELF_HEIGHT = 14;
const PLANT_VISUAL_HEIGHT = 54;
const HUD_RESERVED_BOTTOM = 88;
const CAT_VERTICAL_CLEARANCE = 58;
const WINDOW_X = 384;
const WINDOW_Y = 116;
const WINDOW_FRAME_WIDTH = 190;
const WINDOW_FRAME_HEIGHT = 132;
const WINDOW_INNER_HEIGHT = 110;
const WINDOW_SILL_TOP = WINDOW_Y + WINDOW_INNER_HEIGHT / 2 + 7;
const WINDOW_SILL_WIDTH = 208;

const WINDOW_CLEARANCE: RectSpec = {
  left: WINDOW_X - WINDOW_FRAME_WIDTH / 2 - 20,
  right: WINDOW_X + WINDOW_FRAME_WIDTH / 2 + 20,
  top: WINDOW_Y - WINDOW_FRAME_HEIGHT / 2 - 16,
  bottom: WINDOW_Y + WINDOW_FRAME_HEIGHT / 2 + 16
};

export const TREATS_TO_WIN = 5;

type RandomSource = {
  integerInRange(min: number, max: number): number;
};

export function createPlantPlan(
  levelId: string,
  slotCount: number,
  seed: number,
  treatsToWin = TREATS_TO_WIN
): string[] {
  const random = createRandomSource(levelId + ":plants:" + seed.toString());
  const roomPool = getRoomPlantPool(levelId);
  const guaranteedCount = Math.min(treatsToWin, slotCount);
  const startOffset = random.integerInRange(0, roomPool.edible.length - 1);
  const guaranteedEdible = Array.from({ length: guaranteedCount }, (_, index) =>
    roomPool.edible[(startOffset + index) % roomPool.edible.length]
  );
  const weightedPool = getWeightedRoomPlantIds(roomPool);
  const dangerousPool = [...roomPool.dangerous];
  const remaining = Array.from(
    { length: Math.max(0, slotCount - guaranteedEdible.length) },
    (_, index) => randomItem(random, index % 5 === 0 ? dangerousPool : weightedPool)
  );

  return shuffleWithRandom(random, [...guaranteedEdible, ...remaining]);
}

export function generateValidatedShelfLayout(level: LevelConfig, seed: number): ResolvedShelfSpec[] {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const shelves = generateShelfSpecs(level, seed + attempt);

    if (validateResolvedLevelLayout(level, shelves).length === 0) {
      return shelves;
    }
  }

  const fallback = getDeterministicShelfFallback(level);

  if (validateResolvedLevelLayout(level, fallback).length === 0) {
    return fallback;
  }

  return fallback;
}

function generateShelfSpecs(level: LevelConfig, seed: number): ResolvedShelfSpec[] {
  const random = createRandomSource(level.id + ":shelves:" + seed.toString());
  const shelves: ResolvedShelfSpec[] = [];

  level.shelves.forEach((row) => {
    row.centers.forEach((center) => {
      const width = row.width + random.integerInRange(-24, 28);
      const x = clamp(
        center + random.integerInRange(-28, 28),
        width / 2 + 18,
        WORLD_WIDTH - width / 2 - 18
      );
      const y = row.y + random.integerInRange(-3, 3);
      const shelf = keepShelfClearOfWindow({ x, y, width }, shelves);

      if (
        !shelfOverlapsWindow(shelf) &&
        !shelfOverlapsReservedUi(shelf) &&
        !shelfOverlapsWallDecor(level, shelf) &&
        !shelfOverlapsRoomObject(level, shelf) &&
        !shelfBlocksWindowSillClearance(level, shelf) &&
        !shelfBlocksFurnitureClearance(level, shelf) &&
        !shelfOverlapsAnyShelf(shelf, shelves)
      ) {
        shelves.push(shelf);
      }
    });
  });

  return ensureReachableShelves(level, shelves);
}

function getDeterministicShelfFallback(level: LevelConfig): ResolvedShelfSpec[] {
  const curatedFallbacks: Record<string, ResolvedShelfSpec[]> = {
    "desk-laptop": [
      { x: 148, y: 216, width: 132 },
      { x: 156, y: 156, width: 132 },
      { x: 622, y: 282, width: 132 },
      { x: 602, y: 216, width: 132 },
      { x: 650, y: 156, width: 132 }
    ],
    "cat-hammock": [
      { x: 390, y: 310, width: 184 },
      { x: 250, y: 244, width: 176 },
      { x: 528, y: 244, width: 176 },
      { x: 396, y: 176, width: 166 },
      { x: 650, y: 176, width: 166 }
    ]
  };
  const curated = curatedFallbacks[level.id];

  if (curated && validateResolvedLevelLayout(level, curated).length === 0) {
    return curated;
  }

  return ensureReachableShelves(
    level,
    level.shelves.flatMap((row) =>
      row.centers.map((center) => ({ x: center, y: row.y, width: row.width }))
    ).filter((shelf, index, shelves) =>
      !shelfOverlapsWindow(shelf) &&
      !shelfOverlapsReservedUi(shelf) &&
      !shelfOverlapsWallDecor(level, shelf) &&
      !shelfOverlapsRoomObject(level, shelf) &&
      !shelfBlocksWindowSillClearance(level, shelf) &&
      !shelfBlocksFurnitureClearance(level, shelf) &&
      !shelfOverlapsAnyShelf(shelf, shelves.slice(0, index))
    )
  );
}

function ensureReachableShelves(level: LevelConfig, shelves: ResolvedShelfSpec[]): ResolvedShelfSpec[] {
  const requiredShelvesByLevel: Record<string, ResolvedShelfSpec[]> = {
    "desk-laptop": [
      { x: 148, y: 216, width: 132 },
      { x: 156, y: 156, width: 132 },
      { x: 622, y: 282, width: 132 },
      { x: 602, y: 216, width: 132 },
      { x: 650, y: 156, width: 132 }
    ],
    "cat-hammock": [
      { x: 390, y: 310, width: 184 },
      { x: 250, y: 244, width: 176 },
      { x: 528, y: 244, width: 176 },
      { x: 396, y: 176, width: 166 },
      { x: 650, y: 176, width: 166 }
    ]
  };
  const requiredShelves = requiredShelvesByLevel[level.id];

  if (!requiredShelves) {
    return shelves;
  }

  requiredShelves.forEach((required) => {
    const hasNearbyShelf = shelves.some(
      (shelf) => Math.abs(shelf.x - required.x) <= 46 && Math.abs(shelf.y - required.y) <= 16
    );
    const canAddRequiredShelf =
      !shelfOverlapsWindow(required) &&
      !shelfOverlapsReservedUi(required) &&
      !shelfOverlapsWallDecor(level, required) &&
      !shelfOverlapsRoomObject(level, required) &&
      !shelfBlocksWindowSillClearance(level, required) &&
      !shelfBlocksFurnitureClearance(level, required) &&
      !shelfOverlapsAnyShelf(required, shelves);

    if (!hasNearbyShelf && canAddRequiredShelf) {
      shelves.push(required);
    }
  });

  return shelves;
}

function keepShelfClearOfWindow(
  shelf: ResolvedShelfSpec,
  existingShelves: ResolvedShelfSpec[] = []
): ResolvedShelfSpec {
  if (!shelfOverlapsWindow(shelf)) {
    return shelf;
  }

  const leftCandidate = {
    ...shelf,
    x: clamp(WINDOW_CLEARANCE.left - shelf.width / 2 - 16, shelf.width / 2 + 18, WORLD_WIDTH - shelf.width / 2 - 18)
  };
  const rightCandidate = {
    ...shelf,
    x: clamp(WINDOW_CLEARANCE.right + shelf.width / 2 + 16, shelf.width / 2 + 18, WORLD_WIDTH - shelf.width / 2 - 18)
  };
  const candidates = [leftCandidate, rightCandidate].filter(
    (candidate) => !shelfOverlapsWindow(candidate) && !shelfOverlapsAnyShelf(candidate, existingShelves)
  );

  return candidates.sort((left, right) => Math.abs(left.x - shelf.x) - Math.abs(right.x - shelf.x))[0] ?? shelf;
}

function shelfOverlapsWindow(shelf: ResolvedShelfSpec): boolean {
  return shelfBodyIntersectsRect(shelf, WINDOW_CLEARANCE);
}

function shelfOverlapsReservedUi(shelf: ResolvedShelfSpec): boolean {
  return shelfVisualIntersectsRect(shelf, { left: 0, right: WORLD_WIDTH, top: 0, bottom: HUD_RESERVED_BOTTOM });
}

function shelfOverlapsWallDecor(level: LevelConfig, shelf: ResolvedShelfSpec): boolean {
  return (level.decor?.shelfAvoidanceZones ?? []).some((zone) => shelfVisualIntersectsRect(shelf, zone));
}

function shelfOverlapsRoomObject(level: LevelConfig, shelf: ResolvedShelfSpec): boolean {
  return getShelfObjectAvoidanceZonesForGeneration(level).some((zone) => shelfBodyIntersectsRect(shelf, zone));
}

function getShelfObjectAvoidanceZonesForGeneration(level: LevelConfig): RectSpec[] {
  const zones: RectSpec[] = [];

  level.furniture.forEach((item) => {
    const left = item.x - item.width / 2 - 10;
    const right = item.x + item.width / 2 + 10;
    const top = getFurnitureVisualTop(item.kind, item.y, item.height) - 10;

    zones.push({ left, right, top, bottom: 410 });
  });

  level.decor?.lamps?.forEach((lamp) => {
    if (lamp.kind === "floor") {
      zones.push({ left: lamp.x - 42, right: lamp.x + 42, top: lamp.shadeY + 4, bottom: 414 });
      return;
    }

    zones.push({ left: lamp.x - 30, right: lamp.x + 30, top: lamp.shadeY, bottom: lamp.shadeY + 56 });
  });

  const spot = level.sleepSpot;

  if (spot.type === "laptop") {
    zones.push({ left: spot.catX - 126, right: spot.catX + 176, top: spot.catY - 34, bottom: 408 });
  } else if (spot.type === "hammock") {
    zones.push({ left: spot.catX - 76, right: spot.catX + 76, top: spot.catY - 48, bottom: spot.catY + 38 });
  } else {
    zones.push({ left: spot.catX - 72, right: spot.catX + 72, top: spot.catY - 34, bottom: 408 });
  }

  return zones;
}

function shelfBodyIntersectsRect(shelf: ResolvedShelfSpec, rect: RectSpec): boolean {
  const shelfLeft = shelf.x - shelf.width / 2;
  const shelfRight = shelf.x + shelf.width / 2;
  const shelfTop = shelf.y - SHELF_HEIGHT / 2;
  const shelfBottom = shelf.y + SHELF_HEIGHT / 2;

  return shelfLeft < rect.right && shelfRight > rect.left && shelfTop < rect.bottom && shelfBottom > rect.top;
}

function shelfVisualIntersectsRect(shelf: ResolvedShelfSpec, rect: RectSpec): boolean {
  const shelfLeft = shelf.x - shelf.width / 2;
  const shelfRight = shelf.x + shelf.width / 2;
  const shelfTop = shelf.y - SHELF_HEIGHT / 2 - PLANT_VISUAL_HEIGHT;
  const shelfBottom = shelf.y + SHELF_HEIGHT / 2;

  return shelfLeft < rect.right && shelfRight > rect.left && shelfTop < rect.bottom && shelfBottom > rect.top;
}

function shelfOverlapsAnyShelf(shelf: ResolvedShelfSpec, shelves: ResolvedShelfSpec[]): boolean {
  return shelves.some((otherShelf) => shelvesOverlap(shelf, otherShelf));
}

function shelvesOverlap(leftShelf: ResolvedShelfSpec, rightShelf: ResolvedShelfSpec): boolean {
  const verticalOverlap = Math.abs(leftShelf.y - rightShelf.y) < SHELF_HEIGHT + 12;
  const leftA = leftShelf.x - leftShelf.width / 2;
  const rightA = leftShelf.x + leftShelf.width / 2;
  const leftB = rightShelf.x - rightShelf.width / 2;
  const rightB = rightShelf.x + rightShelf.width / 2;

  return verticalOverlap && leftA < rightB + 24 && rightA > leftB - 24;
}

function shelfBlocksWindowSillClearance(level: LevelConfig, shelf: ResolvedShelfSpec): boolean {
  if (level.id === "desk-laptop" || level.id === "greenhouse") {
    return false;
  }

  const shelfTop = shelf.y - SHELF_HEIGHT / 2;
  const shelfLeft = shelf.x - shelf.width / 2;
  const shelfRight = shelf.x + shelf.width / 2;
  const sillLeft = WINDOW_X - WINDOW_SILL_WIDTH / 2;
  const sillRight = WINDOW_X + WINDOW_SILL_WIDTH / 2;
  const horizontalOverlap = Math.max(0, Math.min(shelfRight, sillRight) - Math.max(shelfLeft, sillLeft));
  const verticalGap = shelfTop - WINDOW_SILL_TOP;

  return horizontalOverlap > 10 && verticalGap > 0 && verticalGap < CAT_VERTICAL_CLEARANCE;
}

function shelfBlocksFurnitureClearance(level: LevelConfig, shelf: ResolvedShelfSpec): boolean {
  const shelfLeft = shelf.x - shelf.width / 2;
  const shelfRight = shelf.x + shelf.width / 2;
  const shelfBottom = shelf.y + SHELF_HEIGHT / 2;

  return level.furniture.some((item) => {
    const furnitureLeft = item.x - item.width / 2;
    const furnitureRight = item.x + item.width / 2;
    const furnitureTop = item.kind === "bed" ? 400 - item.height : item.y;
    const verticalGap = furnitureTop - shelfBottom;
    const overlapsHorizontally = shelfLeft < furnitureRight - 6 && shelfRight > furnitureLeft + 6;

    if (!overlapsHorizontally) {
      return false;
    }

    if (item.kind === "bed") {
      return shelfBottom > furnitureTop - CAT_VERTICAL_CLEARANCE;
    }

    return verticalGap >= 0 && verticalGap < CAT_VERTICAL_CLEARANCE;
  });
}

function getFurnitureVisualTop(kind: LevelConfig["furniture"][number]["kind"], y: number, height: number): number {
  if (kind === "bed" || kind === "armchair") {
    return 400 - height;
  }

  if (kind === "sofa") {
    return y - height + 22;
  }

  return y - height;
}

function createRandomSource(seedText: string): RandomSource {
  let state = hashSeed(seedText) || 0x9e3779b9;

  return {
    integerInRange(min: number, max: number): number {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return min + (state % (max - min + 1));
    }
  };
}

function hashSeed(seedText: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function randomItem<T>(random: RandomSource, items: readonly T[]): T {
  return items[random.integerInRange(0, items.length - 1)];
}

function shuffleWithRandom<T>(random: RandomSource, items: readonly T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.integerInRange(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
