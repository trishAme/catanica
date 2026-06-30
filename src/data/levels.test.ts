import { describe, expect, it } from "vitest";
import { validateLevelBlueprint, validateResolvedLevelLayout } from "./levelValidation";
import { LEVELS, getLevel } from "./levels";

describe("levels", () => {
  it("defines six playable rooms", () => {
    expect(LEVELS).toHaveLength(6);
    expect(getLevel(0).id).toBe(LEVELS[0].id);
    expect(getLevel(6).id).toBe(LEVELS[0].id);
  });

  it("keeps every configured level blueprint valid", () => {
    LEVELS.forEach((level) => {
      expect(validateLevelBlueprint(level)).toEqual([]);
    });
  });

  it("keeps enough shelf slots for the plant pool", () => {
    for (const level of LEVELS) {
      const slotCount = level.shelves.reduce(
        (sum, shelf) => sum + shelf.centers.length * Math.max(2, Math.floor(shelf.width / 58)),
        0
      );

      expect(slotCount).toBeGreaterThanOrEqual(9);
    }
  });

  it("keeps shelf rows reachable by jump steps", () => {
    const maxVerticalJump = 124;
    const maxRowGap = 72;
    const maxHorizontalBridge = 160;

    for (const level of LEVELS) {
      const rows = [...level.shelves].sort((left, right) => right.y - left.y);

      expect(400 - rows[0].y).toBeLessThanOrEqual(maxVerticalJump);

      for (let index = 1; index < rows.length; index += 1) {
        const lower = rows[index - 1];
        const upper = rows[index];

        expect(lower.y - upper.y).toBeLessThanOrEqual(maxRowGap);

        upper.centers.forEach((center) => {
          const upperLeft = center - upper.width / 2;
          const upperRight = center + upper.width / 2;
          const nearestLowerGap = Math.min(
            ...lower.centers.map((lowerCenter) => {
              const lowerLeft = lowerCenter - lower.width / 2;
              const lowerRight = lowerCenter + lower.width / 2;

              if (lowerRight < upperLeft) {
                return upperLeft - lowerRight;
              }

              if (upperRight < lowerLeft) {
                return lowerLeft - upperRight;
              }

              return 0;
            })
          );

          expect(nearestLowerGap).toBeLessThanOrEqual(maxHorizontalBridge);
        });
      }
    }
  });

  it("treats the office sofa back as a real jump step", () => {
    const office = LEVELS.find((level) => level.id === "desk-laptop");
    const officeRoute = [
      { x: 148, y: 216, width: 132 },
      { x: 156, y: 156, width: 132 },
      { x: 622, y: 282, width: 132 },
      { x: 602, y: 216, width: 132 },
      { x: 650, y: 156, width: 132 }
    ];

    expect(office).toBeDefined();
    expect(validateResolvedLevelLayout(office!, officeRoute).map((issue) => issue.code)).not.toContain("shelf-unreachable");

    const officeWithoutSofa = { ...office!, furniture: [] };

    expect(validateResolvedLevelLayout(officeWithoutSofa, officeRoute).map((issue) => issue.code)).toContain("shelf-unreachable");
  });

  it("detects invalid resolved shelf layouts", () => {
    const level = LEVELS[0];
    const issues = validateResolvedLevelLayout(level, [
      { x: 384, y: 116, width: 170 },
      { x: 386, y: 126, width: 170 }
    ]);
    const codes = issues.map((issue) => issue.code);

    expect(codes).toContain("shelf-window");
    expect(codes).toContain("shelf-overlap");
    expect(codes).toContain("cat-clearance");
  });

  it("keeps living-room shelves clear of the television", () => {
    const livingRoom = LEVELS.find((level) => level.id === "cat-hammock");

    expect(livingRoom).toBeDefined();
    const tvOverlapCodes = validateResolvedLevelLayout(livingRoom!, [
      { x: 622, y: 310, width: 184 }
    ]).map((issue) => issue.code);

    expect(tvOverlapCodes).toContain("shelf-decor");
    expect(tvOverlapCodes).toContain("shelf-object");
    const routeWithoutTvScreen = validateResolvedLevelLayout(livingRoom!, [
      { x: 390, y: 310, width: 184 },
      { x: 528, y: 244, width: 176 },
      { x: 650, y: 176, width: 166 }
    ]).map((issue) => issue.code);

    expect(routeWithoutTvScreen).not.toContain("shelf-decor");
    expect(routeWithoutTvScreen).not.toContain("shelf-unreachable");
  });

  it("detects shelves crossing room objects", () => {
    const office = LEVELS.find((level) => level.id === "desk-laptop");

    expect(office).toBeDefined();
    expect(validateResolvedLevelLayout(office!, [
      { x: 104, y: 282, width: 160 }
    ]).map((issue) => issue.code)).toContain("shelf-object");
  });

  it("keeps greenhouse shelves clear of the glass door", () => {
    const greenhouse = LEVELS.find((level) => level.id === "greenhouse");

    expect(greenhouse).toBeDefined();
    expect(validateResolvedLevelLayout(greenhouse!, [
      { x: 384, y: 250, width: 150 }
    ]).map((issue) => issue.code)).toContain("shelf-decor");
  });

  it("keeps bedroom shelves clear of the bedside lamp", () => {
    const bedroom = LEVELS.find((level) => level.id === "bedroom");

    expect(bedroom).toBeDefined();
    expect(validateResolvedLevelLayout(bedroom!, [
      { x: 330, y: 312, width: 176 }
    ]).map((issue) => issue.code)).toContain("shelf-decor");
  });

  it("keeps bedroom shelves from crossing the bed", () => {
    const bedroom = LEVELS.find((level) => level.id === "bedroom");

    expect(bedroom).toBeDefined();
    expect(validateResolvedLevelLayout(bedroom!, [
      { x: 260, y: 244, width: 182 }
    ]).map((issue) => issue.code)).toContain("furniture-clearance");
  });

  it("keeps the office shelves reachable from both sides of the room", () => {
    const office = LEVELS.find((level) => level.id === "desk-laptop");

    expect(office).toBeDefined();
    expect(office?.shelves).toHaveLength(3);

    const rows = [...office!.shelves].sort((left, right) => right.y - left.y);

    rows.forEach((row) => {
      expect(row.centers.length).toBeGreaterThanOrEqual(2);
      expect(Math.min(...row.centers)).toBeLessThan(180);
      expect(Math.max(...row.centers)).toBeGreaterThan(580);
    });

    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1].y - rows[index].y).toBeLessThanOrEqual(70);
    }
  });
});
