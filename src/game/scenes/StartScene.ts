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
  CAT_LABELS,
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

    this.cameras.main.setBackgroundColor("#20233a");
    this.add
      .text(384, 56, "Котаника", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#f9e8c8"
      })
      .setOrigin(0.5);

    this.add
      .text(384, 92, "Выбери своего котика", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#cfc2d8"
      })
      .setOrigin(0.5);

    const centerX = 384;
    const gridStartY = 145;
    const columnSpacing = 156;
    const rowSpacing = 100;

    CAT_COATS.forEach((coat, index) => {
      const x = centerX + ((index % 3) - 1) * columnSpacing;
      const y = gridStartY + Math.floor(index / 3) * rowSpacing;
      const variant = createCatVariant(coat);

      this.createCatPreview(x, y, variant);

      const label = this.add
        .text(x, y + 44, CAT_LABELS[coat], {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#f9e8c8",
          backgroundColor: "#493c53",
          padding: { x: 6, y: 3 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      label.on("pointerover", () => label.setStyle({ backgroundColor: "#6a4f62" }));
      label.on("pointerout", () => label.setStyle({ backgroundColor: "#493c53" }));
      label.on("pointerdown", () => this.startGame(coat));
    });

    this.add
      .text(384, 382, "Это обучающая игра, а не ветеринарный совет. Если настоящий кот мог съесть опасное растение, обратитесь к ветеринару.", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#cfc2d8",
        align: "center",
        wordWrap: { width: 620 }
      })
      .setOrigin(0.5);

    this.createSaveSlotButtons();
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
          color: save ? "#f9e8c8" : "#8b8496",
          backgroundColor: save ? "#493c53" : "#2a2435",
          padding: { x: 5, y: 3 }
        })
        .setOrigin(0.5);

      if (!save) {
        return;
      }

      button.setInteractive({ useHandCursor: true });
      button.on("pointerover", () => button.setStyle({ backgroundColor: "#6a4f62" }));
      button.on("pointerout", () => button.setStyle({ backgroundColor: "#493c53" }));
      button.on("pointerdown", () => this.startSavedGame(save));
    });
  }

  private createCatPreview(x: number, y: number, variant: CatVariant): void {
    ensureCatSpritesheet(this, variant);
    this.add
      .sprite(x, y + 5, getCatSpritesheetKey(variant), "idle")
      .setScale(0.78)
      .setOrigin(0.5);
  }
}


