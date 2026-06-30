import Phaser from "phaser";
import {
  CAT_PALETTES,
  EYE_COLORS,
  type CatVariant
} from "../data/cats";

export const CAT_FRAME_WIDTH = 128;
export const CAT_FRAME_HEIGHT = 96;

export const CAT_SPRITE_FRAMES = [
  "idle",
  "walk-a",
  "walk-b",
  "jump",
  "sniff",
  "eat",
  "knock",
  "angry",
  "sleep",
  "tail-flick",
  "ear-twitch",
  "loaf",
  "suspicious",
  "land"
] as const;

export type CatSpriteFrame = (typeof CAT_SPRITE_FRAMES)[number];

export function getCatSpritesheetKey(variant: CatVariant): string {
  return "cat-sheet-" + variant.coat + "-" + variant.eyeColor;
}

export function ensureCatSpritesheet(
  scene: Phaser.Scene,
  variant: CatVariant
): string {
  const key = getCatSpritesheetKey(variant);

  if (scene.textures.exists(key)) {
    addCatFrameNames(scene, key);
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  CAT_SPRITE_FRAMES.forEach((frame, index) => {
    drawCatFrame(graphics, variant, frame, index * CAT_FRAME_WIDTH, 0);
  });

  graphics.generateTexture(
    key,
    CAT_FRAME_WIDTH * CAT_SPRITE_FRAMES.length,
    CAT_FRAME_HEIGHT
  );
  graphics.destroy();

  addCatFrameNames(scene, key);

  return key;
}

function addCatFrameNames(scene: Phaser.Scene, key: string): void {
  const texture = scene.textures.get(key);

  CAT_SPRITE_FRAMES.forEach((frame, index) => {
    if (!texture.has(frame)) {
      texture.add(frame, 0, index * CAT_FRAME_WIDTH, 0, CAT_FRAME_WIDTH, CAT_FRAME_HEIGHT);
    }
  });
}

export function setCatSpriteFrame(
  sprite: Phaser.GameObjects.Sprite,
  variant: CatVariant,
  frame: CatSpriteFrame
): void {
  const key = getCatSpritesheetKey(variant);

  if (sprite.texture.key !== key || sprite.frame.name !== frame) {
    sprite.setTexture(key, frame);
  }
}

function drawCatFrame(
  graphics: Phaser.GameObjects.Graphics,
  variant: CatVariant,
  frame: CatSpriteFrame,
  offsetX: number,
  offsetY: number
): void {
  if (frame === "sleep" || frame === "loaf") {
    drawSleepingCat(graphics, variant, offsetX, offsetY);
    return;
  }

  drawStandingCat(graphics, variant, frame, offsetX, offsetY);
}

function drawStandingCat(
  graphics: Phaser.GameObjects.Graphics,
  variant: CatVariant,
  frame: Exclude<CatSpriteFrame, "sleep" | "loaf">,
  offsetX: number,
  offsetY: number
): void {
  const palette = CAT_PALETTES[variant.coat];
  const eye = frame === "angry" ? 0xff4f4f : EYE_COLORS[variant.eyeColor];
  const outline = 0x1f2635;
  const shade = 0x5d3824;
  const cheek = 0xf7eee0;
  const highlight = 0xf3d0a0;
  const jumpLift = frame === "jump" ? -6 : frame === "land" ? 4 : frame === "walk-a" ? -1 : frame === "walk-b" ? 1 : 0;
  const bodyY = offsetY + 21 + jumpLift;
  const headY = offsetY + 11 + jumpLift;
  const stepA = frame === "walk-a";
  const stepB = frame === "walk-b";

  graphics.fillStyle(outline);
  graphics.fillRect(offsetX + 10, bodyY - 1, 31, 16);
  graphics.fillRect(offsetX + 34, headY - 1, 19, 19);
  graphics.fillRect(offsetX + 37, headY - 7, 6, 9);
  graphics.fillRect(offsetX + 47, headY - 7, 6, 9);

  drawTail(graphics, offsetX, offsetY, frame, outline);
  drawLegs(graphics, offsetX, offsetY, bodyY, frame, outline, true);

  graphics.fillStyle(palette.body);
  graphics.fillRect(offsetX + 12, bodyY, 27, 12);
  graphics.fillRect(offsetX + 36, headY + 1, 15, 15);
  graphics.fillRect(offsetX + 39, headY - 5, 3, 7);
  graphics.fillRect(offsetX + 48, headY - 5, 3, 7);

  drawTail(graphics, offsetX, offsetY, frame, palette.body);
  drawLegs(graphics, offsetX, offsetY, bodyY, frame, palette.body, false);

  graphics.fillStyle(palette.accent);
  graphics.fillRect(offsetX + 14, bodyY + 8, 22, 3);
  graphics.fillRect(offsetX + 8, bodyY - 2, 4, 3);
  graphics.fillRect(offsetX + 45, headY + 14, 4, 2);

  graphics.fillStyle(highlight);
  graphics.fillRect(offsetX + 37, headY + 2, 8, 3);
  graphics.fillRect(offsetX + 17, bodyY + 2, 10, 3);
  graphics.fillRect(offsetX + 14, bodyY + 12, 3, 2);
  graphics.fillRect(offsetX + 35, bodyY + 12, 3, 2);

  graphics.fillStyle(shade);
  graphics.fillRect(offsetX + 13, bodyY + 11, 24, 2);
  graphics.fillRect(offsetX + 6, bodyY - 5, 3, 3);

  if (palette.stripe) {
    graphics.fillStyle(palette.stripe);
    graphics.fillRect(offsetX + 39, headY - 3, 2, 8);
    graphics.fillRect(offsetX + 48, headY - 3, 2, 8);
    graphics.fillRect(offsetX + 19, bodyY, 2, 9);
    graphics.fillRect(offsetX + 27, bodyY, 2, 9);
    graphics.fillRect(offsetX + 35, bodyY, 2, 7);
    graphics.fillRect(offsetX + 4, bodyY - 10, 2, 6);
    graphics.fillRect(offsetX + 15, bodyY + 4, 6, 2);
    graphics.fillRect(offsetX + 25, bodyY + 7, 6, 2);
  }

  if (palette.patch) {
    graphics.fillStyle(palette.patch);
    graphics.fillRect(offsetX + 36, headY + 2, 8, 6);
    graphics.fillRect(offsetX + 20, bodyY, 10, 6);
    graphics.fillRect(offsetX + 4, bodyY - 12, 4, 8);
    graphics.fillStyle(palette.accent);
    graphics.fillRect(offsetX + 48, headY - 4, 4, 7);
    graphics.fillRect(offsetX + 13, bodyY + 7, 9, 4);
    graphics.fillRect(offsetX + 30, bodyY, 7, 5);
  }

  graphics.fillStyle(0xf4b0a8);
  graphics.fillRect(offsetX + 40, headY - 6, 2, 4);
  graphics.fillRect(offsetX + 49, headY - 6, 2, 4);

  graphics.fillStyle(eye);
  graphics.fillRect(offsetX + 39, headY + 7, 2, 3);
  graphics.fillRect(offsetX + 47, headY + 7, 2, 3);
  graphics.fillStyle(0xffffff);
  graphics.fillRect(offsetX + 39, headY + 7, 1, 1);
  graphics.fillRect(offsetX + 47, headY + 7, 1, 1);

  if (variant.eyeColor === "odd" && frame !== "angry") {
    graphics.fillStyle(EYE_COLORS.green);
    graphics.fillRect(offsetX + 47, headY + 7, 2, 3);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(offsetX + 47, headY + 7, 1, 1);
  }

  graphics.fillStyle(cheek);
  graphics.fillRect(offsetX + 41, headY + 11, 7, 4);
  graphics.fillRect(offsetX + 42, headY + 15, 4, 2);
  graphics.fillStyle(frame === "angry" ? 0xff4f4f : 0x2a1d1d);
  graphics.fillRect(offsetX + 43, headY + 11, 2, 2);
  graphics.fillRect(offsetX + 41, headY + 15, 2, 1);
  graphics.fillRect(offsetX + 47, headY + 15, 2, 1);
  graphics.fillRect(offsetX + 51, headY + 9, 6, 1);
  graphics.fillRect(offsetX + 51, headY + 13, 6, 1);

  if (frame === "sniff") {
    graphics.fillStyle(0x8ee6ff, 0.82);
    graphics.fillRect(offsetX + 55, headY + 8, 2, 2);
    graphics.fillRect(offsetX + 59, headY + 5, 2, 2);
    graphics.fillRect(offsetX + 61, headY + 11, 2, 2);
    graphics.fillStyle(0xf9e8c8, 0.78);
    graphics.fillRect(offsetX + 51, headY + 12, 8, 1);
    graphics.fillRect(offsetX + 51, headY + 14, 6, 1);
  }

  if (frame === "eat") {
    graphics.fillStyle(0x77c15f, 1);
    graphics.fillRect(offsetX + 52, headY + 13, 7, 3);
    graphics.fillRect(offsetX + 56, headY + 9, 2, 5);
    graphics.fillStyle(0x2a1d1d, 1);
    graphics.fillRect(offsetX + 43, headY + 15, 5, 2);
  }

  if (frame === "knock") {
    graphics.fillStyle(outline, 1);
    graphics.fillRect(offsetX + 48, bodyY + 12, 13, 5);
    graphics.fillStyle(palette.body, 1);
    graphics.fillRect(offsetX + 48, bodyY + 13, 11, 3);
    graphics.fillStyle(0xf9e8c8, 0.72);
    graphics.fillRect(offsetX + 58, bodyY + 12, 3, 2);
  }

  if (frame === "angry") {
    graphics.fillStyle(0x1f2635);
    graphics.fillRect(offsetX + 38, headY + 5, 5, 2);
    graphics.fillRect(offsetX + 46, headY + 5, 5, 2);
  }

  if (stepA || stepB) {
    graphics.fillStyle(0xf9e8c8, 0.7);
    graphics.fillRect(offsetX + (stepA ? 12 : 22), bodyY + 17, 5, 1);
    graphics.fillRect(offsetX + (stepA ? 35 : 45), bodyY + 17, 5, 1);
  }
}

function drawTail(
  graphics: Phaser.GameObjects.Graphics,
  offsetX: number,
  offsetY: number,
  frame: Exclude<CatSpriteFrame, "sleep" | "loaf">,
  color: number
): void {
  const lift = frame === "jump" ? -7 : frame === "tail-flick" ? -9 : frame === "land" ? 3 : 0;
  const side = frame === "walk-a" ? -1 : frame === "walk-b" ? 1 : frame === "tail-flick" ? -1 : 0;
  const tipX = frame === "tail-flick" ? -4 : side * 4;
  const midX = side;
  const tipY = frame === "tail-flick" ? -4 : 0;

  graphics.fillStyle(color);
  graphics.fillRect(offsetX + 5, offsetY + 16 + lift, 7, 6);
  graphics.fillRect(offsetX + 2, offsetY + 10 + lift, 5, 9);
  graphics.fillRect(offsetX + 1 + midX, offsetY + 5 + lift, 8, 6);
  graphics.fillRect(offsetX + 6 + tipX, offsetY + 3 + lift + tipY, 5, 5);
}

function drawLegs(
  graphics: Phaser.GameObjects.Graphics,
  offsetX: number,
  _offsetY: number,
  bodyY: number,
  frame: Exclude<CatSpriteFrame, "sleep" | "loaf">,
  color: number,
  outline: boolean
): void {
  graphics.fillStyle(color);

  if (frame === "jump") {
    graphics.fillRect(offsetX + 15, bodyY + 12, outline ? 8 : 5, outline ? 4 : 3);
    graphics.fillRect(offsetX + 35, bodyY + 12, outline ? 9 : 6, outline ? 4 : 3);
    graphics.fillRect(offsetX + 26, bodyY + 15, outline ? 8 : 5, outline ? 4 : 3);
    return;
  }

  if (frame === "land") {
    graphics.fillRect(offsetX + 12, bodyY + 11, outline ? 9 : 6, outline ? 7 : 4);
    graphics.fillRect(offsetX + 25, bodyY + 12, outline ? 9 : 6, outline ? 7 : 4);
    graphics.fillRect(offsetX + 38, bodyY + 11, outline ? 9 : 6, outline ? 7 : 4);
    return;
  }

  const frontShift = frame === "walk-a" ? -2 : frame === "walk-b" ? 3 : 0;
  const backShift = frame === "walk-a" ? 3 : frame === "walk-b" ? -2 : 0;

  graphics.fillRect(offsetX + 12 + backShift, bodyY + 11, outline ? 7 : 4, outline ? 11 : 8);
  graphics.fillRect(offsetX + 22 - backShift, bodyY + 11, outline ? 7 : 4, outline ? 10 : 7);
  graphics.fillRect(offsetX + 34 + frontShift, bodyY + 11, outline ? 7 : 4, outline ? 10 : 7);
  graphics.fillRect(offsetX + 44 - frontShift, bodyY + 10, outline ? 7 : 4, outline ? 11 : 8);
}

function drawSleepingCat(
  graphics: Phaser.GameObjects.Graphics,
  variant: CatVariant,
  offsetX: number,
  offsetY: number
): void {
  const palette = CAT_PALETTES[variant.coat];
  const outline = 0x1f2635;
  const baseY = offsetY + 22;

  graphics.fillStyle(outline);
  graphics.fillRect(offsetX + 12, baseY, 34, 14);
  graphics.fillRect(offsetX + 7, baseY - 2, 17, 15);
  graphics.fillRect(offsetX + 10, baseY - 8, 5, 8);
  graphics.fillRect(offsetX + 19, baseY - 8, 5, 8);
  graphics.fillRect(offsetX + 43, baseY + 5, 10, 6);
  graphics.fillRect(offsetX + 49, baseY + 1, 5, 6);

  graphics.fillStyle(palette.body);
  graphics.fillRect(offsetX + 14, baseY + 2, 30, 10);
  graphics.fillRect(offsetX + 9, baseY, 13, 11);
  graphics.fillRect(offsetX + 12, baseY - 6, 3, 6);
  graphics.fillRect(offsetX + 20, baseY - 6, 3, 6);
  graphics.fillRect(offsetX + 43, baseY + 6, 8, 3);
  graphics.fillRect(offsetX + 49, baseY + 3, 3, 4);

  graphics.fillStyle(0x5d3824);
  graphics.fillRect(offsetX + 16, baseY + 12, 26, 3);
  graphics.fillRect(offsetX + 42, baseY + 10, 7, 3);

  if (palette.stripe) {
    graphics.fillStyle(palette.stripe);
    graphics.fillRect(offsetX + 13, baseY - 5, 2, 6);
    graphics.fillRect(offsetX + 20, baseY - 5, 2, 6);
    graphics.fillRect(offsetX + 28, baseY + 2, 3, 8);
    graphics.fillRect(offsetX + 37, baseY + 2, 3, 7);
  }

  if (palette.patch) {
    graphics.fillStyle(palette.patch);
    graphics.fillRect(offsetX + 9, baseY + 1, 7, 7);
    graphics.fillRect(offsetX + 32, baseY + 3, 9, 7);
    graphics.fillStyle(palette.accent);
    graphics.fillRect(offsetX + 17, baseY + 8, 8, 5);
  }

  graphics.fillStyle(0x2a1d1d);
  graphics.fillRect(offsetX + 12, baseY + 4, 5, 1);
  graphics.fillRect(offsetX + 19, baseY + 4, 5, 1);
  graphics.fillRect(offsetX + 16, baseY + 7, 2, 2);
  graphics.fillRect(offsetX + 13, baseY + 10, 8, 1);
}
