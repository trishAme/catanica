import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAT_COATS, CAT_EYE_PALETTES, CAT_PALETTES } from "../data/cats";
import { PLANTS } from "../data/plants";
import { CAT_FRAME_HEIGHT, CAT_FRAME_WIDTH, CAT_SPRITE_FRAMES } from "./catSprites";

const publicAssets = join(process.cwd(), "public", "assets");
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs") as {
  PNG: {
    sync: {
      read(buffer: Buffer): { width: number; height: number; data: Uint8Array };
    };
  };
};

function getPngSize(path: string): { width: number; height: number } {
  const png = PNG.sync.read(readFileSync(path));

  return { width: png.width, height: png.height };
}

function countNearColor(path: string, color: number, tolerance = 28): number {
  const png = PNG.sync.read(readFileSync(path));
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;
  let count = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const colorDistance = Math.abs(png.data[index] - red) + Math.abs(png.data[index + 1] - green) + Math.abs(png.data[index + 2] - blue);

    if (png.data[index + 3] > 0 && colorDistance <= tolerance) {
      count += 1;
    }
  }

  return count;
}

function getPngVisibleBounds(
  path: string,
  isVisiblePixel: (x: number, y: number, alpha: number) => boolean = (_x, _y, alpha) => alpha > 0
): { width: number; height: number; pixelCount: number } {
  const png = PNG.sync.read(readFileSync(path));
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let pixelCount = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(y * png.width + x) * 4 + 3];

      if (isVisiblePixel(x, y, alpha)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        pixelCount += 1;
      }
    }
  }

  return { width: maxX - minX + 1, height: maxY - minY + 1, pixelCount };
}

describe("pixel assets", () => {
  it("ships PNG cat spritesheets for every coat and eye variant", () => {
    CAT_COATS.forEach((coat) => {
      const eyeColors = Array.from(new Set(CAT_EYE_PALETTES[coat]));

      eyeColors.forEach((eyeColor) => {
        const path = join(publicAssets, "cats", coat + "-" + eyeColor + ".png");
        expect(existsSync(path)).toBe(true);
        expect(getPngSize(path)).toEqual({
          width: CAT_FRAME_WIDTH * CAT_SPRITE_FRAMES.length,
          height: CAT_FRAME_HEIGHT
        });
      });
    });
  });

  it("keeps every cat animation frame visible", () => {
    CAT_COATS.forEach((coat) => {
      const eyeColor = CAT_EYE_PALETTES[coat][0];
      const path = join(publicAssets, "cats", coat + "-" + eyeColor + ".png");

      CAT_SPRITE_FRAMES.forEach((frame, index) => {
        const bounds = getPngVisibleBounds(path, (x, _y, alpha) =>
          alpha > 0 && x >= index * CAT_FRAME_WIDTH && x < (index + 1) * CAT_FRAME_WIDTH
        );

        expect(bounds.pixelCount, coat + " " + frame).toBeGreaterThan(80);
      });
    });
  });

  it("keeps tail stripes limited to striped cat coats", () => {
    const stripedCoats = CAT_COATS.filter((coat) => CAT_PALETTES[coat].stripe);
    const plainCoats = CAT_COATS.filter((coat) => !CAT_PALETTES[coat].stripe);

    stripedCoats.forEach((coat) => {
      const path = join(publicAssets, "cats", coat + "-" + CAT_EYE_PALETTES[coat][0] + ".png");
      expect(countNearColor(path, CAT_PALETTES[coat].stripe!), coat).toBeGreaterThan(20);
    });

    plainCoats.forEach((coat) => {
      const path = join(publicAssets, "cats", coat + "-" + CAT_EYE_PALETTES[coat][0] + ".png");
      expect(CAT_PALETTES[coat].stripe).toBeUndefined();
      expect(countNearColor(path, 0x4f3a2d), coat).toBe(0);
    });
  });

  it("ships PNG plant assets for the plant database", () => {
    PLANTS.forEach((plant) => {
      const path = join(publicAssets, "plants", plant.id + ".png");
      expect(existsSync(path)).toBe(true);
      expect(getPngSize(path)).toEqual({ width: 92, height: 96 });
    });
  });

  it("keeps visible plant sprites in a comparable scale", () => {
    PLANTS.forEach((plant) => {
      const path = join(publicAssets, "plants", plant.id + ".png");
      const bounds = getPngVisibleBounds(path);
      const potBounds = getPngVisibleBounds(path, (_x, y, alpha) => y >= 64 && alpha > 0);

      expect(bounds.width, plant.id + " visible width").toBeGreaterThanOrEqual(45);
      expect(bounds.height, plant.id + " visible height").toBeGreaterThanOrEqual(66);
      expect(potBounds.width, plant.id + " pot width").toBeGreaterThanOrEqual(49);
      expect(potBounds.height, plant.id + " pot height").toBeGreaterThanOrEqual(31);
      expect(potBounds.pixelCount, plant.id + " pot density").toBeGreaterThanOrEqual(1080);
    });
  });

  it("ships PNG decor assets used by the scene", () => {
    const path = join(publicAssets, "decor", "kitchen-tea-set.png");
    expect(existsSync(path)).toBe(true);
    expect(getPngSize(path)).toEqual({ width: 150, height: 64 });
  });
});
