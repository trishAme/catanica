import type { LevelConfig, RectSpec } from "./levels";

export type ResolvedShelfSpec = {
  x: number;
  y: number;
  width: number;
};

export type LevelValidationIssue = {
  levelId: string;
  code: string;
  message: string;
};

type Surface = {
  id: string;
  top: number;
  left: number;
  right: number;
  kind: "floor" | "shelf" | "furniture";
};

const WORLD_WIDTH = 768;
const FLOOR_TOP = 400;
const SHELF_HEIGHT = 14;
const PLANT_VISUAL_HEIGHT = 54;
const HUD_RESERVED_BOTTOM = 88;
const CAT_VERTICAL_CLEARANCE = 58;
const MAX_VERTICAL_JUMP = 124;
const MAX_HORIZONTAL_JUMP = 160;
const WINDOW_X = 384;
const WINDOW_Y = 116;
const WINDOW_FRAME_WIDTH = 190;
const WINDOW_FRAME_HEIGHT = 132;
const WINDOW_INNER_HEIGHT = 110;
const WINDOW_CLEARANCE: RectSpec = {
  left: WINDOW_X - WINDOW_FRAME_WIDTH / 2 - 20,
  right: WINDOW_X + WINDOW_FRAME_WIDTH / 2 + 20,
  top: WINDOW_Y - WINDOW_FRAME_HEIGHT / 2 - 16,
  bottom: WINDOW_Y + WINDOW_FRAME_HEIGHT / 2 + 16
};
const WINDOW_SILL_TOP = WINDOW_Y + WINDOW_INNER_HEIGHT / 2 + 7;
const WINDOW_SILL_WIDTH = 208;
const OBJECT_CLEARANCE = 10;
const LAMP_CLEARANCE = 14;

export function validateLevelBlueprint(level: LevelConfig): LevelValidationIssue[] {
  const issues: LevelValidationIssue[] = [];
  const slotCount = level.shelves.reduce(
    (sum, shelf) => sum + shelf.centers.length * Math.max(2, Math.floor(shelf.width / 58)),
    0
  );

  if (slotCount < 9) {
    issues.push(createIssue(level, "plant-slots", "В комнате меньше 9 потенциальных мест под растения."));
  }

  const rows = [...level.shelves].sort((left, right) => right.y - left.y);

  if (rows.length === 0) {
    issues.push(createIssue(level, "shelves-empty", "В комнате нет полок."));
    return issues;
  }

  if (FLOOR_TOP - rows[0].y > MAX_VERTICAL_JUMP) {
    issues.push(createIssue(level, "first-row-unreachable", "Нижний ряд полок слишком высоко от пола."));
  }

  for (let index = 1; index < rows.length; index += 1) {
    const lower = rows[index - 1];
    const upper = rows[index];

    if (lower.y - upper.y > 72) {
      issues.push(createIssue(level, "row-gap", "Между рядами полок слишком большой вертикальный разрыв."));
    }

    upper.centers.forEach((center) => {
      const upperLeft = center - upper.width / 2;
      const upperRight = center + upper.width / 2;
      const nearestLowerGap = Math.min(
        ...lower.centers.map((lowerCenter) => {
          const lowerLeft = lowerCenter - lower.width / 2;
          const lowerRight = lowerCenter + lower.width / 2;

          return horizontalSpanGap(lowerLeft, lowerRight, upperLeft, upperRight);
        })
      );

      if (nearestLowerGap > MAX_HORIZONTAL_JUMP) {
        issues.push(createIssue(level, "row-bridge", "Полка слишком далеко от ближайшей нижней полки."));
      }
    });
  }

  level.decor?.lamps?.forEach((lamp) => {
    if (lamp.x < 0 || lamp.x > WORLD_WIDTH || lamp.shadeY < HUD_RESERVED_BOTTOM || lamp.shadeY > FLOOR_TOP) {
      issues.push(createIssue(level, "lamp-bounds", "Лампа в декор-конфиге выходит за игровую область."));
    }
  });

  level.decor?.shelfAvoidanceZones?.forEach((zone) => {
    if (zone.left >= zone.right || zone.top >= zone.bottom) {
      issues.push(createIssue(level, "decor-zone", "Зона избегания декора задана некорректно."));
    }
  });

  return issues;
}

export function validateResolvedLevelLayout(
  level: LevelConfig,
  shelves: readonly ResolvedShelfSpec[]
): LevelValidationIssue[] {
  const issues: LevelValidationIssue[] = [];
  const surfaces = createSurfaces(level, shelves);
  const reachable = findReachableSurfaceIds(surfaces);

  shelves.forEach((shelf, index) => {
    const shelfId = "shelf-" + index;

    if (shelf.x - shelf.width / 2 < 0 || shelf.x + shelf.width / 2 > WORLD_WIDTH) {
      issues.push(createIssue(level, "shelf-bounds", "Полка выходит за ширину комнаты."));
    }

    if (shelfIntersectsRect(shelf, WINDOW_CLEARANCE, false)) {
      issues.push(createIssue(level, "shelf-window", "Полка пересекает окно."));
    }

    if (shelfIntersectsRect(shelf, { left: 0, right: WORLD_WIDTH, top: 0, bottom: HUD_RESERVED_BOTTOM }, true)) {
      issues.push(createIssue(level, "shelf-ui", "Полка или растение пересекает верхний UI."));
    }

    if (level.decor?.shelfAvoidanceZones?.some((zone) => shelfIntersectsRect(shelf, zone, true))) {
      issues.push(createIssue(level, "shelf-decor", "Полка пересекает важный декор комнаты."));
    }

    if (getShelfObjectAvoidanceZones(level).some((zone) => shelfIntersectsRect(shelf, zone, false))) {
      issues.push(createIssue(level, "shelf-object", "Полка пересекает объект комнаты."));
    }

    if (!reachable.has(shelfId)) {
      issues.push(createIssue(level, "shelf-unreachable", "До одной из полок нельзя добраться прыжками."));
    }
  });

  for (let index = 0; index < shelves.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < shelves.length; otherIndex += 1) {
      if (shelvesOverlap(shelves[index], shelves[otherIndex])) {
        issues.push(createIssue(level, "shelf-overlap", "Две полки пересекаются или почти слипаются."));
      }
    }
  }

  surfaces
    .filter((surface) => surface.kind !== "floor")
    .forEach((upper) => {
      surfaces
        .filter((lower) => lower.top > upper.top && horizontalOverlap(upper, lower) > 10)
        .forEach((lower) => {
          const gap = lower.top - upper.top;

          if (gap > 0 && gap < CAT_VERTICAL_CLEARANCE) {
            issues.push(createIssue(level, "cat-clearance", "Между прыгательными поверхностями не пролезает кот."));
          }
        });
    });

  shelves.forEach((shelf) => {
    if (shelfBlocksFurnitureClearance(level, shelf)) {
      issues.push(createIssue(level, "furniture-clearance", "Полка слишком низко над мебелью."));
    }
  });

  return uniqueIssues(issues);
}

export function getShelfObjectAvoidanceZones(level: LevelConfig): RectSpec[] {
  const zones: RectSpec[] = [];

  level.furniture.forEach((item) => {
    const left = item.x - item.width / 2 - OBJECT_CLEARANCE;
    const right = item.x + item.width / 2 + OBJECT_CLEARANCE;
    const top = getFurnitureVisualTop(item.kind, item.y, item.height) - OBJECT_CLEARANCE;

    zones.push({ left, right, top, bottom: FLOOR_TOP + OBJECT_CLEARANCE });
  });

  level.decor?.lamps?.forEach((lamp) => {
    if (lamp.kind === "floor") {
      zones.push({
        left: lamp.x - 42,
        right: lamp.x + 42,
        top: lamp.shadeY + 4,
        bottom: FLOOR_TOP + LAMP_CLEARANCE
      });
      return;
    }

    zones.push({
      left: lamp.x - 30,
      right: lamp.x + 30,
      top: lamp.shadeY,
      bottom: lamp.shadeY + 56
    });
  });

  const spot = level.sleepSpot;

  if (spot.type === "laptop") {
    zones.push({ left: spot.catX - 126, right: spot.catX + 176, top: spot.catY - 34, bottom: FLOOR_TOP + 8 });
  } else if (spot.type === "hammock") {
    zones.push({ left: spot.catX - 76, right: spot.catX + 76, top: spot.catY - 48, bottom: spot.catY + 38 });
  } else {
    zones.push({ left: spot.catX - 72, right: spot.catX + 72, top: spot.catY - 34, bottom: FLOOR_TOP + 8 });
  }

  return zones;
}

function getFurnitureVisualTop(kind: LevelConfig["furniture"][number]["kind"], y: number, height: number): number {
  if (kind === "bed" || kind === "armchair") {
    return FLOOR_TOP - height;
  }

  if (kind === "sofa") {
    return y - height + 22;
  }

  if (kind === "tv-stand") {
    return y - height;
  }

  return y - height;
}

function createIssue(level: LevelConfig, code: string, message: string): LevelValidationIssue {
  return { levelId: level.id, code, message };
}

function shelfIntersectsRect(shelf: ResolvedShelfSpec, rect: RectSpec, includePlantSpace: boolean): boolean {
  const left = shelf.x - shelf.width / 2;
  const right = shelf.x + shelf.width / 2;
  const top = shelf.y - SHELF_HEIGHT / 2 - (includePlantSpace ? PLANT_VISUAL_HEIGHT : 0);
  const bottom = shelf.y + SHELF_HEIGHT / 2;

  return left < rect.right && right > rect.left && top < rect.bottom && bottom > rect.top;
}

function shelvesOverlap(leftShelf: ResolvedShelfSpec, rightShelf: ResolvedShelfSpec): boolean {
  const verticalOverlap = Math.abs(leftShelf.y - rightShelf.y) < SHELF_HEIGHT + 12;
  const leftA = leftShelf.x - leftShelf.width / 2;
  const rightA = leftShelf.x + leftShelf.width / 2;
  const leftB = rightShelf.x - rightShelf.width / 2;
  const rightB = rightShelf.x + rightShelf.width / 2;

  return verticalOverlap && leftA < rightB + 24 && rightA > leftB - 24;
}

function shelfBlocksFurnitureClearance(level: LevelConfig, shelf: ResolvedShelfSpec): boolean {
  const shelfLeft = shelf.x - shelf.width / 2;
  const shelfRight = shelf.x + shelf.width / 2;
  const shelfBottom = shelf.y + SHELF_HEIGHT / 2;

  return level.furniture.some((item) => {
    const furnitureLeft = item.x - item.width / 2;
    const furnitureRight = item.x + item.width / 2;
    const furnitureTop = item.kind === "bed" ? FLOOR_TOP - item.height : item.y;
    const verticalGap = furnitureTop - shelfBottom;
    const overlapsHorizontally =
      shelfLeft < furnitureRight - 6 && shelfRight > furnitureLeft + 6;

    if (!overlapsHorizontally) {
      return false;
    }

    if (item.kind === "bed") {
      return shelfBottom > furnitureTop - CAT_VERTICAL_CLEARANCE;
    }

    return verticalGap >= 0 && verticalGap < CAT_VERTICAL_CLEARANCE;
  });
}

function createSurfaces(level: LevelConfig, shelves: readonly ResolvedShelfSpec[]): Surface[] {
  const surfaces: Surface[] = [
    { id: "floor", top: FLOOR_TOP, left: 0, right: WORLD_WIDTH, kind: "floor" }
  ];

  shelves.forEach((shelf, index) => {
    surfaces.push({
      id: "shelf-" + index,
      top: shelf.y - SHELF_HEIGHT / 2,
      left: shelf.x - shelf.width / 2,
      right: shelf.x + shelf.width / 2,
      kind: "shelf"
    });
  });

  level.furniture.forEach((item, index) => {
    const platformTop = item.kind === "bed" ? FLOOR_TOP - 48 : item.y;
    surfaces.push({
      id: "furniture-" + index,
      top: platformTop,
      left: item.x - item.width / 2,
      right: item.x + item.width / 2,
      kind: "furniture"
    });

    if (item.kind === "sofa") {
      surfaces.push({
        id: "furniture-" + index + "-back",
        top: getFurnitureVisualTop(item.kind, item.y, item.height),
        left: item.x - item.width / 2 + 20,
        right: item.x + item.width / 2 - 20,
        kind: "furniture"
      });
    }
  });

  if (level.sleepSpot.type === "laptop") {
    surfaces.push({
      id: "desk",
      top: level.sleepSpot.catY + 17,
      left: level.sleepSpot.catX - 105,
      right: level.sleepSpot.catX + 105,
      kind: "furniture"
    });
  }

  if (level.id !== "desk-laptop" && level.id !== "greenhouse") {
    surfaces.push({
      id: "window-sill",
      top: WINDOW_SILL_TOP,
      left: WINDOW_X - WINDOW_SILL_WIDTH / 2,
      right: WINDOW_X + WINDOW_SILL_WIDTH / 2,
      kind: "furniture"
    });
  }

  return surfaces;
}

function findReachableSurfaceIds(surfaces: readonly Surface[]): Set<string> {
  const reachable = new Set<string>(["floor"]);
  let changed = true;

  while (changed) {
    changed = false;

    surfaces.forEach((target) => {
      if (reachable.has(target.id)) {
        return;
      }

      const canReach = surfaces.some((source) => {
        if (!reachable.has(source.id) || source.top <= target.top) {
          return false;
        }

        return source.top - target.top <= MAX_VERTICAL_JUMP && horizontalGap(source, target) <= MAX_HORIZONTAL_JUMP;
      });

      if (canReach) {
        reachable.add(target.id);
        changed = true;
      }
    });
  }

  return reachable;
}

function horizontalSpanGap(leftA: number, rightA: number, leftB: number, rightB: number): number {
  if (rightA < leftB) {
    return leftB - rightA;
  }

  if (rightB < leftA) {
    return leftA - rightB;
  }

  return 0;
}

function horizontalGap(left: Surface, right: Surface): number {
  if (left.right < right.left) {
    return right.left - left.right;
  }

  if (right.right < left.left) {
    return left.left - right.right;
  }

  return 0;
}

function horizontalOverlap(left: Surface, right: Surface): number {
  return Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
}

function uniqueIssues(issues: LevelValidationIssue[]): LevelValidationIssue[] {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = issue.levelId + ":" + issue.code + ":" + issue.message;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
