import Phaser from "phaser";
import { preloadPixelAssets } from "../assets";
import { startBackgroundMusic, unlockAudio } from "../sound";
import {
  ensureCatSpritesheet,
  getCatSpritesheetKey
} from "../catSprites";
import {
  getSaveSlotTitle,
  loadGameSlot,
  type GameSaveState
} from "../saveState";
import {
  CAT_COATS,
  createCatVariant,
  type CatCoat,
  type CatVariant
} from "../../data/cats";
import { getLevel } from "../../data/levels";

const WORLD_WIDTH = 768;
const WORLD_HEIGHT = 432;
const RENDER_SCALE = 3;

export class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload(): void {
    preloadPixelAssets(this);
  }

  create(): void {
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const params = new URLSearchParams(window.location.search);

    this.input.once("pointerdown", unlockAudio);
    this.input.keyboard?.once("keydown", unlockAudio);

    if (
      params.get("smoke") === "game" ||
      params.get("demo") === "1" ||
      params.has("seed") ||
      params.has("level")
    ) {
      const level = Number(params.get("level") ?? 0);
      const seed = Number(params.get("seed") ?? NaN);
      this.startGame(
        params.get("demo") === "1" ? "orange" : "gray",
        Number.isFinite(level) ? level : 0,
        Number.isFinite(seed) ? seed : undefined
      );
      return;
    }

    this.cameras.main.setBackgroundColor("#2b1d19");
    this.drawStartBackdrop();
    this.add
      .text(384, 56, "Котаника", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffd28a"
      })
      .setOrigin(0.5);

    const chooserOffsetY = 36;

    this.add
      .text(384, 92 + chooserOffsetY, "Выбери своего котика", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e8c49b"
      })
      .setOrigin(0.5);

    const centerX = 384;
    const gridStartY = 145 + chooserOffsetY;
    const columnSpacing = 156;
    const rowSpacing = 100;

    CAT_COATS.forEach((coat, index) => {
      const x = centerX + ((index % 3) - 1) * columnSpacing;
      const y = gridStartY + Math.floor(index / 3) * rowSpacing;
      const variant = createCatVariant(coat);

      this.createCatPreview(x, y, variant, () => this.startGame(coat));
    });

    this.add
      .text(384, 382, "Это обучающая игра, а не ветеринарный совет. Если настоящий кот мог съесть опасное растение, обратитесь к ветеринару.", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#caa98b",
        align: "center",
        wordWrap: { width: 620 }
      })
      .setOrigin(0.5);

    this.createSaveSlotButtons();
  }

  private drawStartBackdrop(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x2b1d19, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(0x3d261d, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, 360);
    graphics.fillStyle(0x2a1d1b, 1);
    graphics.fillRect(0, 360, WORLD_WIDTH, 72);
    graphics.fillStyle(0x6a3e2f, 1);
    graphics.fillRect(0, 356, WORLD_WIDTH, 7);

    graphics.fillStyle(0x4f3024, 0.5);
    for (let x = 36; x < WORLD_WIDTH; x += 72) {
      graphics.fillRect(x, 118, 18, 3);
      graphics.fillRect(x + 28, 248, 22, 3);
    }
    const topVine: Array<[number, number]> = [
      [34, 36], [92, 28], [162, 32], [242, 25], [332, 29],
      [424, 24], [512, 31], [600, 25], [686, 30], [734, 38]
    ];

    graphics.lineStyle(2, 0x3f6f37, 1);
    topVine.forEach(([x, y], index) => {
      if (index === 0) {
        return;
      }
      const [prevX, prevY] = topVine[index - 1];
      graphics.lineBetween(prevX, prevY, x, y);
    });

    topVine.forEach(([x, y], index) => {
      const scale = index % 3 === 0 ? 1.15 : index % 3 === 1 ? 0.82 : 1;
      this.drawIvyLeaf(graphics, x - 4, y + 6, index % 2 === 0, scale);
      this.drawIvyLeaf(graphics, x + 6, y - 2, index % 3 === 0, scale * 0.72);

      if (index > 0 && index < topVine.length - 1 && index % 2 === 0) {
        this.drawIvySprig(graphics, x - 4, y + 2, index % 4 === 0 ? -24 : 20, 14 + (index % 3) * 5, 3, index);
      }
    });

    [146, 302, 468, 628].forEach((x, index) => {
      this.drawIvySprig(graphics, x, 31 + (index % 2) * 4, index % 2 === 0 ? -7 : 9, 42 + index * 4, 4, index + 6);
    });

    for (let y = 54; y <= 330; y += 28) {
      const leftSway = Math.round(Math.sin(y / 24) * 5);
      const rightSway = Math.round(Math.cos(y / 26) * 5);
      graphics.lineStyle(2, 0x3f6f37, 0.95);
      graphics.lineBetween(32, y - 26, 32 + leftSway, y);
      graphics.lineBetween(WORLD_WIDTH - 32, y - 26, WORLD_WIDTH - 32 + rightSway, y);
      this.drawIvyLeaf(graphics, 28 + leftSway, y - 4, y % 56 === 0, y % 84 === 0 ? 1.18 : 0.92);
      this.drawIvyLeaf(graphics, WORLD_WIDTH - 28 + rightSway, y - 4, y % 56 !== 0, y % 84 === 0 ? 0.92 : 1.14);

      if (y % 56 === 26) {
        this.drawIvySprig(graphics, 32 + leftSway, y - 7, 28, -10, 3, y);
        this.drawIvySprig(graphics, WORLD_WIDTH - 32 + rightSway, y - 7, -28, -10, 3, y + 5);
      }
    }
  }

  private drawIvyLeaf(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    flip: boolean,
    scale = 1
  ): void {
    const width = Math.round(9 * scale);
    const height = Math.max(3, Math.round(5 * scale));

    this.drawIvyGlow(graphics, x, y, scale);

    graphics.fillStyle(flip ? 0x75a85c : 0x5f8a48, 1);
    graphics.fillEllipse(x, y, width, height);
    graphics.fillStyle(0xa5d47a, 0.75);
    graphics.fillEllipse(x + (flip ? -2 : 2), y - 1, Math.max(3, Math.round(4 * scale)), 2);
    graphics.fillStyle(0x2f5f32, 0.55);
    graphics.fillRect(x + (flip ? 1 : -1), y, 1, Math.max(2, Math.round(4 * scale)));
  }

  private drawIvyGlow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    const radius = 0.78 + scale * 0.18;

    graphics.fillStyle(0xaee46a, 0.032);
    graphics.fillEllipse(x, y, 34 * radius, 22 * radius);
    graphics.fillStyle(0xf3dc77, 0.044);
    graphics.fillEllipse(x + 1, y + 1, 22 * radius, 15 * radius);
    graphics.fillStyle(0xe8f58a, 0.045);
    graphics.fillEllipse(x - 1, y, 12 * radius, 8 * radius);
  }

  private drawIvySprig(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    dx: number,
    dy: number,
    leafCount: number,
    seed: number
  ): void {
    const midX = x + dx * 0.45 + Math.sin(seed) * 4;
    const midY = y + dy * 0.45 + Math.cos(seed) * 3;
    const endX = x + dx;
    const endY = y + dy;

    graphics.lineStyle(1, 0x3f6f37, 0.92);
    graphics.lineBetween(x, y, midX, midY);
    graphics.lineBetween(midX, midY, endX, endY);

    for (let index = 1; index <= leafCount; index += 1) {
      const ratio = index / (leafCount + 1);
      const leafX = x + dx * ratio + Math.sin(seed + index) * 3;
      const leafY = y + dy * ratio + Math.cos(seed + index) * 2;
      this.drawIvyLeaf(graphics, leafX, leafY, (seed + index) % 2 === 0, index % 2 === 0 ? 0.72 : 0.9);
    }
  }

  private startGame(coat: CatCoat, level = 0, seed?: number): void {
    startBackgroundMusic(getLevel(level).id);
    this.scene.start("GameScene", {
      cat: createCatVariant(coat),
      level,
      seed
    });
  }

  private startSavedGame(save: GameSaveState): void {
    startBackgroundMusic(getLevel(save.levelIndex).id);
    this.scene.start("GameScene", {
      cat: save.cat,
      level: save.levelIndex,
      save
    });
  }

  private createSaveSlotButtons(): void {
    [1, 2, 3].forEach((slot, index) => {
      const save = loadGameSlot(slot);
      const button = this.add
        .text(236 + index * 148, 414, getSaveSlotTitle(slot), {
          fontFamily: "monospace",
          fontSize: "9px",
          color: save ? "#f9e8c8" : "#9c8574",
          backgroundColor: save ? "#6f3f2c" : "#3a2821",
          padding: { x: 5, y: 3 }
        })
        .setOrigin(0.5);

      if (!save) {
        return;
      }

      button.setInteractive({ useHandCursor: true });
      button.on("pointerover", () => button.setStyle({ backgroundColor: "#9a5a37" }));
      button.on("pointerout", () => button.setStyle({ backgroundColor: "#6f3f2c" }));
      button.on("pointerdown", () => this.startSavedGame(save));
    });
  }

  private createCatPreview(
    x: number,
    y: number,
    variant: CatVariant,
    onPick: () => void
  ): void {
    ensureCatSpritesheet(this, variant);
    const sprite = this.add
      .sprite(x, y + 5, getCatSpritesheetKey(variant), "idle")
      .setScale(0.78)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    sprite.on("pointerover", () => sprite.setScale(0.86));
    sprite.on("pointerout", () => sprite.setScale(0.78));
    sprite.on("pointerdown", onPick);
  }
}


