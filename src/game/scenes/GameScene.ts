import Phaser from "phaser";
import {
  ensureCatSpritesheet,
  getCatSpritesheetKey,
  setCatSpriteFrame,
  type CatSpriteFrame
} from "../catSprites";
import { preloadPixelAssets } from "../assets";
import {
  buildLevelSummaryRows,
  getThreatColor,
  getThreatLabel,
  buildStatsAfterLevel,
  cloneActionStats,
  createEmptyActionStats,
  type PlantActionLogEntry,
  type PlantActionStats
} from "../actionStats";
import {
  createCatVariant,
  type CatVariant
} from "../../data/cats";
import { LEVELS, getLevel, type FurnitureSpec, type LevelConfig } from "../../data/levels";
import { PLANTS, type Plant } from "../../data/plants";
import { createPlantPlan, generateValidatedShelfLayout, TREATS_TO_WIN } from "../../data/levelGeneration";
import { resolvePlantAction, type PlantAction } from "../../rules/plantActions";
import { getDiscoveredPlantIds, markPlantDiscovered } from "../plantJournal";
import {
  getSaveSlotTitle,
  saveGameSlot,
  type GameSaveState
} from "../saveState";
import {
  playBlip,
  playCrash,
  playDefeatCat,
  playMeow,
  playMunch,
  playPotBreak,
  playSleepTone,
  startBackgroundMusic,
  stopDefeatCat,
  unlockAudio
} from "../sound";

type PlantActor = {
  plant: Plant;
  sprite: Phaser.GameObjects.Sprite;
  active: boolean;
};

type ArcadeCollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

type ShelfSpec = {
  x: number;
  y: number;
  width: number;
};

type DropThroughSurfaceSpec = {
  top: number;
  left: number;
  right: number;
};

type LightingStage = {
  index: number;
  color: number;
  alpha: number;
  sunX: number;
  sunY: number;
  sunColor: number;
  sunAlpha: number;
  beamColor: number;
  beamAlpha: number;
  beamLeft: number;
  beamRight: number;
  beamY: number;
};

type RoomLamp = {
  id: string;
  x: number;
  shadeY: number;
  kind: "floor" | "table";
  lit: boolean;
  knocked: boolean;
};

type GameSceneData = {
  cat?: CatVariant;
  level?: number;
  seed?: number;
  save?: GameSaveState;
  stats?: PlantActionStats;
};

type KeyMap = {
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  q: Phaser.Input.Keyboard.Key;
  j: Phaser.Input.Keyboard.Key;
  r: Phaser.Input.Keyboard.Key;
  n: Phaser.Input.Keyboard.Key;
  l: Phaser.Input.Keyboard.Key;
  caps: Phaser.Input.Keyboard.Key;
  one: Phaser.Input.Keyboard.Key;
  two: Phaser.Input.Keyboard.Key;
  three: Phaser.Input.Keyboard.Key;
};

const WORLD_WIDTH = 768;
const WORLD_HEIGHT = 432;
const RENDER_SCALE = 3;
const FLOOR_TOP = 400;
const PURRS_TO_WIN = TREATS_TO_WIN;
const SHELF_HEIGHT = 14;
const HUD_RESERVED_BOTTOM = 88;
const CAT_BASE_SCALE = 0.59;
const CAT_BODY_WIDTH = 68;
const CAT_BODY_HEIGHT = 56;
const CAT_BODY_OFFSET_X = 18;
const CAT_BODY_OFFSET_Y = 20;
const CAT_RUN_SPEED = 178;
const CAT_JUMP_VELOCITY = -470;
const CAT_MAX_FALL_SPEED = 650;
const CAT_GROWN_MULTIPLIER = 2;
const WINDOW_X = 384;
const WINDOW_Y = 116;
const WINDOW_FRAME_WIDTH = 190;
const WINDOW_FRAME_HEIGHT = 132;
const WINDOW_INNER_WIDTH = 168;
const WINDOW_INNER_HEIGHT = 110;
const WINDOW_SILL_TOP = WINDOW_Y + WINDOW_INNER_HEIGHT / 2 + 7;
const WINDOW_SILL_PLATFORM_Y = WINDOW_SILL_TOP + 6;
const WINDOW_SILL_WIDTH = 208;

export class GameScene extends Phaser.Scene {
  private cat: CatVariant = createCatVariant("gray");
  private level: LevelConfig = getLevel(0);
  private levelIndex = 0;
  private levelSeed = 0;
  private levelRandom = new Phaser.Math.RandomDataGenerator(["0"]);
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: KeyMap;
  private floor!: Phaser.Physics.Arcade.StaticGroup;
  private dropThroughShelfTop?: number;
  private dropThroughUntil = 0;
  private shelfSpecs: ShelfSpec[] = [];
  private dropThroughSurfaces: DropThroughSurfaceSpec[] = [];
  private plants: PlantActor[] = [];
  private plantActionLog: PlantActionLogEntry[] = [];
  private restoredSave?: GameSaveState;
  private gameStats: PlantActionStats = createEmptyActionStats();
  private completedStats?: PlantActionStats;
  private actionPose?: CatSpriteFrame;
  private actionPoseUntil = 0;
  private lastMoveAt = 0;
  private wasAirborne = false;
  private landingUntil = 0;
  private lastLandingAt = 0;
  private jumpStretchUntil = 0;
  private catScaleMultiplier = 1;
  private purrs = 0;
  private demoMode = false;
  private purrText!: Phaser.GameObjects.Text;
  private infoPanel!: Phaser.GameObjects.Rectangle;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private plantNamePanel!: Phaser.GameObjects.Rectangle;
  private plantNameText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private restartButton?: Phaser.GameObjects.Text;
  private startOverButton?: Phaser.GameObjects.Text;
  private nextButton?: Phaser.GameObjects.Text;
  private mainMenuConfirmObjects: Phaser.GameObjects.GameObject[] = [];
  private journalOpen = false;
  private journalObjects: Phaser.GameObjects.GameObject[] = [];
  private savePanelOpen = false;
  private savePanelObjects: Phaser.GameObjects.GameObject[] = [];
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private sun!: Phaser.GameObjects.Arc;
  private windowLight!: Phaser.GameObjects.Graphics;
  private windowSky!: Phaser.GameObjects.Graphics;
  private garlandLight!: Phaser.GameObjects.Graphics;
  private floorLampLight!: Phaser.GameObjects.Graphics;
  private lampGraphics!: Phaser.GameObjects.Graphics;
  private roomLamps: RoomLamp[] = [];
  private tvBroken = false;
  private tvObjects: Phaser.GameObjects.GameObject[] = [];
  private tvPlatform?: Phaser.Physics.Arcade.Image;
  private tvSurface?: DropThroughSurfaceSpec;
  private garlandShadows!: Phaser.GameObjects.Graphics;
  private garlandLights: Array<{
    bulb: Phaser.GameObjects.Rectangle;
    glow: Phaser.GameObjects.Arc;
  }> = [];
  private shelfHangingCounts: Record<"dream" | "cloth" | "photos", number> = {
    dream: 0,
    cloth: 0,
    photos: 0
  };
  private lightingStage = 0;
  private state: "playing" | "won" | "lost" = "playing";

  constructor() {
    super("GameScene");
  }

  preload(): void {
    preloadPixelAssets(this);
  }

  create(data: GameSceneData): void {
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.restoredSave = data.save;
    this.cat = data.save?.cat ?? data.cat ?? createCatVariant("gray");
    this.levelIndex = data.save?.levelIndex ?? data.level ?? 0;
    this.level = getLevel(this.levelIndex);
    this.levelSeed = data.save?.seed ?? data.seed ?? this.createLevelSeed();
    this.resetLevelRandom();
    this.state = "playing";
    this.physics.resume();
    this.demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
    this.purrs = data.save?.purrs ?? 0;
    this.lightingStage = data.save?.lightingStage ?? 0;
    this.plants = [];
    this.dropThroughSurfaces = [];
    this.plantActionLog = [];
    this.gameStats = data.stats ? cloneActionStats(data.stats) : createEmptyActionStats();
    this.completedStats = undefined;
    this.actionPose = undefined;
    this.actionPoseUntil = 0;
    this.lastMoveAt = this.time.now;
    this.wasAirborne = false;
    this.landingUntil = 0;
    this.lastLandingAt = 0;
    this.jumpStretchUntil = 0;
    this.catScaleMultiplier = 1;
    this.journalOpen = false;
    this.journalObjects = [];
    this.garlandLights = [];
    this.roomLamps = [];
    this.tvBroken = data.save?.tvBroken ?? false;
    this.tvObjects = [];
    this.tvPlatform = undefined;
    this.tvSurface = undefined;
    this.shelfHangingCounts = { dream: 0, cloth: 0, photos: 0 };
    this.restartButton = undefined;
    this.startOverButton = undefined;
    this.nextButton = undefined;
    this.mainMenuConfirmObjects = [];

    this.createTextures();
    this.createRoom();
    this.createPlayer();
    this.createPlants();
    this.createUi();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      n: Phaser.Input.Keyboard.KeyCodes.N,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      caps: Phaser.Input.Keyboard.KeyCodes.CAPS_LOCK,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
    }) as KeyMap;

    this.input.once("pointerdown", unlockAudio);
    this.input.keyboard?.once("keydown", unlockAudio);

    this.showControlsHint();
    startBackgroundMusic(this.level.id);

    if (this.demoMode) {
      this.startDemo();
    }
  }

  update(): void {
    if (this.state === "lost" && Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.restartLevel();
      return;
    }

    if (this.state === "won" && this.isLastLevel() && Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.scene.start("StartScene");
      return;
    }

    if (this.state === "won" && this.nextButton && Phaser.Input.Keyboard.JustDown(this.keys.n)) {
      this.nextLevel();
      return;
    }

    if (this.state !== "playing") {
      return;
    }

    if (this.handleCatGrowthInput()) {
      return;
    }

    if (this.demoMode) {
      return;
    }

    if (this.mainMenuConfirmObjects.length > 0) {
      this.player.setVelocityX(0);
      return;
    }

    this.handleJournalInput();

    if (this.journalOpen) {
      this.player.setVelocityX(0);
      this.updatePlantNameLabel();
      return;
    }

    this.handleSaveInput();

    if (this.savePanelOpen) {
      this.player.setVelocityX(0);
      this.updatePlantNameLabel();
      return;
    }

    this.handleMovement();
    this.handleActions();
    this.updatePlantNameLabel();
  }

  private createRoom(): void {
    const palette = this.level.palette;
    const isGreenhouse = this.level.id === "greenhouse";

    this.cameras.main.setBackgroundColor("#" + palette.wall.toString(16).padStart(6, "0"));

    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, palette.wall).setDepth(-9);
    this.add.rectangle(
      WORLD_WIDTH / 2,
      FLOOR_TOP + (WORLD_HEIGHT - FLOOR_TOP) / 2,
      WORLD_WIDTH,
      WORLD_HEIGHT - FLOOR_TOP,
      palette.floor
    ).setDepth(-7);
    this.add.rectangle(WORLD_WIDTH / 2, FLOOR_TOP - 2, WORLD_WIDTH, 4, palette.floorTrim)
      .setDepth(-6)
      .setAlpha(0.78);
    this.drawWallpaper();

    if (!isGreenhouse) {
      this.add.rectangle(WINDOW_X, WINDOW_Y, WINDOW_FRAME_WIDTH, WINDOW_FRAME_HEIGHT, 0x405674).setDepth(-6);
      this.add.rectangle(WINDOW_X, WINDOW_Y, WINDOW_INNER_WIDTH, WINDOW_INNER_HEIGHT, 0xaecce3).setDepth(-5);
    }

    this.sun = this.add
      .circle(WINDOW_X - 56, WINDOW_Y + 24, isGreenhouse ? 30 : 13, 0xffd98a, 0.95)
      .setDepth(-5);

    if (!isGreenhouse) {
      const sunMask = this.make.graphics({ x: 0, y: 0 }, false);
      sunMask.fillStyle(0xffffff);
      sunMask.fillRect(
        WINDOW_X - WINDOW_INNER_WIDTH / 2,
        WINDOW_Y - WINDOW_INNER_HEIGHT / 2,
        WINDOW_INNER_WIDTH,
        WINDOW_INNER_HEIGHT
      );
      this.sun.setMask(sunMask.createGeometryMask());
      this.add.rectangle(WINDOW_X, WINDOW_Y, 6, WINDOW_INNER_HEIGHT, 0x405674).setDepth(-4);
      this.add.rectangle(WINDOW_X, WINDOW_Y, WINDOW_INNER_WIDTH, 6, 0x405674).setDepth(-4);
      this.add.rectangle(WINDOW_X, WINDOW_Y + WINDOW_INNER_HEIGHT / 2, WINDOW_INNER_WIDTH, 5, 0x405674).setDepth(-4);
    }
    this.windowSky = this.add.graphics().setDepth(-4.6);
    this.windowLight = this.add.graphics().setDepth(-2);
    this.garlandShadows = this.add.graphics().setDepth(8);
    this.garlandLight = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.floorLampLight = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);

    for (let index = 0; index < 30; index += 1) {
      const x = 270 + (index % 10) * 24;
      const y = 48 + (index % 5) * 18;
      const color = index % 3 === 0 ? 0xf9e8c8 : index % 3 === 1 ? 0xaad3ff : 0xf0b46a;

      this.add.rectangle(x, y, 2, 2, color).setAlpha(0.42).setDepth(-3);
    }

    const decor = this.add.graphics().setDepth(-3);
    decor.lineStyle(1, 0x6f889b, 0.28);
    for (let y = 48; y < FLOOR_TOP - 12; y += 36) {
      decor.lineBetween(18, y, 750, y + (y % 2 === 0 ? 3 : -3));
    }

    this.drawRoomVariantDecor(decor);
    this.drawThemedRoomDecor(decor);
    this.drawReadableHouseholdProps(decor);

    this.drawGarlandWire(decor);

    this.createGarlandLights();

    decor.fillStyle(0x466d68, 0.68);
    for (let index = 0; index < 36; index += 1) {
      const x = 18 + index * 21;
      const y = 18 + (index % 5) * 3;
      decor.fillRect(x, y, 16, 8);
      decor.fillRect(x + 6, y + 8, 5, 5);
    }

    this.drawCeilingHangings(decor);

    if (this.level.id !== "desk-laptop" && !isGreenhouse) {
      decor.fillStyle(0x4b3448, 1);
      decor.fillRect(WINDOW_X - WINDOW_SILL_WIDTH / 2, WINDOW_SILL_TOP, WINDOW_SILL_WIDTH, 12);
    decor.fillStyle(0x8a5c80, 1);
    decor.fillRect(WINDOW_X - WINDOW_SILL_WIDTH / 2 + 8, WINDOW_SILL_TOP + 2, WINDOW_SILL_WIDTH - 16, 5);
    decor.fillStyle(0xf9e8c8, 0.5);
    decor.fillRect(WINDOW_X - 92, WINDOW_SILL_TOP + 3, 42, 2);
    decor.fillRect(WINDOW_X + 55, WINDOW_SILL_TOP + 3, 40, 2);
    decor.fillStyle(0xf4c95d, 1);
    decor.fillRect(WINDOW_X - 60, WINDOW_Y + 49, 7, 16);
    decor.fillStyle(0x7f4f42, 1);
    decor.fillRect(WINDOW_X - 58, WINDOW_Y + 51, 2, 11);
    decor.fillStyle(0xff8eb5, 1);
    decor.fillRect(WINDOW_X - 51, WINDOW_Y + 47, 7, 18);
    decor.fillStyle(0x8a5c80, 1);
    decor.fillRect(WINDOW_X - 49, WINDOW_Y + 50, 2, 12);
    decor.fillStyle(0x8ee6ff, 1);
    decor.fillRect(WINDOW_X - 42, WINDOW_Y + 57, 18, 5);
    decor.fillStyle(0xf9e8c8, 1);
    decor.fillRect(WINDOW_X - 40, WINDOW_Y + 55, 15, 2);
    decor.fillStyle(0xa5df83, 1);
    decor.fillRect(WINDOW_X + 31, WINDOW_Y + 54, 27, 6);
    decor.fillStyle(0xf9e8c8, 1);
    decor.fillRect(WINDOW_X + 34, WINDOW_Y + 51, 22, 3);
    decor.fillStyle(0xffbd66, 1);
    decor.fillRect(WINDOW_X + 38, WINDOW_Y + 47, 17, 4);
    decor.fillStyle(0x405674, 1);
      decor.fillRect(WINDOW_X + 45, WINDOW_Y + 48, 2, 12);
    }

    this.drawSleepSpot();
    this.drawFurniture();
    this.createRoomLamps();
    this.lampGraphics = this.add.graphics().setDepth(0);
    this.drawRoomLamps();

    this.floor = this.physics.add.staticGroup();
    this.floor.create(WORLD_WIDTH / 2, FLOOR_TOP + SHELF_HEIGHT / 2, "floor");
  }

  private drawGarlandWire(decor: Phaser.GameObjects.Graphics): void {
    if (!this.shouldShowGarland()) {
      return;
    }

    decor.lineStyle(1, 0xdcc98f, 0.5);
    decor.beginPath();

    if (this.level.id === "desk-laptop") {
      decor.moveTo(470, 50);
      decor.lineTo(585, 38);
      decor.lineTo(724, 54);
    } else if (this.level.id === "cat-hammock") {
      decor.moveTo(38, 42);
      decor.lineTo(158, 64);
      decor.lineTo(278, 42);
      decor.lineTo(398, 64);
    } else {
      decor.moveTo(34, 58);
      decor.lineTo(150, 42);
      decor.lineTo(266, 58);
    }

    decor.strokePath();
  }

  private createGarlandLights(): void {
    if (!this.shouldShowGarland()) {
      return;
    }

    const colors = this.getGarlandColors();
    const count = this.level.id === "cat-hammock" ? 12 : this.level.id === "desk-laptop" ? 10 : 9;

    for (let index = 0; index < count; index += 1) {
      const point = this.getGarlandPoint(index);
      const color = colors[index % colors.length];
      const glow = this.add
        .circle(point.x + 1, point.y + 3, 12, color, 0)
        .setDepth(6)
        .setBlendMode(Phaser.BlendModes.ADD);
      const bulb = this.add
        .rectangle(point.x + 1, point.y + 3, 4, 7, color, 0.62)
        .setDepth(7)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.garlandLights.push({ bulb, glow });
    }
  }

  private getGarlandPoint(index: number): { x: number; y: number } {
    if (this.level.id === "desk-laptop") {
      return {
        x: 478 + index * 26,
        y: 50 + Math.abs(index - 4.5) * 2 + (index % 2) * 3
      };
    }

    if (this.level.id === "cat-hammock") {
      const dip = index % 4 === 1 || index % 4 === 2 ? 18 : 5;

      return {
        x: 48 + index * 30,
        y: 42 + dip
      };
    }

    return {
      x: 54 + index * 25,
      y: 58 + (index % 2) * 4
    };
  }

  private shouldShowGarland(): boolean {
    return this.level.id !== "greenhouse" && this.level.id !== "grandma-corner";
  }

  private getGarlandColors(): number[] {
    if (this.level.id === "desk-laptop") {
      return [0x8ee6ff, 0xffd56f, 0xb7f28b, 0xff8eb5];
    }

    if (this.level.id === "cat-hammock") {
      return [0xf2b7df, 0x8fa7ff, 0xffd56f, 0xb7f28b];
    }

    return [0xffd56f, 0xff8eb5, 0x8ee6ff, 0xb7f28b];
  }

  private drawRoomVariantDecor(decor: Phaser.GameObjects.Graphics): void {
    if (this.level.id === "desk-laptop") {
      const doorTop = 78;
      const doorLeft = WINDOW_X - 82;
      const doorWidth = 164;
      const doorHeight = FLOOR_TOP - doorTop;
      const innerLeft = doorLeft + 12;
      const innerTop = doorTop + 10;
      const innerWidth = doorWidth - 24;
      const innerHeight = doorHeight - 18;

      decor.fillStyle(0x2e425c, 1);
      decor.fillRect(doorLeft, doorTop, doorWidth, doorHeight);
      decor.fillStyle(0x9fc9dc, 0.95);
      decor.fillRect(innerLeft, innerTop, innerWidth, innerHeight);
      decor.fillStyle(0x2f7a51, 0.25);
      decor.fillRect(innerLeft + 18, FLOOR_TOP - 120, 8, 96);
      decor.fillRect(innerLeft + 100, FLOOR_TOP - 142, 9, 118);
      decor.fillStyle(0x3e965d, 0.28);
      decor.fillEllipse(innerLeft + 22, FLOOR_TOP - 126, 58, 28);
      decor.fillEllipse(innerLeft + 108, FLOOR_TOP - 150, 64, 34);
      decor.fillEllipse(innerLeft + 84, FLOOR_TOP - 116, 48, 24);
      decor.fillStyle(0xb8d8e7, 0.45);
      decor.fillRect(innerLeft + 8, innerTop + 10, 42, innerHeight - 28);
      decor.fillRect(innerLeft + 86, innerTop + 34, 26, innerHeight - 58);

      decor.fillStyle(0x405674, 1);
      decor.fillRect(doorLeft, doorTop, 7, doorHeight);
      decor.fillRect(doorLeft + doorWidth - 7, doorTop, 7, doorHeight);
      decor.fillRect(WINDOW_X - 4, doorTop, 8, doorHeight);
      decor.fillRect(doorLeft, doorTop, doorWidth, 7);
      decor.fillRect(doorLeft, FLOOR_TOP - 8, doorWidth, 8);
      decor.fillRect(innerLeft, doorTop + 82, innerWidth, 6);
      decor.fillRect(innerLeft, doorTop + 160, innerWidth, 6);

      decor.fillStyle(0x627b8e, 0.72);
      decor.fillRect(innerLeft + 10, FLOOR_TOP - 88, innerWidth - 20, 4);
      decor.fillRect(innerLeft + 10, FLOOR_TOP - 68, innerWidth - 20, 4);
      for (let rail = 0; rail < 5; rail += 1) {
        decor.fillRect(innerLeft + 20 + rail * 24, FLOOR_TOP - 86, 3, 22);
      }

      decor.fillStyle(0xf4c95d, 0.95);
      decor.fillRect(WINDOW_X - 13, doorTop + 132, 7, 4);
      decor.fillRect(WINDOW_X + 6, doorTop + 132, 7, 4);

      decor.fillStyle(0x2e725f, 0.92);
      decor.fillRect(doorLeft - 14, doorTop - 4, 12, doorHeight + 4);
      decor.fillRect(doorLeft + doorWidth + 2, doorTop - 4, 12, doorHeight + 4);
      decor.fillStyle(0x88b99a, 0.9);
      decor.fillRect(doorLeft - 10, doorTop + 10, 5, 118);
      decor.fillRect(doorLeft + doorWidth + 5, doorTop + 10, 5, 118);
      return;
    }

    if (this.level.id === "bedroom") {
      decor.fillStyle(this.level.palette.wall, 1);
      decor.fillRect(WINDOW_X - 110, WINDOW_Y - 76, 220, 152);
      decor.fillStyle(0x405674, 1);
      decor.fillCircle(WINDOW_X, WINDOW_Y, 67);
      decor.fillStyle(0x1f2635, 1);
      decor.fillCircle(WINDOW_X, WINDOW_Y, 60);
      decor.fillStyle(0xb4c7e2, 0.96);
      decor.fillCircle(WINDOW_X, WINDOW_Y, 54);
      decor.fillStyle(0xf2b7df, 0.88);
      decor.fillTriangle(WINDOW_X, WINDOW_Y - 52, WINDOW_X - 46, WINDOW_Y - 8, WINDOW_X, WINDOW_Y);
      decor.fillStyle(0x8ee6ff, 0.88);
      decor.fillTriangle(WINDOW_X, WINDOW_Y - 52, WINDOW_X + 46, WINDOW_Y - 8, WINDOW_X, WINDOW_Y);
      decor.fillStyle(0xffd56f, 0.88);
      decor.fillTriangle(WINDOW_X - 48, WINDOW_Y + 4, WINDOW_X, WINDOW_Y, WINDOW_X - 20, WINDOW_Y + 48);
      decor.fillStyle(0xb7f28b, 0.84);
      decor.fillTriangle(WINDOW_X + 48, WINDOW_Y + 4, WINDOW_X, WINDOW_Y, WINDOW_X + 20, WINDOW_Y + 48);
      decor.lineStyle(4, 0x405674, 1);
      decor.strokeCircle(WINDOW_X, WINDOW_Y, 60);
      decor.lineBetween(WINDOW_X - 50, WINDOW_Y, WINDOW_X + 50, WINDOW_Y);
      decor.lineBetween(WINDOW_X, WINDOW_Y - 55, WINDOW_X, WINDOW_Y + 55);
      decor.lineStyle(2, 0xf9e8c8, 0.55);
      decor.lineBetween(WINDOW_X - 34, WINDOW_Y - 34, WINDOW_X + 34, WINDOW_Y + 34);
      decor.lineBetween(WINDOW_X + 34, WINDOW_Y - 34, WINDOW_X - 34, WINDOW_Y + 34);
      return;
    }

    if (this.level.id === "cat-hammock") {
      decor.fillStyle(0x4f5588, 0.95);
      decor.fillRect(WINDOW_X - 90, WINDOW_Y - 57, 180, 126);
      decor.fillStyle(0xaecce3, 0.88);
      decor.fillRect(WINDOW_X - 75, WINDOW_Y - 42, 62, 94);
      decor.fillRect(WINDOW_X + 13, WINDOW_Y - 42, 62, 94);
      decor.fillStyle(0x405674, 1);
      decor.fillRect(WINDOW_X - 82, WINDOW_Y - 50, 76, 6);
      decor.fillRect(WINDOW_X - 82, WINDOW_Y + 50, 76, 6);
      decor.fillRect(WINDOW_X + 6, WINDOW_Y - 50, 76, 6);
      decor.fillRect(WINDOW_X + 6, WINDOW_Y + 50, 76, 6);
      decor.fillRect(WINDOW_X - 45, WINDOW_Y - 44, 5, 99);
      decor.fillRect(WINDOW_X + 42, WINDOW_Y - 44, 5, 99);
      decor.fillStyle(0x24354f, 0.72);
      decor.fillRect(WINDOW_X - 70, WINDOW_Y + 18, 18, 34);
      decor.fillRect(WINDOW_X - 46, WINDOW_Y + 2, 22, 50);
      decor.fillRect(WINDOW_X + 28, WINDOW_Y + 12, 20, 40);
      decor.fillRect(WINDOW_X + 54, WINDOW_Y - 4, 18, 56);
      decor.fillStyle(0xffd56f, 0.78);
      decor.fillRect(WINDOW_X - 40, WINDOW_Y + 15, 3, 3);
      decor.fillRect(WINDOW_X + 36, WINDOW_Y + 23, 3, 3);
      decor.fillRect(WINDOW_X + 60, WINDOW_Y + 8, 3, 3);
      decor.fillStyle(0xf9e8c8, 0.82);
      decor.fillCircle(WINDOW_X - 45, WINDOW_Y - 12, 9);
      decor.fillStyle(0xaecce3, 0.55);
      decor.fillCircle(WINDOW_X - 41, WINDOW_Y - 15, 8);
      decor.fillStyle(0xf9e8c8, 0.68);
      decor.fillRect(WINDOW_X + 18, WINDOW_Y - 28, 2, 2);
      decor.fillRect(WINDOW_X + 58, WINDOW_Y - 18, 1, 1);
      decor.fillRect(WINDOW_X - 8, WINDOW_Y - 34, 1, 1);
      decor.fillStyle(0x8a5c80, 0.72);
      decor.fillRect(WINDOW_X - 108, WINDOW_Y - 62, 13, 134);
      decor.fillRect(WINDOW_X + 95, WINDOW_Y - 62, 13, 134);
      decor.fillStyle(0xf2b7df, 0.74);
      decor.fillRect(WINDOW_X - 104, WINDOW_Y - 52, 5, 98);
      decor.fillRect(WINDOW_X + 99, WINDOW_Y - 52, 5, 98);
      return;
    }

    if (this.level.id === "greenhouse") {
      return;
    }

    decor.fillStyle(0xb86f83, 0.58);
    decor.fillRect(WINDOW_X - 112, WINDOW_Y - 60, 12, 122);
    decor.fillRect(WINDOW_X + 100, WINDOW_Y - 60, 12, 122);
    decor.fillStyle(0xf0b46a, 0.72);
    decor.fillRect(WINDOW_X - 113, WINDOW_Y + 16, 16, 5);
    decor.fillRect(WINDOW_X + 97, WINDOW_Y + 16, 16, 5);
  }

  private drawThemedRoomDecor(decor: Phaser.GameObjects.Graphics): void {
    if (this.level.id === "bedroom") {
      decor.fillStyle(0x5f4b68, 0.62);
      decor.fillRect(58, FLOOR_TOP - 12, 310, 6);
      decor.fillStyle(0x493c53, 0.95);
      decor.fillRect(322, FLOOR_TOP - 63, 52, 63);
      decor.fillStyle(0x806b8d, 1);
      decor.fillRect(326, FLOOR_TOP - 67, 44, 14);
      decor.fillStyle(0xb4c7e2, 0.78);
      decor.fillRect(333, FLOOR_TOP - 60, 29, 4);
      decor.fillStyle(0xf4c95d, 0.95);
      decor.fillRect(343, FLOOR_TOP - 47, 10, 3);
      decor.fillStyle(0x1f2635, 1);
      decor.fillRect(333, FLOOR_TOP - 9, 9, 9);
      decor.fillRect(356, FLOOR_TOP - 9, 9, 9);
      decor.fillStyle(0xf2b7df, 0.55);
      decor.fillRect(690, 87, 28, 12);
      decor.fillStyle(0xf9e8c8, 0.62);
      decor.fillRect(696, 91, 16, 2);
      return;
    }

    if (this.level.id === "greenhouse") {
      const glassLeft = 38;
      const glassTop = 56;
      const glassWidth = 692;
      const glassHeight = 312;
      const doorLeft = WINDOW_X - 82;
      const doorTop = 82;
      const doorWidth = 164;
      const doorHeight = FLOOR_TOP - doorTop - 12;

      decor.fillStyle(0xd9fff1, 0.12);
      decor.fillRect(glassLeft, glassTop, glassWidth, glassHeight);
      decor.fillStyle(0xbfeaff, 0.12);
      decor.fillRect(glassLeft + 10, glassTop + 18, glassWidth - 20, glassHeight - 36);

      decor.lineStyle(3, 0xd9fff1, 0.36);
      decor.lineBetween(glassLeft, glassTop, WORLD_WIDTH / 2, 34);
      decor.lineBetween(WORLD_WIDTH / 2, 34, glassLeft + glassWidth, glassTop);
      decor.lineBetween(WORLD_WIDTH / 2, 34, WORLD_WIDTH / 2, glassTop + glassHeight);
      decor.lineStyle(2, 0xd9fff1, 0.3);
      for (let x = glassLeft + 44; x <= glassLeft + glassWidth - 36; x += 72) {
        decor.lineBetween(x, glassTop + 18, x, glassTop + glassHeight - 16);
      }
      for (let y = glassTop + 62; y <= glassTop + glassHeight - 36; y += 54) {
        decor.lineBetween(glassLeft + 12, y, glassLeft + glassWidth - 12, y);
      }

      decor.fillStyle(0x2f6b5a, 0.25);
      decor.fillRect(84, 210, 10, 132);
      decor.fillRect(668, 190, 12, 150);
      decor.fillEllipse(76, 198, 96, 30);
      decor.fillEllipse(112, 232, 118, 34);
      decor.fillEllipse(684, 194, 126, 34);
      decor.fillEllipse(708, 246, 92, 30);
      decor.fillStyle(0x4f8f55, 0.34);
      for (let leaf = 0; leaf < 6; leaf += 1) {
        decor.fillEllipse(48 + leaf * 12, 258 - leaf * 18, 52, 17);
        decor.fillEllipse(720 - leaf * 10, 230 + leaf * 18, 56, 17);
      }

      decor.fillStyle(0x315c45, 0.92);
      decor.fillRect(doorLeft, doorTop, doorWidth, doorHeight);
      decor.fillStyle(0xbfeaff, 0.28);
      decor.fillRect(doorLeft + 9, doorTop + 10, doorWidth / 2 - 13, doorHeight - 20);
      decor.fillRect(WINDOW_X + 4, doorTop + 10, doorWidth / 2 - 13, doorHeight - 20);
      decor.fillStyle(0xd9fff1, 0.16);
      decor.fillRect(doorLeft + 18, doorTop + 22, 42, doorHeight - 56);
      decor.fillRect(WINDOW_X + 16, doorTop + 38, 36, doorHeight - 82);
      decor.fillStyle(0x315c45, 1);
      decor.fillRect(doorLeft, doorTop, doorWidth, 7);
      decor.fillRect(doorLeft, doorTop + doorHeight - 8, doorWidth, 8);
      decor.fillRect(doorLeft, doorTop, 7, doorHeight);
      decor.fillRect(doorLeft + doorWidth - 7, doorTop, 7, doorHeight);
      decor.fillRect(WINDOW_X - 4, doorTop, 8, doorHeight);
      decor.fillRect(doorLeft + 10, doorTop + 88, doorWidth - 20, 5);
      decor.fillRect(doorLeft + 10, doorTop + 174, doorWidth - 20, 5);
      decor.fillStyle(0xf4c95d, 0.88);
      decor.fillRect(WINDOW_X - 14, doorTop + 142, 7, 4);
      decor.fillRect(WINDOW_X + 7, doorTop + 142, 7, 4);
      decor.fillStyle(0x6d8d76, 0.9);
      decor.fillRect(doorLeft - 12, doorTop + doorHeight - 4, doorWidth + 24, 9);
      decor.fillStyle(0xf9e8c8, 0.35);
      decor.fillRect(doorLeft + 18, doorTop + 20, 44, 3);
      decor.fillRect(WINDOW_X + 18, doorTop + 36, 42, 3);

      decor.lineStyle(2, 0x4f6b4d, 0.78);
      [150, 248, 602, 688].forEach((x, index) => {
        const top = 48 + (index % 2) * 8;
        decor.lineBetween(x, 38, x, top + 48);
        decor.fillStyle(index % 2 === 0 ? 0x6f8f45 : 0x8a7440, 0.9);
        decor.fillRect(x - 11, top + 44, 22, 8);
        decor.fillStyle(0x5f8a5a, 0.94);
        for (let strand = 0; strand < 5; strand += 1) {
          decor.fillRect(x - 16 + strand * 8, top + 53, 4, 34 + strand * 3);
        }
      });

      decor.fillStyle(0x315c45, 0.48);
      decor.fillRect(88, FLOOR_TOP - 58, 78, 10);
      decor.fillRect(104, FLOOR_TOP - 48, 7, 34);
      decor.fillRect(146, FLOOR_TOP - 48, 7, 34);
      decor.fillStyle(0x6d4c3c, 0.92);
      decor.fillRect(674, FLOOR_TOP - 74, 30, 48);
      decor.fillStyle(0x4f6b4d, 0.95);
      decor.fillEllipse(689, FLOOR_TOP - 86, 70, 36);
      decor.fillEllipse(665, FLOOR_TOP - 66, 58, 26);
      return;
    }

    if (this.level.id === "grandma-corner") {
      decor.fillStyle(0xefe0c8, 0.82);
      for (let scallop = 0; scallop < 8; scallop += 1) {
        decor.fillCircle(WINDOW_X - 78 + scallop * 22, WINDOW_Y - 55, 8);
      }

      decor.fillStyle(0x6b4b3d, 1);
      decor.fillRect(284, FLOOR_TOP - 42, 56, 8);
      decor.fillRect(310, FLOOR_TOP - 34, 6, 29);
      decor.fillStyle(0xd08a55, 1);
      decor.fillRect(290, FLOOR_TOP - 49, 44, 8);
      decor.fillStyle(0x8a5c80, 0.94);
      decor.fillEllipse(312, FLOOR_TOP - 56, 48, 16);
      decor.fillStyle(0xf2b7df, 0.92);
      decor.fillCircle(300, FLOOR_TOP - 62, 8);
      decor.fillCircle(316, FLOOR_TOP - 65, 8);
      decor.fillStyle(0xffd56f, 0.86);
      decor.fillCircle(327, FLOOR_TOP - 60, 7);
      decor.lineStyle(1, 0xf9e8c8, 0.72);
      decor.lineBetween(300, FLOOR_TOP - 62, 342, FLOOR_TOP - 78);
      decor.lineBetween(316, FLOOR_TOP - 65, 350, FLOOR_TOP - 76);
      return;
    }
  }

  private drawReadableHouseholdProps(decor: Phaser.GameObjects.Graphics): void {
    if (this.level.id === "window-bed") {
      decor.fillStyle(0xf9e8c8, 1);
      decor.fillRect(154, FLOOR_TOP - 82, 18, 13);
      decor.fillStyle(0x8ee6ff, 0.9);
      decor.fillRect(158, FLOOR_TOP - 79, 10, 4);
      decor.fillStyle(0xdcc98f, 1);
      decor.fillRect(254, FLOOR_TOP - 72, 30, 6);
      decor.fillStyle(0xff8eb5, 0.92);
      decor.fillRect(260, FLOOR_TOP - 82, 18, 10);
      decor.fillStyle(0xf9e8c8, 0.82);
      decor.fillRect(263, FLOOR_TOP - 79, 12, 2);
      decor.fillStyle(0x6b4b3d, 0.72);
      decor.fillRect(256, FLOOR_TOP - 68, 26, 2);
      return;
    }

    if (this.level.id === "desk-laptop") {
      decor.fillStyle(0xf9e8c8, 0.95);
      decor.fillRect(470, FLOOR_TOP - 24, 42, 5);
      decor.fillStyle(0xf2b7df, 0.95);
      decor.fillRect(476, FLOOR_TOP - 31, 34, 7);
      decor.fillStyle(0xdcc98f, 0.9);
      decor.fillRect(160, FLOOR_TOP - 20, 22, 6);
      return;
    }

    if (this.level.id === "cat-hammock") {
      decor.fillStyle(0x2a2435, 0.88);
      decor.fillRect(428, FLOOR_TOP - 20, 38, 6);
      decor.fillStyle(0xf4c95d, 0.88);
      decor.fillRect(436, FLOOR_TOP - 29, 22, 9);
      decor.fillStyle(0x8ee6ff, 0.92);
      decor.fillRect(596, FLOOR_TOP - 54, 30, 4);
      decor.fillStyle(0xf9e8c8, 0.92);
      decor.fillRect(600, FLOOR_TOP - 60, 22, 6);
      return;
    }

    if (this.level.id === "bedroom") {
      decor.fillStyle(0x8fa7c7, 0.9);
      decor.fillRect(54, FLOOR_TOP - 14, 28, 6);
      decor.fillRect(90, FLOOR_TOP - 14, 28, 6);
      decor.fillStyle(0xf2b7df, 0.86);
      decor.fillRect(670, FLOOR_TOP - 21, 22, 10);
      return;
    }

    if (this.level.id === "greenhouse") {
      decor.fillStyle(0x6d8d76, 0.95);
      decor.fillRect(88, FLOOR_TOP - 33, 34, 22);
      decor.fillStyle(0x8ee6ff, 0.75);
      decor.fillRect(95, FLOOR_TOP - 29, 20, 8);
      decor.fillStyle(0xb7f28b, 0.9);
      decor.fillRect(126, FLOOR_TOP - 25, 20, 5);
    }
  }

  private drawCeilingHangings(decor: Phaser.GameObjects.Graphics): void {
    if (this.level.id === "desk-laptop") {
      decor.fillStyle(0x24354f, 0.72);
      decor.fillRect(500, 26, 92, 5);
      decor.fillRect(594, 28, 76, 5);
      decor.lineStyle(2, 0x24354f, 0.78);
      decor.lineBetween(532, 31, 532, 64);
      decor.lineBetween(628, 33, 628, 72);
      decor.fillStyle(0xffd56f, 0.74);
      decor.fillRect(522, 64, 21, 9);
      decor.fillStyle(0x8ee6ff, 0.6);
      decor.fillRect(620, 72, 17, 12);
      return;
    }

    if (this.level.id === "cat-hammock") {
      decor.lineStyle(2, 0x78a094, 0.72);
      decor.lineBetween(500, 22, 492, 74);
      decor.lineBetween(522, 18, 520, 84);
      decor.lineBetween(546, 24, 560, 78);
      decor.fillStyle(0xf2b7df, 0.78);
      decor.fillCircle(492, 76, 4);
      decor.fillCircle(520, 86, 3);
      decor.fillStyle(0xffd56f, 0.82);
      decor.fillRect(557, 78, 7, 7);
      return;
    }

    decor.fillStyle(0x5f8298, 0.5);
    decor.fillRect(585, 24, 34, 5);
    decor.fillRect(632, 28, 28, 4);
  }

  private drawWallpaper(): void {
    const graphics = this.add.graphics().setDepth(-8);
    const palette = this.level.palette;

    graphics.fillStyle(palette.wallpaper, 0.22);

    if (this.level.wallpaper === "diamonds") {
      for (let y = 58; y < FLOOR_TOP - 20; y += 38) {
        for (let x = 36; x < WORLD_WIDTH; x += 44) {
          graphics.fillTriangle(x, y - 7, x + 8, y, x, y + 7);
          graphics.fillTriangle(x, y - 7, x - 8, y, x, y + 7);
        }
      }
    } else if (this.level.wallpaper === "panels") {
      graphics.lineStyle(1, palette.wallpaper, 0.26);
      for (let x = 28; x < WORLD_WIDTH; x += 52) {
        graphics.lineBetween(x, 36, x, FLOOR_TOP - 20);
      }
      for (let y = 54; y < FLOOR_TOP - 20; y += 42) {
        graphics.lineBetween(12, y, WORLD_WIDTH - 12, y);
      }
    } else {
      for (let index = 0; index < 72; index += 1) {
        const x = 24 + (index * 37) % (WORLD_WIDTH - 48);
        const y = 42 + (index * 29) % (FLOOR_TOP - 70);
        const size = index % 4 === 0 ? 3 : 2;
        graphics.fillStyle(index % 3 === 0 ? palette.wallpaperAccent : palette.wallpaper, 0.28);
        graphics.fillRect(x, y, size, size);
        graphics.fillRect(x + 1, y - 1, 1, size + 2);
      }
    }
  }

  private drawFurniture(): void {
    const graphics = this.add.graphics().setDepth(-1);

    this.level.furniture.forEach((item) => {
      const floorY = FLOOR_TOP;

      graphics.fillStyle(0x1f2635, 0.2);
      graphics.fillEllipse(item.x, floorY + 5, item.width + 22, 12);

      if (item.kind === "table") {
        const topY = item.y;
        const left = item.x - item.width / 2;
        const right = item.x + item.width / 2;

        if (this.level.id === "greenhouse") {
          graphics.fillStyle(0x1f2635, 0.14);
          graphics.fillEllipse(item.x, FLOOR_TOP + 4, item.width + 34, 12);
          graphics.fillStyle(0xd9fff1, 0.5);
          graphics.fillRect(left + 18, topY + 2, item.width - 36, 8);
          graphics.fillStyle(0x8ee6ff, 0.28);
          graphics.fillRect(left + 28, topY - 4, item.width - 56, 7);
          graphics.fillStyle(0xd9fff1, 0.55);
          graphics.fillRect(left + 34, topY + 10, 5, FLOOR_TOP - topY - 18);
          graphics.fillRect(right - 39, topY + 10, 5, FLOOR_TOP - topY - 18);
          graphics.fillRect(left + 70, topY + 25, item.width - 140, 4);

          graphics.fillStyle(0x315c45, 0.95);
          graphics.fillRect(left - 38, FLOOR_TOP - 58, 34, 8);
          graphics.fillRect(right + 4, FLOOR_TOP - 58, 34, 8);
          graphics.fillRect(left - 32, FLOOR_TOP - 50, 5, 42);
          graphics.fillRect(left - 14, FLOOR_TOP - 50, 5, 42);
          graphics.fillRect(right + 14, FLOOR_TOP - 50, 5, 42);
          graphics.fillRect(right + 31, FLOOR_TOP - 50, 5, 42);
          graphics.fillStyle(0x8fd37b, 0.9);
          graphics.fillRect(left - 42, FLOOR_TOP - 70, 28, 8);
          graphics.fillRect(right + 14, FLOOR_TOP - 70, 28, 8);
          graphics.fillStyle(0xd9fff1, 0.4);
          graphics.fillRect(left - 36, FLOOR_TOP - 68, 18, 3);
          graphics.fillRect(right + 20, FLOOR_TOP - 68, 18, 3);

          graphics.fillStyle(0x1f2635, 0.18);
          graphics.fillEllipse(item.x + 18, topY + 2, 70, 8);
          graphics.fillStyle(0x315c45, 1);
          graphics.fillRect(item.x - 7, topY - 13, 52, 12);
          graphics.fillStyle(0x5f8a5a, 1);
          graphics.fillRect(item.x - 3, topY - 18, 44, 12);
          graphics.fillStyle(0xa5df83, 1);
          graphics.fillRect(item.x + 1, topY - 21, 36, 6);
          graphics.fillStyle(0xf9e8c8, 0.9);
          graphics.fillRect(item.x + 8, topY - 19, 22, 3);
          const apples = [
            { x: -2, y: -27, c: 0xf04f4f },
            { x: 10, y: -30, c: 0xffbd66 },
            { x: 22, y: -27, c: 0xd64f63 },
            { x: 32, y: -30, c: 0xa5df83 }
          ];
          apples.forEach((apple) => {
            graphics.fillStyle(0x315c45, 1);
            graphics.fillRect(item.x + apple.x + 2, topY + apple.y - 6, 2, 4);
            graphics.fillStyle(apple.c, 1);
            graphics.fillCircle(item.x + apple.x + 4, topY + apple.y, 6);
            graphics.fillStyle(0xfff0b5, 0.55);
            graphics.fillRect(item.x + apple.x + 2, topY + apple.y - 4, 2, 2);
          });
          graphics.fillStyle(0xf9e8c8, 0.58);
          graphics.fillEllipse(item.x - 38, topY - 1, 34, 7);
          graphics.fillStyle(0x5f8a5a, 0.5);
          graphics.fillRect(item.x - 53, topY, 30, 2);
          [{ x: -50, y: -6 }, { x: -42, y: -7 }, { x: -36, y: -5 }, { x: -28, y: -6 }].forEach((berry) => {
            graphics.fillStyle(0x7f4f42, 1);
            graphics.fillCircle(item.x + berry.x, topY + berry.y, 3);
            graphics.fillStyle(0xf2b7df, 0.65);
            graphics.fillRect(item.x + berry.x - 1, topY + berry.y - 2, 1, 1);
          });
          return;
        }

        graphics.fillStyle(0x1f2635, 0.18);
        graphics.fillEllipse(item.x, floorY + 4, item.width + 32, 12);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(left, topY + 6, item.width, 13);
        graphics.fillStyle(0xb86f3d, 1);
        graphics.fillRect(left + 8, topY, item.width - 16, 12);
        graphics.fillStyle(0xf4c95d, 1);
        graphics.fillRect(left + 20, topY + 3, item.width - 40, 4);
        graphics.fillStyle(0x6b4b3d, 1);
        graphics.fillRect(item.x - 8, topY + 19, 16, floorY - topY - 26);
        graphics.lineStyle(6, 0x3c2b30, 1);
        graphics.lineBetween(item.x - 5, floorY - 18, item.x - 45, floorY - 4);
        graphics.lineBetween(item.x + 5, floorY - 18, item.x + 45, floorY - 4);
        graphics.lineStyle(4, 0xd17a2f, 1);
        graphics.lineBetween(item.x - 3, floorY - 20, item.x - 40, floorY - 5);
        graphics.lineBetween(item.x + 3, floorY - 20, item.x + 40, floorY - 5);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(item.x - 58, floorY - 6, 116, 6);

        if (this.level.id === "window-bed" && this.textures.exists("decor-tea-set")) {
          this.add.image(item.x, topY + 13, "decor-tea-set")
            .setOrigin(0.5, 1)
            .setScale(0.76)
            .setDepth(0);
          return;
        }

        graphics.fillStyle(0x24354f, 1);
        graphics.fillRect(item.x - 18, topY - 22, 28, 22);
        graphics.fillRect(item.x + 8, topY - 16, 8, 10);
        graphics.fillStyle(0x8ee6ff, 0.9);
        graphics.fillRect(item.x - 13, topY - 18, 18, 5);
        graphics.fillStyle(0xf4c95d, 1);
        graphics.fillRect(item.x - 72, topY - 12, 18, 12);
        graphics.fillRect(item.x + 54, topY - 12, 18, 12);
        graphics.fillStyle(0xf9e8c8, 1);
        graphics.fillRect(item.x - 69, topY - 9, 12, 4);
        graphics.fillRect(item.x + 57, topY - 9, 12, 4);
        return;
      }

      if (item.kind === "chair") {
        const facing = item.x < 210 ? -1 : 1;
        const seatY = item.y;
        const seatLeft = item.x - item.width / 2;
        const backX = item.x + facing * (item.width * 0.38);

        graphics.fillStyle(0x1f2635, 0.16);
        graphics.fillEllipse(item.x, floorY + 3, item.width + 12, 8);
        graphics.lineStyle(7, 0x3c2b30, 1);
        graphics.lineBetween(backX, seatY - 2, backX + facing * 12, seatY - item.height + 4);
        graphics.lineStyle(5, 0x2f3342, 1);
        graphics.lineBetween(backX, seatY - 2, backX + facing * 12, seatY - item.height + 4);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(seatLeft + 4, seatY, item.width - 8, 12);
        graphics.fillStyle(0xb86f3d, 1);
        graphics.fillRect(seatLeft + 12, seatY - 5, item.width - 24, 10);
        graphics.fillStyle(0xf4c95d, 0.95);
        graphics.fillRect(seatLeft + 18, seatY - 7, item.width - 36, 4);
        graphics.lineStyle(5, 0x2f3342, 1);
        graphics.lineBetween(seatLeft + item.width * 0.28, seatY + 12, seatLeft + item.width * 0.18, floorY);
        graphics.lineBetween(seatLeft + item.width * 0.72, seatY + 12, seatLeft + item.width * 0.82, floorY);
        graphics.lineStyle(3, 0xd17a2f, 1);
        graphics.lineBetween(seatLeft + item.width * 0.31, seatY + 12, seatLeft + item.width * 0.21, floorY - 3);
        graphics.lineBetween(seatLeft + item.width * 0.69, seatY + 12, seatLeft + item.width * 0.79, floorY - 3);
        return;
      }

      if (item.kind === "bed") {
        const left = item.x - item.width / 2;
        const right = item.x + item.width / 2;
        const headboardTop = FLOOR_TOP - item.height;
        const mattressTop = FLOOR_TOP - 62;
        const blanketTop = FLOOR_TOP - 47;

        graphics.fillStyle(0x1f2635, 0.2);
        graphics.fillEllipse(item.x, FLOOR_TOP + 5, item.width + 38, 14);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(left + 2, headboardTop, 36, FLOOR_TOP - headboardTop);
        graphics.fillRect(right - 24, FLOOR_TOP - 70, 22, 70);
        graphics.fillStyle(0x6b5872, 1);
        graphics.fillRect(left + 10, headboardTop + 10, 22, FLOOR_TOP - headboardTop - 20);
        graphics.fillStyle(0x4b3448, 1);
        graphics.fillRect(left + 28, FLOOR_TOP - 48, item.width - 48, 35);
        graphics.fillStyle(0xf9e8c8, 1);
        graphics.fillRect(left + 42, mattressTop, item.width - 78, 25);
        graphics.fillStyle(0xb4c7e2, 1);
        graphics.fillRect(left + 44, mattressTop + 4, item.width - 86, 16);
        graphics.fillStyle(0xf9e8c8, 0.96);
        graphics.fillRect(left + 50, mattressTop - 10, 56, 18);
        graphics.fillStyle(0x8fa7c7, 1);
        graphics.fillRect(left + 108, blanketTop, item.width - 138, 38);
        graphics.fillStyle(0x596680, 1);
        graphics.fillRect(left + 118, blanketTop + 8, item.width - 158, 8);
        graphics.fillStyle(0xf2b7df, 0.82);
        graphics.fillRect(left + 126, blanketTop - 7, 56, 7);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(left + 24, FLOOR_TOP - 10, 9, 10);
        graphics.fillRect(right - 34, FLOOR_TOP - 10, 9, 10);
        graphics.fillStyle(0xf9e8c8, 0.56);
        graphics.fillRect(left + 58, mattressTop + 3, 34, 2);
        return;
      }

      if (item.kind === "tv-stand") {
        const left = item.x - item.width / 2;
        const right = item.x + item.width / 2;
        const topY = item.y;

        graphics.fillStyle(0x2a2435, 1);
        graphics.fillRect(left, topY + 8, item.width, 14);
        graphics.fillStyle(0x6b4b3d, 1);
        graphics.fillRect(left + 6, topY, item.width - 12, 14);
        graphics.fillStyle(0xb88952, 0.95);
        graphics.fillRect(left + 16, topY + 3, item.width - 32, 4);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(left + 18, topY + 22, 8, FLOOR_TOP - topY - 22);
        graphics.fillRect(right - 26, topY + 22, 8, FLOOR_TOP - topY - 22);

        if (this.tvBroken) {
          this.drawBrokenTvOnStand(graphics, item);
        } else {
          this.drawTvScreen(item);
        }

        graphics.fillStyle(0xdcc98f, 0.95);
        graphics.fillRect(left + 20, topY - 9, 22, 9);
        graphics.fillStyle(0x8ee6ff, 0.95);
        graphics.fillRect(right - 38, topY - 13, 20, 13);
        return;
      }

      if (item.kind === "sofa") {
        const left = item.x - item.width / 2;
        const right = item.x + item.width / 2;
        const backTop = item.y - item.height + 22;
        const seatY = item.y;
        const backBottom = seatY + 6;
        const sofaDark = this.level.id === "cat-hammock" ? 0x4b3448 : 0x2f624c;
        const sofaBody = this.level.id === "cat-hammock" ? 0x8a5c80 : 0x62ad69;
        const sofaSeat = this.level.id === "cat-hammock" ? 0x6a4f82 : 0x4f995c;
        const sofaArm = this.level.id === "cat-hammock" ? 0x5f3f66 : 0x3b7e51;
        const sofaButton = this.level.id === "cat-hammock" ? 0xf2b7df : 0x3d8750;

        graphics.fillStyle(sofaDark, 1);
        graphics.fillRect(left + 12, backTop + 8, item.width - 24, backBottom - backTop);
        graphics.fillStyle(sofaBody, 1);
        graphics.fillRect(left + 20, backTop, item.width - 40, seatY - backTop + 8);
        graphics.fillStyle(sofaSeat, 1);
        graphics.fillRect(left + 14, seatY, item.width - 28, 30);
        graphics.fillStyle(sofaArm, 1);
        graphics.fillRect(left + 6, seatY - 10, 28, floorY - seatY + 2);
        graphics.fillRect(right - 34, seatY - 10, 28, floorY - seatY + 2);
        graphics.fillStyle(sofaDark, 1);
        graphics.fillRect(left + 28, seatY + 20, item.width - 56, 10);
        graphics.fillStyle(0x1f2635, 0.34);
        graphics.fillRect(left + 16, floorY - 18, item.width - 32, 9);
        graphics.fillStyle(0x2b3d35, 1);
        graphics.fillRect(left + 18, floorY - 10, 8, 10);
        graphics.fillRect(right - 26, floorY - 10, 8, 10);
        graphics.fillStyle(sofaButton, 0.9);
        graphics.fillRect(item.x - 42, backTop + 24, 6, 6);
        graphics.fillRect(item.x - 4, backTop + 30, 6, 6);
        graphics.fillRect(item.x + 34, backTop + 24, 6, 6);
        const sofaHighlight = this.level.id === "cat-hammock" ? 0xd9b0cf : 0x8fd37b;
        graphics.fillStyle(sofaHighlight, 0.18);
        graphics.fillRect(left + 28, backTop + 8, item.width - 56, 3);
        graphics.fillStyle(sofaDark, 0.58);
        graphics.fillRect(left + 34, seatY + 29, item.width - 68, 5);
        graphics.fillStyle(sofaDark, 0.42);
        graphics.fillRect(item.x - 2, backTop + 11, 4, seatY - backTop + 8);
        graphics.fillRect(item.x - 62, seatY + 6, 4, 18);
        graphics.fillRect(item.x + 58, seatY + 6, 4, 18);
        return;
      }

      if (item.kind === "armchair") {
        const left = item.x - item.width / 2;
        const right = item.x + item.width / 2;
        const backTop = FLOOR_TOP - item.height;
        const seatY = FLOOR_TOP - 54;
        const armWidth = 26;
        const base = this.level.id === "grandma-corner" ? 0x7c3f50 : 0x5f6f8f;
        const cushion = this.level.id === "grandma-corner" ? 0xb86f83 : 0x8fa7c7;
        const dark = this.level.id === "grandma-corner" ? 0x3c2b30 : 0x405674;
        const highlight = this.level.id === "grandma-corner" ? 0xf0b46a : 0xb4c7e2;
        const warmLight = this.level.id === "grandma-corner" ? 0xf2c19b : 0xdce7f6;

        graphics.fillStyle(dark, 0.35);
        graphics.fillRect(left + 10, FLOOR_TOP - 8, item.width - 20, 8);
        graphics.fillStyle(dark, 1);
        graphics.fillRect(left + 24, backTop + 8, item.width - 48, 10);
        graphics.fillRect(left + 16, backTop + 18, item.width - 32, 86);
        graphics.fillRect(left + 10, backTop + 34, 10, 56);
        graphics.fillRect(right - 20, backTop + 34, 10, 56);
        graphics.fillStyle(base, 1);
        graphics.fillRect(left + 28, backTop + 16, item.width - 56, 8);
        graphics.fillRect(left + 24, backTop + 24, item.width - 48, 72);
        graphics.fillStyle(cushion, 1);
        graphics.fillRect(left + 34, backTop + 30, item.width - 68, 58);
        graphics.fillStyle(0xc98693, 1);
        graphics.fillRect(left + 42, backTop + 42, item.width - 84, 8);
        graphics.fillRect(left + 42, backTop + 60, item.width - 84, 5);
        graphics.fillRect(left + 42, backTop + 76, item.width - 84, 4);
        graphics.fillStyle(dark, 1);
        graphics.fillRect(left + 4, seatY - 18, armWidth + 12, 58);
        graphics.fillRect(right - armWidth - 16, seatY - 18, armWidth + 12, 58);
        graphics.fillRect(left + armWidth + 2, seatY + 18, item.width - armWidth * 2 - 4, 26);
        graphics.fillStyle(base, 1);
        graphics.fillRect(left + 8, seatY - 28, armWidth, 10);
        graphics.fillRect(left + 4, seatY - 18, armWidth + 6, 52);
        graphics.fillRect(right - armWidth - 8, seatY - 28, armWidth, 10);
        graphics.fillRect(right - armWidth - 10, seatY - 18, armWidth + 6, 52);
        graphics.fillStyle(cushion, 1);
        graphics.fillRect(left + armWidth + 12, seatY - 10, item.width - armWidth * 2 - 24, 32);
        graphics.fillStyle(0x93566a, 1);
        graphics.fillRect(left + armWidth + 18, seatY + 16, item.width - armWidth * 2 - 36, 6);
        graphics.fillStyle(highlight, 0.88);
        graphics.fillRect(left + armWidth + 24, seatY + 2, item.width - armWidth * 2 - 48, 6);
        graphics.fillStyle(warmLight, 0.45);
        graphics.fillRect(left + 44, backTop + 34, item.width - 88, 4);
        graphics.fillRect(left + 14, seatY - 12, 5, 34);
        graphics.fillRect(right - 20, seatY - 12, 5, 34);
        graphics.fillStyle(0x3c2b30, 1);
        graphics.fillRect(left + 18, FLOOR_TOP - 14, 9, 14);
        graphics.fillRect(right - 27, FLOOR_TOP - 14, 9, 14);
        return;
      }

      graphics.fillStyle(0x405674, 1);
      graphics.fillRect(item.x - item.width / 2 + 6, item.y + 6, item.width - 12, Math.max(14, floorY - (item.y + 6)));
      graphics.fillStyle(0x6f889b, 1);
      graphics.fillRect(item.x - item.width / 2, item.y, item.width, 18);
      graphics.fillStyle(0xaecce3, 0.75);
      graphics.fillRect(item.x - item.width / 2 + 8, item.y + 3, item.width - 16, 5);
    });
  }

  private getTvScreenWidth(): number {
    return this.level.id === "cat-hammock" ? 104 : 90;
  }

  private getTvScreenHeight(): number {
    return this.level.id === "cat-hammock" ? 72 : 42;
  }

  private drawTvScreen(item: FurnitureSpec): void {
    const topY = item.y;
    const screenWidth = this.getTvScreenWidth();
    const screenHeight = this.getTvScreenHeight();
    const screenLeft = item.x - screenWidth / 2;
    const screenTop = topY - screenHeight - 5;
    const graphics = this.add.graphics().setDepth(-0.8);

    graphics.fillStyle(0x1f2635, 1);
    graphics.fillRect(screenLeft, screenTop, screenWidth, screenHeight);
    graphics.fillStyle(0x24354f, 1);
    graphics.fillRect(screenLeft + 7, screenTop + 7, screenWidth - 14, screenHeight - 15);
    graphics.fillStyle(0x8ee6ff, 0.88);
    graphics.fillRect(screenLeft + 13, screenTop + 14, screenWidth - 26, screenHeight - 30);
    graphics.fillStyle(0xf2b7df, 0.9);
    graphics.fillRect(screenLeft + 20, screenTop + 26, screenWidth * 0.3, 4);
    graphics.fillStyle(0xffd56f, 0.9);
    graphics.fillRect(screenLeft + screenWidth - 40, screenTop + 43, 24, 4);
    graphics.fillStyle(0x493c53, 0.94);
    graphics.fillRect(item.x - screenWidth / 2 - 8, topY - 3, screenWidth + 16, 6);
    this.tvObjects.push(graphics);
  }

  private drawBrokenTvOnStand(graphics: Phaser.GameObjects.Graphics, item: FurnitureSpec): void {
    const topY = item.y;
    const screenWidth = this.getTvScreenWidth();
    const screenLeft = item.x - screenWidth / 2;

    graphics.fillStyle(0x1f2635, 0.95);
    graphics.fillRect(screenLeft + 24, topY - 10, screenWidth - 48, 5);
    graphics.fillStyle(0x8ee6ff, 0.45);
    graphics.fillRect(screenLeft + 14, topY - 16, 24, 5);
    graphics.fillStyle(0xf2b7df, 0.42);
    graphics.fillRect(screenLeft + screenWidth - 34, topY - 19, 22, 5);
    graphics.lineStyle(2, 0x1f2635, 0.8);
    graphics.lineBetween(screenLeft + 12, topY - 16, screenLeft + 34, topY - 4);
    graphics.lineBetween(screenLeft + screenWidth - 12, topY - 18, screenLeft + screenWidth - 42, topY - 4);
  }

  private createRoomLamps(): void {
    const savedLamps = new Map(
      this.restoredSave?.lamps?.map((lamp) => [lamp.id, lamp]) ?? []
    );
    const configs: RoomLamp[] = (this.level.decor?.lamps ?? []).map((lamp) => ({
      ...lamp,
      lit: true,
      knocked: false
    }));

    this.roomLamps = configs.map((lamp) => {
      const saved = savedLamps.get(lamp.id);
      return saved ? { ...lamp, lit: saved.lit, knocked: saved.knocked } : lamp;
    });
  }

  private drawRoomLamps(): void {
    this.lampGraphics.clear();

    this.roomLamps.forEach((lamp) => {
      if (lamp.knocked) {
        this.lampGraphics.fillStyle(0x2a2435, 1);
        this.lampGraphics.fillRect(lamp.x - 28, FLOOR_TOP - 9, 52, 6);
        this.lampGraphics.fillStyle(0x8a5c80, 1);
        this.lampGraphics.fillRect(lamp.x - 18, FLOOR_TOP - 18, 34, 10);
        this.lampGraphics.fillStyle(0xffd56f, lamp.lit ? 0.5 : 0.18);
        this.lampGraphics.fillRect(lamp.x - 12, FLOOR_TOP - 15, 22, 4);
        return;
      }

      if (lamp.kind === "floor") {
        this.lampGraphics.fillStyle(0x2a2435, 1);
        this.lampGraphics.fillRect(lamp.x - 3, lamp.shadeY + 40, 6, FLOOR_TOP - lamp.shadeY - 40);
        this.lampGraphics.fillRect(lamp.x - 30, FLOOR_TOP - 7, 60, 7);
        this.lampGraphics.fillStyle(0x8a5c80, 1);
        this.lampGraphics.fillRect(lamp.x - 24, FLOOR_TOP - 10, 48, 5);
        this.lampGraphics.fillStyle(0xf9e8c8, 1);
        this.lampGraphics.fillTriangle(lamp.x - 28, lamp.shadeY + 8, lamp.x + 28, lamp.shadeY + 8, lamp.x + 18, lamp.shadeY + 46);
        this.lampGraphics.fillTriangle(lamp.x - 28, lamp.shadeY + 8, lamp.x - 18, lamp.shadeY + 46, lamp.x + 18, lamp.shadeY + 46);
        this.lampGraphics.fillStyle(0xffd56f, lamp.lit ? 0.95 : 0.35);
        this.lampGraphics.fillRect(lamp.x - 17, lamp.shadeY + 16, 34, 11);
        this.lampGraphics.fillStyle(0xf4c95d, 0.8);
        this.lampGraphics.fillRect(lamp.x - 11, lamp.shadeY + 31, 22, 4);
        this.lampGraphics.fillStyle(0xf9e8c8, lamp.lit ? 0.62 : 0.24);
        this.lampGraphics.fillRect(lamp.x - 22, lamp.shadeY + 11, 44, 2);
        this.lampGraphics.fillRect(lamp.x - 15, lamp.shadeY + 39, 30, 2);
        this.lampGraphics.fillStyle(0x8a5c80, 0.65);
        this.lampGraphics.fillRect(lamp.x - 2, lamp.shadeY + 45, 4, FLOOR_TOP - lamp.shadeY - 52);
        return;
      }

      this.lampGraphics.fillStyle(0x2a2435, 1);
      this.lampGraphics.fillRect(lamp.x - 3, lamp.shadeY + 23, 6, 23);
      this.lampGraphics.fillRect(lamp.x - 18, lamp.shadeY + 43, 36, 5);
      this.lampGraphics.fillStyle(0xf9e8c8, 1);
      this.lampGraphics.fillTriangle(lamp.x - 20, lamp.shadeY + 4, lamp.x + 20, lamp.shadeY + 4, lamp.x + 13, lamp.shadeY + 27);
      this.lampGraphics.fillTriangle(lamp.x - 20, lamp.shadeY + 4, lamp.x - 13, lamp.shadeY + 27, lamp.x + 13, lamp.shadeY + 27);
      this.lampGraphics.fillStyle(0xffd56f, lamp.lit ? 0.96 : 0.35);
      this.lampGraphics.fillRect(lamp.x - 12, lamp.shadeY + 11, 24, 7);
      this.lampGraphics.fillStyle(0xf9e8c8, lamp.lit ? 0.58 : 0.22);
      this.lampGraphics.fillRect(lamp.x - 16, lamp.shadeY + 7, 32, 2);
      this.lampGraphics.fillRect(lamp.x - 10, lamp.shadeY + 22, 20, 2);
    });
  }

  private drawSleepSpot(): void {
    const spot = this.level.sleepSpot;
    const graphics = this.add.graphics().setDepth(-2);

    graphics.fillStyle(0x1f2635, 0.22);
    graphics.fillEllipse(spot.catX, spot.catY + 26, 118, 18);

    if (spot.type === "hammock") {
      graphics.lineStyle(3, 0x2a2435, 1);
      graphics.lineBetween(spot.catX - 58, spot.catY - 20, spot.catX + 58, spot.catY - 20);
      graphics.lineStyle(2, 0xdcc98f, 1);
      graphics.lineBetween(spot.catX - 58, spot.catY - 20, spot.catX - 40, spot.catY + 12);
      graphics.lineBetween(spot.catX + 58, spot.catY - 20, spot.catX + 40, spot.catY + 12);
      graphics.fillStyle(0x4b3448, 1);
      graphics.fillRect(spot.catX - 66, spot.catY - 24, 6, 58);
      graphics.fillRect(spot.catX + 60, spot.catY - 24, 6, 58);
      graphics.fillStyle(0xb86f83, 1);
      graphics.fillRect(spot.catX - 46, spot.catY + 7, 92, 13);
      graphics.fillStyle(0xf2b7df, 0.88);
      graphics.fillRect(spot.catX - 35, spot.catY + 10, 70, 4);
      graphics.fillStyle(0x493c53, 0.62);
      graphics.fillRect(spot.catX - 42, spot.catY + 18, 84, 3);
      return;
    }

    if (spot.type === "blanket") {
      graphics.fillStyle(0x2a2435, 1);
      graphics.fillRect(spot.catX - 58, spot.catY + 12, 116, 13);
      graphics.fillStyle(0x8a5c80, 1);
      graphics.fillRect(spot.catX - 52, spot.catY + 5, 104, 16);
      graphics.fillStyle(0xf2b7df, 0.9);
      graphics.fillRect(spot.catX - 42, spot.catY + 8, 84, 5);
      graphics.fillStyle(0xf4c95d, 0.78);
      graphics.fillRect(spot.catX - 22, spot.catY - 3, 44, 10);
      graphics.fillStyle(0xf9e8c8, 0.68);
      graphics.fillRect(spot.catX - 14, spot.catY, 28, 3);
      return;
    }

    if (spot.type === "laptop") {
      const deskTop = spot.catY + 17;
      const deskLeft = spot.catX - 116;
      const deskRight = spot.catX + 118;
      const laptopX = spot.catX;

      graphics.fillStyle(0x3c2b30, 1);
      graphics.fillRect(deskLeft - 6, deskTop + 5, deskRight - deskLeft + 12, 9);
      graphics.fillStyle(0xb88952, 1);
      graphics.fillRect(deskLeft, deskTop, deskRight - deskLeft, 9);
      graphics.fillStyle(0xf0b46a, 0.9);
      graphics.fillRect(deskLeft + 14, deskTop + 2, deskRight - deskLeft - 28, 3);
      graphics.fillStyle(0x6b4b3d, 1);
      graphics.fillRect(deskLeft + 12, deskTop + 11, 8, FLOOR_TOP - deskTop - 11);
      graphics.fillRect(deskRight - 22, deskTop + 11, 8, FLOOR_TOP - deskTop - 11);
      graphics.fillStyle(0x1f2635, 0.4);
      graphics.fillRect(deskLeft + 22, FLOOR_TOP - 17, deskRight - deskLeft - 50, 8);
      graphics.fillStyle(0x1f2635, 1);
      graphics.fillRect(laptopX - 38, deskTop - 44, 76, 38);
      graphics.fillStyle(0x24354f, 1);
      graphics.fillRect(laptopX - 33, deskTop - 39, 66, 29);
      graphics.fillStyle(0x15a6a3, 0.92);
      graphics.fillRect(laptopX - 29, deskTop - 34, 58, 20);
      graphics.fillStyle(0x8ee6ff, 0.95);
      graphics.fillRect(laptopX - 25, deskTop - 31, 21, 3);
      graphics.fillRect(laptopX + 8, deskTop - 24, 14, 3);
      graphics.fillStyle(0xd9fff1, 0.5);
      graphics.fillRect(laptopX - 27, deskTop - 33, 3, 18);
      graphics.fillRect(laptopX - 15, deskTop - 28, 28, 1);
      graphics.fillRect(laptopX + 3, deskTop - 20, 22, 1);
      graphics.fillStyle(0x1f2635, 1);
      graphics.fillRect(laptopX - 42, deskTop - 10, 84, 12);
      graphics.fillStyle(0x8a5c80, 1);
      graphics.fillRect(laptopX - 37, deskTop - 13, 74, 10);
      graphics.fillStyle(0xf2b7df, 0.9);
      graphics.fillRect(laptopX - 29, deskTop - 15, 58, 5);
      graphics.fillStyle(0xf9e8c8, 0.82);
      graphics.fillRect(laptopX - 18, deskTop - 12, 30, 2);
      graphics.fillStyle(0x405674, 1);
      graphics.fillRect(laptopX - 23, deskTop - 7, 46, 4);
      graphics.fillStyle(0xf9e8c8, 0.38);
      for (let keyRow = 0; keyRow < 2; keyRow += 1) {
        for (let key = 0; key < 8; key += 1) {
          graphics.fillRect(laptopX - 28 + key * 7, deskTop - 11 + keyRow * 4, 3, 1);
        }
      }
      graphics.fillStyle(0x1f2635, 0.58);
      graphics.fillRect(laptopX - 7, deskTop - 8, 14, 2);

      graphics.fillStyle(0x5f4b68, 1);
      graphics.fillRect(deskRight - 58, deskTop - 17, 14, 17);
      graphics.fillStyle(0xf9e8c8, 1);
      graphics.fillRect(deskRight - 55, deskTop - 14, 8, 6);
      graphics.fillStyle(0xf0b46a, 0.8);
      graphics.fillRect(deskRight - 54, deskTop - 6, 9, 2);
      graphics.fillStyle(0xdcc98f, 1);
      graphics.fillRect(deskRight - 34, deskTop - 8, 22, 5);
      graphics.fillStyle(0xf4c95d, 0.9);
      graphics.fillRect(deskRight - 30, deskTop - 13, 12, 5);
      graphics.fillStyle(0x6b4b3d, 1);
      graphics.fillRect(deskRight - 31, deskTop - 3, 20, 3);

      graphics.fillStyle(0xefe0c8, 1);
      graphics.fillRect(deskRight + 8, FLOOR_TOP - 55, 38, 55);
      graphics.fillStyle(0xf9e8c8, 0.75);
      graphics.fillRect(deskRight + 18, FLOOR_TOP - 42, 18, 22);
      graphics.fillStyle(0x8a5c80, 0.92);
      graphics.fillRect(deskRight + 4, FLOOR_TOP - 8, 46, 8);
      graphics.fillStyle(0x316d42, 1);
      graphics.fillRect(deskRight + 25, FLOOR_TOP - 112, 8, 57);
      graphics.fillRect(deskRight + 38, FLOOR_TOP - 94, 7, 39);
      graphics.fillRect(deskRight + 12, FLOOR_TOP - 82, 6, 27);
      graphics.fillStyle(0x3f9652, 1);
      graphics.fillEllipse(deskRight + 24, FLOOR_TOP - 112, 40, 21);
      graphics.fillEllipse(deskRight + 42, FLOOR_TOP - 96, 34, 17);
      graphics.fillEllipse(deskRight + 12, FLOOR_TOP - 84, 31, 15);
      graphics.fillStyle(0xb7f28b, 0.85);
      graphics.fillRect(deskRight + 30, FLOOR_TOP - 118, 4, 4);
      graphics.fillRect(deskRight + 47, FLOOR_TOP - 101, 4, 4);
      return;
    }

    graphics.fillStyle(0x4b3448, 1);
    graphics.fillRect(spot.catX - 48, spot.catY + 12, 96, 18);
    graphics.fillStyle(0x8a5c80, 1);
    graphics.fillRect(spot.catX - 44, spot.catY + 10, 88, 17);
    graphics.fillStyle(0xb86f83, 1);
    graphics.fillRect(spot.catX - 38, spot.catY + 3, 76, 13);
    graphics.fillStyle(0xf0b46a, 0.92);
    graphics.fillRect(spot.catX - 14, spot.catY - 5, 35, 10);
    graphics.fillStyle(0xf9d2a2, 0.85);
    graphics.fillRect(spot.catX - 8, spot.catY - 2, 22, 3);
    graphics.fillStyle(0x493c53, 0.65);
    graphics.fillRect(spot.catX - 38, spot.catY + 23, 76, 3);
    graphics.fillRect(spot.catX - 34, spot.catY + 7, 4, 6);
    graphics.fillRect(spot.catX + 32, spot.catY + 7, 4, 6);
  }

  private createPlayer(): void {
    const key = getCatSpritesheetKey(this.cat);
    this.player = this.physics.add.sprite(82, WORLD_HEIGHT - 62, key, "idle");
    if (this.restoredSave?.catPosition) {
      this.player.setPosition(this.restoredSave.catPosition.x, this.restoredSave.catPosition.y);
    }
    this.applyCatVisualScale();
    this.player.setCollideWorldBounds(true);
    this.player.setDragX(1100);
    this.player.setMaxVelocity(200, CAT_MAX_FALL_SPEED);
    this.physics.add.collider(this.player, this.floor);

    const shelves = this.physics.add.staticGroup();
    this.shelfSpecs = this.restoredSave?.shelves.map((shelf) => ({ ...shelf })) ?? this.generateValidatedShelfSpecs();
    this.shelfSpecs.forEach((shelf, index) => {
      this.addShelf(shelves, shelf.x, shelf.y, shelf.width, index);
    });
    this.physics.add.collider(this.player, shelves, undefined, this.canLandOnShelf, this);

    const furniture = this.physics.add.staticGroup();
    this.level.furniture.forEach((item) => this.addFurniturePlatform(furniture, item));
    if (this.level.sleepSpot.type === "laptop") {
      this.addDeskPlatform(furniture);
    }
    if (this.level.id !== "desk-laptop" && this.level.id !== "greenhouse") {
      this.addWindowSillPlatform(furniture);
    }
    this.physics.add.collider(this.player, furniture, undefined, this.canLandOnFurniture, this);
  }

  private createLevelSeed(): number {
    return Math.floor(Date.now() % 1_000_000_000) + Math.floor(Math.random() * 10_000);
  }

  private resetLevelRandom(): void {
    this.levelRandom = new Phaser.Math.RandomDataGenerator([
      this.level.id + ":" + this.levelSeed.toString()
    ]);
  }

  private randomBetween(min: number, max: number): number {
    return this.levelRandom.integerInRange(min, max);
  }

  private shuffleWithLevelSeed<T>(items: readonly T[]): T[] {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.randomBetween(0, index);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  }

  private createPlants(): void {
    if (this.restoredSave) {
      this.restoredSave.plants.forEach((savedPlant) => {
        const plant = PLANTS.find((candidate) => candidate.id === savedPlant.id);

        if (!plant) {
          return;
        }

        const sprite = this.add.sprite(savedPlant.x, savedPlant.y, "plant-" + plant.id).setOrigin(0.5, 1);
        sprite.setScale(0.54);
        sprite.setVisible(savedPlant.active);
        this.plants.push({ plant, sprite, active: savedPlant.active });
      });
      return;
    }

    const slots = this.shuffleWithLevelSeed(this.createPlantSlots());
    const plantIds = this.createPlantPlan(slots.length);

    plantIds.forEach((id, index) => {
      const plant = PLANTS.find((candidate) => candidate.id === id);

      if (!plant) {
        return;
      }

      const { x, y } = slots[index];
      const sprite = this.add.sprite(x, y, "plant-" + plant.id).setOrigin(0.5, 1);
      sprite.setScale(0.54);
      this.plants.push({ plant, sprite, active: true });
    });
  }

  private createPlantPlan(slotCount: number): string[] {
    return createPlantPlan(this.level.id, slotCount, this.levelSeed, PURRS_TO_WIN);
  }

  private generateValidatedShelfSpecs(): ShelfSpec[] {
    return generateValidatedShelfLayout(this.level, this.levelSeed);
  }

  private createPlantSlots(): Array<{ x: number; y: number }> {
    const shelfSlots = this.shelfSpecs.flatMap((shelf) => {
      const slotCount = Math.max(2, Math.floor(shelf.width / 58));
      const usableWidth = shelf.width - 44;

      return Array.from({ length: slotCount }, (_, index) => {
        const ratio = slotCount === 1 ? 0.5 : index / (slotCount - 1);
        return {
          x: shelf.x - usableWidth / 2 + ratio * usableWidth + this.randomBetween(-8, 8),
          y: shelf.y - SHELF_HEIGHT / 2
        };
      });
    });

    return [...shelfSlots, ...this.createWindowSillSlots()];
  }

  private createWindowSillSlots(): Array<{ x: number; y: number }> {
    if (this.level.id === "desk-laptop" || this.level.id === "greenhouse") {
      return [];
    }

    return [
      {
        x: WINDOW_X,
        y: WINDOW_SILL_TOP
      }
    ];
  }

  private createUi(): void {
    this.nightOverlay = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x101633, 0)
      .setOrigin(0)
      .setDepth(5);

    this.purrText = this.add
      .text(14, 14, "Лакомства: " + this.purrs + "/" + PURRS_TO_WIN, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f9e8c8",
        backgroundColor: "#493c53",
        padding: { x: 6, y: 4 }
      })
      .setDepth(20);

    this.infoPanel = this.add
      .rectangle(WORLD_WIDTH - 14, 14, 500, 52, 0x2a2435, 0.72)
      .setOrigin(1, 0)
      .setDepth(19);
    this.infoPanel.setStrokeStyle(1, 0x6a4f62, 0.85);

    this.infoTitle = this.add
      .text(WORLD_WIDTH - 500, 19, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#f4c95d",
        wordWrap: { width: 480 }
      })
      .setDepth(20);

    this.infoText = this.add
      .text(WORLD_WIDTH - 500, 20, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f9e8c8",
        wordWrap: { width: 480 },
        lineSpacing: 1
      })
      .setDepth(20);

    this.plantNamePanel = this.add
      .rectangle(0, 0, 10, 18, 0x2a2435, 0.82)
      .setDepth(22)
      .setVisible(false);
    this.plantNamePanel.setStrokeStyle(1, 0xf4c95d, 0.75);
    this.plantNameText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8"
      })
      .setOrigin(0.5)
      .setDepth(23)
      .setVisible(false);

    this.createStartOverButton();
    this.applyLightingStage(true);
  }

  private createStartOverButton(): void {
    this.startOverButton = this.add
      .text(14, 48, "Начать сначала", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f9e8c8",
        backgroundColor: "#493c53",
        padding: { x: 6, y: 4 }
      })
      .setDepth(21)
      .setInteractive({ useHandCursor: true });

    this.startOverButton.on("pointerover", () => {
      this.startOverButton?.setStyle({ backgroundColor: "#6a4f62" });
    });
    this.startOverButton.on("pointerout", () => {
      this.startOverButton?.setStyle({ backgroundColor: "#493c53" });
    });
    this.startOverButton.on("pointerdown", () => this.showMainMenuConfirm());
  }

  private showMainMenuConfirm(): void {
    if (this.mainMenuConfirmObjects.length > 0) {
      return;
    }

    if (this.journalOpen) {
      this.closePlantJournal();
    }

    if (this.savePanelOpen) {
      this.closeSavePanel();
    }

    this.messageTimer?.remove(false);
    this.player.setVelocityX(0);

    const overlay = this.add
      .rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x101633, 0.46)
      .setOrigin(0)
      .setDepth(36);
    const panel = this.add
      .rectangle(WORLD_WIDTH / 2, 216, 430, 132, 0x24192d, 0.96)
      .setStrokeStyle(2, 0x8a5c80, 0.95)
      .setDepth(37);
    const title = this.add
      .text(WORLD_WIDTH / 2, 178, "Хотите перейти в главное меню?", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f4c95d",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(38);
    const body = this.add
      .text(WORLD_WIDTH / 2, 205, "Текущий прогресс будет потерян.", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8"
      })
      .setOrigin(0.5)
      .setDepth(38);
    const confirm = this.add
      .text(WORLD_WIDTH / 2 - 78, 246, "В главное меню", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8",
        backgroundColor: "#6a4f62",
        padding: { x: 8, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(38)
      .setInteractive({ useHandCursor: true });
    const cancel = this.add
      .text(WORLD_WIDTH / 2 + 92, 246, "Остаться", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8",
        backgroundColor: "#493c53",
        padding: { x: 8, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(38)
      .setInteractive({ useHandCursor: true });

    confirm.on("pointerover", () => confirm.setStyle({ backgroundColor: "#8a5c80" }));
    confirm.on("pointerout", () => confirm.setStyle({ backgroundColor: "#6a4f62" }));
    confirm.on("pointerdown", () => this.goToMainMenu());
    cancel.on("pointerover", () => cancel.setStyle({ backgroundColor: "#6a4f62" }));
    cancel.on("pointerout", () => cancel.setStyle({ backgroundColor: "#493c53" }));
    cancel.on("pointerdown", () => this.closeMainMenuConfirm());

    this.mainMenuConfirmObjects.push(overlay, panel, title, body, confirm, cancel);
  }

  private closeMainMenuConfirm(): void {
    this.mainMenuConfirmObjects.forEach((object) => object.destroy());
    this.mainMenuConfirmObjects = [];
    this.showControlsHint();
  }

  private goToMainMenu(): void {
    stopDefeatCat();
    this.closeMainMenuConfirm();
    this.scene.start("StartScene");
  }

  private startDemo(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const usefulPlants = this.plants
      .filter((actor) => actor.active && actor.plant.category === "edible")
      .sort((left, right) => left.sprite.y - right.sprite.y || left.sprite.x - right.sprite.x)
      .slice(0, PURRS_TO_WIN);

    this.player.setVelocity(0, 0);
    body.allowGravity = false;
    body.enable = false;
    this.player.setDepth(12);
    this.showMessage(
      "Демо",
      "Котик соберёт полезные травы и оставит подозрительные растения в покое.",
      true
    );
    this.time.delayedCall(700, () => this.runDemoStep(usefulPlants, 0));
  }

  private runDemoStep(actors: PlantActor[], index: number): void {
    if (this.state !== "playing" || index >= actors.length) {
      return;
    }

    const actor = actors[index];

    if (!actor.active) {
      this.runDemoStep(actors, index + 1);
      return;
    }

    const targetX = Phaser.Math.Clamp(actor.sprite.x - 18, 30, WORLD_WIDTH - 30);
    const targetY = actor.sprite.y - 24;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY);

    this.player.setFlipX(targetX < this.player.x);
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: Phaser.Math.Clamp(distance * 4.2, 480, 1150),
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.demoEatPlant(actor);

        if (this.state === "playing") {
          this.time.delayedCall(520, () => this.runDemoStep(actors, index + 1));
        }
      }
    });
  }

  private demoEatPlant(actor: PlantActor): void {
    if (!actor.active) {
      return;
    }

    const result = resolvePlantAction(actor.plant, "eat");

    this.playCatActionPose("eat", 320);
    this.showMessage(result.title, result.body);
    playMunch();
    this.purrs += result.purrDelta;
    this.updatePurrs();

    if (result.removePlant) {
      this.plantActionLog.push({ plant: actor.plant, action: "eat" });
      this.removePlant(actor, "eat");
    }

    if (this.purrs >= PURRS_TO_WIN) {
      this.win();
    }
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w);
    const dropPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.keys.s);

    if (left) {
      this.lastMoveAt = this.time.now;
      this.player.setVelocityX(-CAT_RUN_SPEED);
      this.player.setFlipX(true);
    } else if (right) {
      this.lastMoveAt = this.time.now;
      this.player.setVelocityX(CAT_RUN_SPEED);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (jumpPressed && body.blocked.down) {
      if (this.isStandingOnTv(body)) {
        this.breakTv();
      }

      this.lastMoveAt = this.time.now;
      this.jumpStretchUntil = this.time.now + 180;
      this.player.setVelocityY(CAT_JUMP_VELOCITY);
    }

    if (dropPressed && body.blocked.down) {
      const shelfTop = this.findStandingShelfTop(body);

      if (shelfTop !== undefined) {
        this.dropThroughShelfTop = shelfTop;
        this.dropThroughUntil = this.time.now + 320;
        this.player.setVelocityY(190);
      }
    }

    this.updateCatMotion(body, left || right);
  }

  private playCatActionPose(frame: CatSpriteFrame, duration = 260): void {
    this.actionPose = frame;
    this.actionPoseUntil = this.time.now + duration;
    setCatSpriteFrame(this.player, this.cat, frame);
    this.player.setAngle(0);
  }

  private handleCatGrowthInput(): boolean {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.caps)) {
      return false;
    }

    this.catScaleMultiplier = CAT_GROWN_MULTIPLIER;
    this.applyCatVisualScale();
    this.showMessage("ией, кот растёт!", "но этого ли ты хотел?");
    return true;
  }

  private getCatVisualScale(): number {
    return CAT_BASE_SCALE * this.catScaleMultiplier;
  }

  private applyCatVisualScale(): void {
    const scale = this.getCatVisualScale();
    const stretch = this.getCatVisualStretch();
    const scaleX = scale * stretch.x;
    const scaleY = scale * stretch.y;

    if (this.player.scaleX !== scaleX || this.player.scaleY !== scaleY) {
      this.player.setScale(scaleX, scaleY);
    }

    if (this.player.body) {
      const bodyScaleX = this.catScaleMultiplier * stretch.x;
      const bodyScaleY = this.catScaleMultiplier * stretch.y;

      this.player.setSize(
        CAT_BODY_WIDTH / bodyScaleX,
        CAT_BODY_HEIGHT / bodyScaleY
      );
      this.player.setOffset(
        CAT_BODY_OFFSET_X / bodyScaleX,
        CAT_BODY_OFFSET_Y / bodyScaleY
      );
    }
  }

  private getCatVisualStretch(): { x: number; y: number } {
    if (!this.player.body) {
      return { x: 1, y: 1 };
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (this.time.now < this.landingUntil) {
      return { x: 1.08, y: 0.92 };
    }

    if (!grounded && body.velocity.y < -120) {
      return { x: 0.94, y: 1.08 };
    }

    if (!grounded && body.velocity.y > 130) {
      return { x: 1.04, y: 0.96 };
    }

    if (this.time.now < this.jumpStretchUntil) {
      return { x: 0.94, y: 1.06 };
    }

    return { x: 1, y: 1 };
  }

  private updateCatMotion(body: Phaser.Physics.Arcade.Body, moving: boolean): void {
    const grounded = body.blocked.down || body.touching.down;
    const airborne = !grounded && Math.abs(body.velocity.y) > 80;

    if (airborne) {
      this.wasAirborne = true;
    } else if (grounded && this.wasAirborne) {
      this.wasAirborne = false;

      if (this.time.now - this.lastLandingAt > 260) {
        this.landingUntil = this.time.now + 120;
        this.lastLandingAt = this.time.now;
      }
    }

    if (this.actionPose && this.time.now < this.actionPoseUntil && grounded) {
      setCatSpriteFrame(this.player, this.cat, this.actionPose);
      this.player.setAngle(0);
      this.applyCatVisualScale();
      return;
    }

    if (this.actionPose && this.time.now >= this.actionPoseUntil) {
      this.actionPose = undefined;
    }

    let frame: CatSpriteFrame = this.getIdleCatFrame();
    let angle = 0;

    if (airborne) {
      frame = body.velocity.y > 130 ? "land" : "jump";
      angle = body.velocity.y < 0 ? (this.player.flipX ? 7 : -7) : (this.player.flipX ? -3 : 3);
    } else if (this.time.now < this.landingUntil) {
      frame = "land";
    } else if (moving && Math.abs(body.velocity.x) > 5) {
      frame = Math.floor(this.time.now / 105) % 2 === 0 ? "walk-a" : "walk-b";
      angle = this.player.flipX ? 1.5 : -1.5;
    }

    setCatSpriteFrame(this.player, this.cat, frame);

    this.applyCatVisualScale();

    if (this.player.angle !== angle) {
      this.player.setAngle(angle);
    }
  }

  private getIdleCatFrame(): CatSpriteFrame {
    const idleMs = this.time.now - this.lastMoveAt;
    const idleCycle = idleMs % 9000;
    const inWindow = (offset: number, duration: number) =>
      idleCycle >= offset && idleCycle < offset + duration;

    if (idleMs > 2600 && (this.cat.coat === "black" || this.cat.coat === "calico") && inWindow(3400, 420)) {
      return "suspicious";
    }

    if ((this.cat.coat === "orange" || this.cat.coat === "tabby") && idleMs > 1200 && inWindow(2200, 160)) {
      return "tail-flick";
    }

    if ((this.cat.coat === "gray" || this.cat.coat === "white") && idleMs > 1200 && inWindow(3100, 140)) {
      return "ear-twitch";
    }

    if (this.cat.coat === "calico" && idleMs > 1200 && inWindow(5200, 160)) {
      return "tail-flick";
    }

    return "idle";
  }

  private isStandingOnTv(body: Phaser.Physics.Arcade.Body): boolean {
    if (this.tvBroken || !this.tvSurface) {
      return false;
    }

    const playerBottom = body.y + body.height;

    return (
      Math.abs(playerBottom - this.tvSurface.top) <= 8 &&
      this.player.x >= this.tvSurface.left - 6 &&
      this.player.x <= this.tvSurface.right + 6
    );
  }

  private breakTv(): void {
    if (this.tvBroken || !this.tvSurface) {
      return;
    }

    const surface = this.tvSurface;
    const screenWidth = surface.right - surface.left;
    const screenHeight = this.getTvScreenHeight();
    const screenCenterX = (surface.left + surface.right) / 2;
    const screenCenterY = surface.top + screenHeight / 2;

    this.tvBroken = true;
    this.tvObjects.forEach((object) => object.destroy());
    this.tvObjects = [];
    this.tvPlatform?.destroy();
    this.tvPlatform = undefined;
    this.dropThroughSurfaces = this.dropThroughSurfaces.filter((candidate) => candidate !== surface);
    this.tvSurface = undefined;

    const tvStand = this.level.furniture.find((item) => item.kind === "tv-stand");

    if (tvStand) {
      const brokenTv = this.add.graphics().setDepth(-0.8);
      this.drawBrokenTvOnStand(brokenTv, tvStand);
      this.tvObjects.push(brokenTv);
    }

    playMeow();
    this.showMessage("Телевизор сбит", "Котик совершил убедительный прыжок. Техника не выдержала.");

    const pieces = [
      { x: screenCenterX - screenWidth * 0.26, y: screenCenterY - 12, w: screenWidth * 0.36, h: 28, color: 0x1f2635 },
      { x: screenCenterX + screenWidth * 0.18, y: screenCenterY - 15, w: screenWidth * 0.44, h: 24, color: 0x24354f },
      { x: screenCenterX - screenWidth * 0.14, y: screenCenterY + 14, w: screenWidth * 0.48, h: 18, color: 0x8ee6ff },
      { x: screenCenterX + screenWidth * 0.28, y: screenCenterY + 12, w: screenWidth * 0.25, h: 14, color: 0xf2b7df }
    ];

    pieces.forEach((piece, index) => {
      const shard = this.add
        .rectangle(piece.x, piece.y, piece.w, piece.h, piece.color, index === 2 ? 0.72 : 1)
        .setDepth(12)
        .setAngle(this.randomBetween(-8, 8));
      const targetX = Phaser.Math.Clamp(piece.x + this.randomBetween(-72, 72), 28, WORLD_WIDTH - 28);
      const targetY = FLOOR_TOP + this.randomBetween(7, 18);

      this.tweens.add({
        targets: shard,
        x: targetX,
        y: targetY,
        angle: this.randomBetween(-180, 180),
        alpha: index === 2 ? 0.35 : 0.78,
        duration: 520 + index * 90,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.createTvShards(targetX, targetY);
          shard.destroy();

          if (index === 0) {
            playCrash();
          }
        }
      });
    });
  }

  private createTvShards(x: number, y: number): void {
    const colors = [0x1f2635, 0x24354f, 0x8ee6ff, 0xf2b7df, 0xffd56f];

    for (let index = 0; index < 8; index += 1) {
      const shard = this.add
        .rectangle(
          x + this.randomBetween(-8, 8),
          y - this.randomBetween(0, 6),
          this.randomBetween(2, 6),
          this.randomBetween(2, 5),
          colors[index % colors.length],
          0.9
        )
        .setDepth(11)
        .setAngle(this.randomBetween(0, 180));

      this.tweens.add({
        targets: shard,
        x: x + this.randomBetween(-34, 34),
        y: y + this.randomBetween(0, 12),
        angle: this.randomBetween(-180, 180),
        alpha: 0,
        duration: this.randomBetween(420, 680),
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy()
      });
    }
  }

  private findStandingShelfTop(body: Phaser.Physics.Arcade.Body): number | undefined {
    const playerBottom = body.y + body.height;

    return this.dropThroughSurfaces
      .find(
        (surface) =>
          Math.abs(surface.top - playerBottom) <= 8 &&
          this.player.x >= surface.left - body.width / 2 &&
          this.player.x <= surface.right + body.width / 2
      )?.top;
  }

  private canLandOnShelf(
    _playerObject: ArcadeCollisionObject,
    shelfObject: ArcadeCollisionObject
  ): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const shelfBody = (shelfObject as Phaser.Types.Physics.Arcade.GameObjectWithBody)
      .body as Phaser.Physics.Arcade.StaticBody;
    const shelfTop = shelfBody.y;
    const previousBottom = body.prev.y + body.height;
    const isDroppingThroughThisShelf =
      this.dropThroughShelfTop !== undefined &&
      this.time.now < this.dropThroughUntil &&
      Math.abs(shelfTop - this.dropThroughShelfTop) <= 10;

    if (isDroppingThroughThisShelf || body.velocity.y < 0) {
      return false;
    }

    return previousBottom <= shelfTop + 6;
  }

  private handleJournalInput(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.j)) {
      return;
    }

    if (this.journalOpen) {
      this.closePlantJournal();
    } else {
      this.showPlantJournal();
    }
  }

  private showPlantJournal(): void {
    this.closePlantJournal();
    this.journalOpen = true;
    this.messageTimer?.remove(false);

    const discovered = new Set(getDiscoveredPlantIds());
    const plants = PLANTS.filter((plant) => discovered.has(plant.id));
    const panel = this.add
      .rectangle(WORLD_WIDTH / 2, 222, 650, 308, 0x24192d, 0.95)
      .setStrokeStyle(2, 0x8a5c80, 0.95)
      .setDepth(40);
    const title = this.add
      .text(WORLD_WIDTH / 2, 88, "Кошачий гербарий", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f4c95d",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(41);
    const hint = this.add
      .text(WORLD_WIDTH / 2, 110, "J — закрыть", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#cfc2d8"
      })
      .setOrigin(0.5)
      .setDepth(41);

    this.journalObjects.push(panel, title, hint);

    if (plants.length === 0) {
      this.journalObjects.push(
        this.add
          .text(WORLD_WIDTH / 2, 210, "Пока ни одно растение не записано. Подойди к горшку, чтобы котик его запомнил.", {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#f9e8c8",
            align: "center",
            wordWrap: { width: 520 }
          })
          .setOrigin(0.5)
          .setDepth(41)
      );
      return;
    }

    plants.slice(0, 12).forEach((plant, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 90 + column * 318;
      const y = 138 + row * 44;
      const icon = this.add.sprite(x, y + 28, "plant-" + plant.id)
        .setOrigin(0.5, 1)
        .setScale(0.35)
        .setDepth(41);
      const name = this.add.text(x + 34, y, plant.commonName, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8",
        fontStyle: "bold"
      }).setDepth(41);
      const threat = this.add.text(x + 34, y + 13, getThreatLabel(plant), {
        fontFamily: "monospace",
        fontSize: "9px",
        color: getThreatColor(plant)
      }).setDepth(41);
      const fact = this.add.text(x + 34, y + 25, plant.sniffDescription, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#cfc2d8",
        wordWrap: { width: 220 }
      }).setDepth(41);

      this.journalObjects.push(icon, name, threat, fact);
    });
  }

  private closePlantJournal(): void {
    this.journalObjects.forEach((object) => object.destroy());
    this.journalObjects = [];
    this.journalOpen = false;
  }

  private handleSaveInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.l)) {
      if (this.savePanelOpen) {
        this.closeSavePanel();
      } else {
        this.showSavePanel();
      }
      return;
    }

    if (!this.savePanelOpen) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
      this.saveCurrentSlot(1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
      this.saveCurrentSlot(2);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.three)) {
      this.saveCurrentSlot(3);
    }
  }

  private showSavePanel(): void {
    this.closeSavePanel();
    this.savePanelOpen = true;
    this.messageTimer?.remove(false);

    const panel = this.add
      .rectangle(WORLD_WIDTH / 2, 216, 388, 152, 0x24192d, 0.94)
      .setStrokeStyle(2, 0x8a5c80, 0.95)
      .setDepth(34);
    const title = this.add
      .text(WORLD_WIDTH / 2, 158, "Куда записать сохранение?", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#f4c95d",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(35);
    const hint = this.add
      .text(WORLD_WIDTH / 2, 180, "Нажми 1, 2 или 3 — или выбери слот мышкой", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f9e8c8"
      })
      .setOrigin(0.5)
      .setDepth(35);

    this.savePanelObjects.push(panel, title, hint);

    [1, 2, 3].forEach((slot, index) => {
      const row = this.add
        .text(WORLD_WIDTH / 2, 208 + index * 28, slot + " — " + getSaveSlotTitle(slot), {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#f9e8c8",
          backgroundColor: "#493c53",
          padding: { x: 8, y: 4 }
        })
        .setOrigin(0.5)
        .setDepth(35)
        .setInteractive({ useHandCursor: true });

      row.on("pointerover", () => row.setStyle({ backgroundColor: "#6a4f62" }));
      row.on("pointerout", () => row.setStyle({ backgroundColor: "#493c53" }));
      row.on("pointerdown", () => this.saveCurrentSlot(slot));
      this.savePanelObjects.push(row);
    });
  }

  private closeSavePanel(): void {
    this.savePanelObjects.forEach((object) => object.destroy());
    this.savePanelObjects = [];
    this.savePanelOpen = false;
  }

  private saveCurrentSlot(slot: number): void {
    saveGameSlot(slot, {
      version: 1,
      savedAt: new Date().toISOString(),
      cat: this.cat,
      levelIndex: this.levelIndex,
      purrs: this.purrs,
      lightingStage: this.lightingStage,
      seed: this.levelSeed,
      catPosition: {
        x: this.player.x,
        y: this.player.y
      },
      tvBroken: this.tvBroken,
      shelves: this.shelfSpecs.map((shelf) => ({ ...shelf })),
      plants: this.plants.map((actor) => ({
        id: actor.plant.id,
        x: actor.sprite.x,
        y: actor.sprite.y,
        active: actor.active
      })),
      lamps: this.roomLamps.map((lamp) => ({
        id: lamp.id,
        lit: lamp.lit,
        knocked: lamp.knocked
      }))
    });
    this.closeSavePanel();
    this.showMessage("Сохранено: слот " + slot, "Прогресс комнаты сохранён в браузере.");
  }

  private updatePlantNameLabel(): void {
    const actor = this.findNearbyPlant();

    if (!actor) {
      this.plantNamePanel.setVisible(false);
      this.plantNameText.setVisible(false);
      return;
    }

    const x = Phaser.Math.Clamp(actor.sprite.x, 80, WORLD_WIDTH - 80);
    const y = Phaser.Math.Clamp(actor.sprite.y + 16, HUD_RESERVED_BOTTOM + 14, FLOOR_TOP - 18);

    markPlantDiscovered(actor.plant.id);
    this.plantNameText.setText(actor.plant.commonName);
    this.plantNameText.setPosition(x, y);
    this.plantNameText.setVisible(true);
    this.plantNamePanel.setPosition(x, y);
    this.plantNamePanel.setDisplaySize(this.plantNameText.width + 14, 20);
    this.plantNamePanel.setVisible(true);
  }

  private handleActions(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.interact("eat");
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.q)
    ) {
      if (!this.tryKnockLamp()) {
        this.interact("knock");
      }
    }
  }

  private tryKnockLamp(): boolean {
    const lamp = this.findNearbyLamp();

    if (!lamp) {
      return false;
    }

    this.playCatActionPose("knock", 300);
    this.animateLampBreak(lamp);
    lamp.knocked = true;
    lamp.lit = false;
    this.drawRoomLamps();
    this.drawFloorLampLight(this.getLightingStage());
    playMeow();
    this.showMessage("Лампа сбита", "Свет погас. Котик доволен произведённым эффектом.");
    return true;
  }

  private animateLampBreak(lamp: RoomLamp): void {
    const startY = lamp.kind === "floor" ? lamp.shadeY + 30 : lamp.shadeY + 22;
    const impactX = Phaser.Math.Clamp(lamp.x + this.randomBetween(-42, 42), 24, WORLD_WIDTH - 24);
    const impactY = FLOOR_TOP - 8;
    const pieces = lamp.kind === "floor"
      ? [
          { x: lamp.x, y: lamp.shadeY + 26, w: 52, h: 24, color: 0xf9e8c8, alpha: 0.95 },
          { x: lamp.x, y: lamp.shadeY + 68, w: 8, h: 58, color: 0x2a2435, alpha: 1 },
          { x: lamp.x, y: FLOOR_TOP - 12, w: 52, h: 7, color: 0x8a5c80, alpha: 1 }
        ]
      : [
          { x: lamp.x, y: startY - 8, w: 38, h: 18, color: 0xf9e8c8, alpha: 0.95 },
          { x: lamp.x, y: startY + 18, w: 7, h: 28, color: 0x2a2435, alpha: 1 },
          { x: lamp.x, y: startY + 34, w: 34, h: 5, color: 0x8a5c80, alpha: 1 }
        ];

    pieces.forEach((piece, index) => {
      const shard = this.add
        .rectangle(piece.x, piece.y, piece.w, piece.h, piece.color, piece.alpha)
        .setDepth(12)
        .setAngle(this.randomBetween(-12, 12));
      const targetX = Phaser.Math.Clamp(impactX + this.randomBetween(-24, 24), 22, WORLD_WIDTH - 22);

      this.tweens.add({
        targets: shard,
        x: targetX,
        y: impactY + this.randomBetween(0, 10),
        angle: this.randomBetween(-210, 210),
        alpha: index === 0 ? 0.72 : 0.82,
        duration: 360 + index * 110,
        ease: "Quad.easeIn",
        onComplete: () => {
          if (index === 0) {
            this.createLampShards(targetX, impactY);
            playCrash();
          }

          shard.destroy();
        }
      });
    });
  }

  private createLampShards(x: number, y: number): void {
    const colors = [0xf9e8c8, 0xffd56f, 0x8a5c80, 0x2a2435, 0xf2b7df];

    for (let index = 0; index < 10; index += 1) {
      const shard = this.add
        .rectangle(
          x + this.randomBetween(-10, 10),
          y - this.randomBetween(0, 8),
          this.randomBetween(2, 7),
          this.randomBetween(2, 5),
          colors[index % colors.length],
          0.9
        )
        .setDepth(11)
        .setAngle(this.randomBetween(0, 180));

      this.tweens.add({
        targets: shard,
        x: x + this.randomBetween(-42, 42),
        y: y + this.randomBetween(0, 14),
        angle: this.randomBetween(-180, 180),
        alpha: 0,
        duration: this.randomBetween(420, 720),
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy()
      });
    }
  }

  private findNearbyLamp(): RoomLamp | undefined {
    return this.roomLamps
      .filter((lamp) => !lamp.knocked)
      .map((lamp) => ({
        lamp,
        distance: Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          lamp.x,
          lamp.kind === "table" ? lamp.shadeY + 42 : FLOOR_TOP - 30
        )
      }))
      .filter(({ distance }) => distance <= 72)
      .sort((left, right) => left.distance - right.distance)[0]?.lamp;
  }

  private interact(action: PlantAction): void {
    const actor = this.findNearbyPlant();

    if (!actor) {
      this.showMessage("Тут ничего нет", "Котик уверенно нюхает воздух.");
      playBlip();
      return;
    }

    markPlantDiscovered(actor.plant.id);
    const result = resolvePlantAction(actor.plant, action);
    this.playCatActionPose(action === "eat" ? "eat" : action === "knock" ? "knock" : "sniff");
    this.showMessage(result.title, result.body);

    if (action === "sniff") {
      playBlip();
      return;
    }

    if (result.outcome === "gain-purr") {
      playMunch();
      this.purrs += result.purrDelta;
      this.updatePurrs();
    }

    if (result.removePlant) {
      this.plantActionLog.push({ plant: actor.plant, action });
      this.removePlant(actor, action);
    }

    if (result.isLoss) {
      this.lose();
      return;
    }

    if (this.purrs >= PURRS_TO_WIN) {
      this.win();
      return;
    }

    if (result.removePlant && !this.hasActivePlants()) {
      this.win(
        "Растения закончились",
        "Вы ложитесь спать голодным, но гордым собой."
      );
    }
  }

  private findNearbyPlant(): PlantActor | undefined {
    const maxDistance = 58;

    return this.plants
      .filter((actor) => actor.active)
      .map((actor) => ({
        actor,
        distance: Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          actor.sprite.x,
          actor.sprite.y - 8
        )
      }))
      .filter(({ distance }) => distance <= maxDistance)
      .sort((left, right) => left.distance - right.distance)[0]?.actor;
  }

  private removePlant(actor: PlantActor, action: PlantAction): void {
    actor.active = false;

    if (action === "knock") {
      playMeow();
      const side = actor.sprite.x < this.player.x ? -1 : 1;
      const impactX = Phaser.Math.Clamp(
        actor.sprite.x + side * Phaser.Math.Between(36, 82),
        24,
        WORLD_WIDTH - 24
      );
      const impactY = WORLD_HEIGHT - 20;

      actor.sprite.setDepth(11);
      this.tweens.add({
        targets: actor.sprite,
        x: impactX,
        y: impactY,
        angle: side * Phaser.Math.Between(140, 230),
        duration: Phaser.Math.Clamp((impactY - actor.sprite.y) * 2.4, 360, 760),
        ease: "Quad.easeIn",
        onComplete: () => {
          actor.sprite.setVisible(false);
          this.createPotShards(impactX, impactY, actor.plant.id);
          playPotBreak();
        }
      });
      return;
    }

    actor.sprite.setVisible(false);
  }

  private createPotShards(x: number, y: number, plantId: string): void {
    const potPalette = this.getPotPalette(plantId);
    const colors = [potPalette.dark, potPalette.base, potPalette.light, 0x223044];

    for (let index = 0; index < 12; index += 1) {
      const shard = this.add
        .rectangle(
          x + Phaser.Math.Between(-5, 5),
          y - Phaser.Math.Between(1, 8),
          Phaser.Math.Between(2, 6),
          Phaser.Math.Between(2, 5),
          colors[index % colors.length],
          1
        )
        .setDepth(10)
        .setAngle(Phaser.Math.Between(0, 180));

      this.tweens.add({
        targets: shard,
        x: x + Phaser.Math.Between(-42, 42),
        y: y + Phaser.Math.Between(0, 15),
        angle: Phaser.Math.Between(-220, 220),
        alpha: 0,
        duration: Phaser.Math.Between(520, 820),
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy()
      });
    }

    const dust = this.add.circle(x, y - 4, 16, 0xf9e8c8, 0.22).setDepth(9);
    this.tweens.add({
      targets: dust,
      scale: 1.9,
      alpha: 0,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => dust.destroy()
    });
  }

  private hasActivePlants(): boolean {
    return this.plants.some((actor) => actor.active);
  }

  private getLightingStage(purrs = this.purrs): LightingStage {
    const progress = Math.min(purrs / PURRS_TO_WIN, 1);

    if (this.level.id === "greenhouse") {
      return this.getGreenhouseLightingStage(progress);
    }

    if (this.level.id === "cat-hammock") {
      return this.getNightLightingStage(progress);
    }

    const sunProgress = Math.min(progress / 0.75, 1);
    const sunX = Phaser.Math.Linear(WINDOW_X - 58, WINDOW_X + 62, sunProgress);
    const sunY = WINDOW_Y + 36 - Math.sin(sunProgress * Math.PI) * 86;
    const beamCenter = Phaser.Math.Linear(WINDOW_X + 180, WINDOW_X - 180, sunProgress);
    const beamLeft = Phaser.Math.Clamp(beamCenter - 150, 64, WORLD_WIDTH - 220);
    const beamRight = Phaser.Math.Clamp(beamCenter + 150, 220, WORLD_WIDTH - 64);

    if (progress >= 1) {
      return {
        index: 4,
        color: 0x071025,
        alpha: 0.64,
        sunX: WINDOW_X + 76,
        sunY: WINDOW_Y + 88,
        sunColor: 0xa9b8ff,
        sunAlpha: 0,
        beamColor: 0x8fa7ff,
        beamAlpha: 0.08,
        beamLeft: 250,
        beamRight: 540,
        beamY: 374
      };
    }

    if (progress >= 0.75) {
      return {
        index: 3,
        color: 0x17224d,
        alpha: 0.48,
        sunX: WINDOW_X + 68,
        sunY: WINDOW_Y + 58,
        sunColor: 0xff8f5c,
        sunAlpha: 0.68,
        beamColor: 0xff8f9d,
        beamAlpha: 0.17,
        beamLeft: 116,
        beamRight: 416,
        beamY: 384
      };
    }

    if (progress >= 0.5) {
      return {
        index: 2,
        color: 0x5b4c84,
        alpha: 0.31,
        sunX,
        sunY,
        sunColor: 0xffc878,
        sunAlpha: 0.88,
        beamColor: 0xffb06d,
        beamAlpha: 0.15,
        beamLeft,
        beamRight,
        beamY: 378
      };
    }

    if (progress >= 0.25) {
      return {
        index: 1,
        color: 0xffb36d,
        alpha: 0.16,
        sunX,
        sunY,
        sunColor: 0xffe3a1,
        sunAlpha: 0.94,
        beamColor: 0xffd48a,
        beamAlpha: 0.13,
        beamLeft,
        beamRight,
        beamY: 368
      };
    }

    return {
      index: 0,
      color: 0xffefd0,
      alpha: 0.035,
      sunX,
      sunY,
      sunColor: 0xffc36b,
      sunAlpha: 0.84,
      beamColor: 0xffca80,
      beamAlpha: 0.1,
      beamLeft,
      beamRight,
      beamY: 378
    };
  }

  private getGreenhouseLightingStage(progress: number): LightingStage {
    const index = progress >= 1 ? 4 : progress >= 0.75 ? 3 : progress >= 0.5 ? 2 : progress >= 0.25 ? 1 : 0;
    const sunProgress = Math.min(progress / 0.75, 1);
    const sunX = Phaser.Math.Linear(132, 636, sunProgress);
    const sunY = 124 - Math.sin(sunProgress * Math.PI) * 72;
    const diffuseAlphas = [0.1, 0.13, 0.15, 0.1, 0.05];
    const overlayAlphas = [0.02, 0.04, 0.08, 0.14, 0.24];
    const sunAlphas = [0.34, 0.38, 0.3, 0.2, 0.1];

    return {
      index,
      color: index >= 4 ? 0x0f2531 : 0x3f6f5e,
      alpha: overlayAlphas[index],
      sunX,
      sunY,
      sunColor: index >= 3 ? 0xffb36d : 0xffdf8f,
      sunAlpha: sunAlphas[index],
      beamColor: index >= 3 ? 0xffd0a0 : 0xe7ffd6,
      beamAlpha: diffuseAlphas[index],
      beamLeft: 40,
      beamRight: WORLD_WIDTH - 40,
      beamY: 280
    };
  }

  private getNightLightingStage(progress: number): LightingStage {
    const index = progress >= 1 ? 4 : progress >= 0.75 ? 3 : progress >= 0.5 ? 2 : progress >= 0.25 ? 1 : 0;
    const alphas = [0.08, 0.18, 0.3, 0.44, 0.58];
    const moonAlphas = [0.82, 0.76, 0.68, 0.56, 0.42];

    return {
      index,
      color: 0x071025,
      alpha: alphas[index],
      sunX: WINDOW_X - 52,
      sunY: WINDOW_Y - 34,
      sunColor: 0xdce7ff,
      sunAlpha: moonAlphas[index],
      beamColor: 0x8fa7ff,
      beamAlpha: 0,
      beamLeft: 250,
      beamRight: 540,
      beamY: 374
    };
  }

  private applyLightingStage(immediate = false, purrs = this.purrs): void {
    const stage = this.getLightingStage(purrs);
    const stageChanged = immediate || stage.index !== this.lightingStage;

    this.lightingStage = stage.index;
    this.nightOverlay.setFillStyle(stage.color, 1);
    this.sun.setFillStyle(stage.sunColor, 1);
    this.drawWindowSky(stage);
    this.drawWindowLight(stage);
    this.updateGarlandLights(stage, immediate);
    this.drawGarlandLightAndShadows(stage);
    this.drawFloorLampLight(stage);

    if (immediate) {
      this.nightOverlay.setAlpha(stage.alpha);
      this.sun.setPosition(stage.sunX, stage.sunY);
      this.sun.setAlpha(stage.sunAlpha);
      this.sun.setVisible(stage.sunAlpha > 0);
      return;
    }

    this.sun.setVisible(true);
    this.tweens.killTweensOf(this.sun);
    this.tweens.add({
      targets: this.sun,
      x: stage.sunX,
      y: stage.sunY,
      alpha: stage.sunAlpha,
      duration: 450,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.sun.setVisible(stage.sunAlpha > 0);
      }
    });

    if (!stageChanged) {
      return;
    }

    this.tweens.killTweensOf(this.nightOverlay);
    this.tweens.add({
      targets: this.nightOverlay,
      alpha: stage.alpha,
      duration: 450,
      ease: "Sine.easeOut"
    });
  }

  private updateGarlandLights(stage: LightingStage, immediate: boolean): void {
    const glowAlpha = stage.index >= 3 ? 0.38 : stage.index >= 2 ? 0.22 : 0.04;
    const bulbAlpha = stage.index >= 2 ? 1 : 0.62;

    this.garlandLights.forEach(({ bulb, glow }, index) => {
      this.tweens.killTweensOf(glow);
      bulb.setAlpha(bulbAlpha);
      glow.setAlpha(immediate ? glowAlpha : Math.max(0.02, glow.alpha));

      if (stage.index < 2) {
        glow.setAlpha(glowAlpha);
        return;
      }

      this.tweens.add({
        targets: glow,
        alpha: glowAlpha + (index % 2) * 0.08,
        duration: 420 + index * 18,
        yoyo: true,
        repeat: -1,
        delay: immediate ? 0 : index * 24,
        ease: "Sine.easeInOut"
      });
    });
  }

  private drawWindowSky(stage: LightingStage): void {
    const left = WINDOW_X - WINDOW_INNER_WIDTH / 2;
    const top = WINDOW_Y - WINDOW_INNER_HEIGHT / 2;

    this.windowSky.clear();

    if (this.level.id === "greenhouse") {
      this.drawGreenhouseSky(stage);
      return;
    }

    if (stage.index >= 1 && stage.index < 4) {
      const cloudAlpha = stage.index === 1 ? 0.46 : stage.index === 2 ? 0.34 : 0.18;

      this.windowSky.fillStyle(0xf9e8c8, cloudAlpha);
      this.windowSky.fillEllipse(left + 42, top + 30, 42, 12);
      this.windowSky.fillEllipse(left + 62, top + 27, 28, 10);
      this.windowSky.fillEllipse(left + 122, top + 48, 38, 11);
      this.windowSky.fillEllipse(left + 142, top + 45, 24, 9);
    }

    if (stage.index >= 3) {
      const starAlpha = stage.index >= 4 ? 0.88 : 0.48;

      this.windowSky.fillStyle(0xf9e8c8, starAlpha);
      [
        [left + 26, top + 24],
        [left + 58, top + 38],
        [left + 92, top + 23],
        [left + 134, top + 34],
        [left + 152, top + 62],
        [left + 44, top + 70]
      ].forEach(([x, y], index) => {
        this.windowSky.fillRect(x, y, index % 2 === 0 ? 2 : 1, index % 2 === 0 ? 2 : 1);
      });

      this.windowSky.fillStyle(0xdce7ff, stage.index >= 4 ? 0.42 : 0.22);
      this.windowSky.fillCircle(left + 134, top + 26, 10);
      this.windowSky.fillStyle(0xaecce3, stage.index >= 4 ? 0.5 : 0.25);
      this.windowSky.fillCircle(left + 139, top + 23, 9);
    }
  }

  private drawGreenhouseSky(stage: LightingStage): void {
    const wallLeft = 40;
    const wallTop = 58;
    const wallWidth = WORLD_WIDTH - 80;
    const wallHeight = FLOOR_TOP - 92;
    const dusk = stage.index >= 3;

    this.windowSky.fillStyle(dusk ? 0xf0b46a : 0xbfeaff, dusk ? 0.12 : 0.18);
    this.windowSky.fillRect(wallLeft, wallTop, wallWidth, wallHeight);
    this.windowSky.fillStyle(0xf9e8c8, stage.sunAlpha * 0.18);
    this.windowSky.fillCircle(stage.sunX, stage.sunY, 52);
    this.windowSky.fillStyle(0xffdf8f, stage.sunAlpha * 0.2);
    this.windowSky.fillCircle(stage.sunX, stage.sunY, 34);

    this.windowSky.fillStyle(0xf9e8c8, dusk ? 0.12 : 0.24);
    this.windowSky.fillEllipse(170, 102, 86, 18);
    this.windowSky.fillEllipse(506, 84, 118, 22);
    this.windowSky.fillEllipse(596, 132, 78, 16);

    this.windowSky.fillStyle(0x2f6b5a, dusk ? 0.24 : 0.3);
    this.windowSky.fillRect(72, 246, 12, 92);
    this.windowSky.fillRect(680, 228, 14, 110);
    this.windowSky.fillEllipse(80, 236, 116, 34);
    this.windowSky.fillEllipse(124, 282, 142, 40);
    this.windowSky.fillEllipse(672, 226, 132, 38);
    this.windowSky.fillEllipse(718, 280, 106, 34);

    this.windowSky.fillStyle(0x315c45, dusk ? 0.2 : 0.25);
    this.windowSky.fillRect(472, 300, 72, 8);
    this.windowSky.fillRect(500, 258, 10, 42);
    this.windowSky.fillRect(484, 308, 7, 28);
    this.windowSky.fillRect(526, 308, 7, 28);
  }

  private drawWindowLight(stage: LightingStage): void {
    const beamTop = this.level.id === "desk-laptop" ? 132 : WINDOW_Y + WINDOW_INNER_HEIGHT / 2 + 18;
    const sourceLeft = this.level.id === "desk-laptop" ? WINDOW_X + 18 : WINDOW_X - 50;
    const sourceRight = this.level.id === "desk-laptop" ? WINDOW_X + 76 : WINDOW_X + 62;

    this.windowLight.clear();

    if (this.level.id === "cat-hammock") {
      return;
    }

    if (this.level.id === "greenhouse") {
      this.windowLight.fillStyle(stage.beamColor, stage.beamAlpha * 0.34);
      this.windowLight.fillRect(24, 58, WORLD_WIDTH - 48, FLOOR_TOP - 58);
      this.windowLight.fillStyle(0xf9e8c8, stage.beamAlpha * 0.2);
      this.windowLight.fillEllipse(WORLD_WIDTH / 2, 226, WORLD_WIDTH - 96, 236);
      this.windowLight.fillStyle(0xb7f28b, stage.beamAlpha * 0.16);
      this.windowLight.fillRect(36, 330, WORLD_WIDTH - 72, 46);
      return;
    }

    if (this.level.id === "desk-laptop") {
      const alpha = stage.beamAlpha;

      this.windowLight.fillStyle(stage.beamColor, alpha * 0.28);
      this.windowLight.fillEllipse(WINDOW_X + 36, WINDOW_Y + 74, 220, 104);
      this.windowLight.fillStyle(stage.beamColor, alpha * 0.18);
      this.windowLight.fillEllipse(WINDOW_X + 80, FLOOR_TOP - 48, 270, 44);
      this.windowLight.fillStyle(0xfff1b6, alpha * 0.1);
      this.windowLight.fillRect(WINDOW_X - 18, WINDOW_Y + 48, 124, 28);
      return;
    }

    if (this.level.id === "bedroom") {
      const rays = [
        { color: 0xf1a7cf, fromLeft: -48, fromRight: -12, toLeft: 54, toRight: 150 },
        { color: 0x8ed8ee, fromLeft: -10, fromRight: 30, toLeft: 166, toRight: 262 },
        { color: 0xf8d779, fromLeft: -52, fromRight: -18, toLeft: 54, toRight: 150 },
        { color: 0xb9df8a, fromLeft: 18, fromRight: 52, toLeft: 166, toRight: 262 }
      ];
      const alpha = Math.max(0.07, stage.beamAlpha * 0.72);

      rays.forEach((ray, index) => {
        this.windowLight.fillStyle(ray.color, alpha * (index === 2 ? 0.9 : 0.76));
        this.windowLight.beginPath();
        this.windowLight.moveTo(WINDOW_X + ray.fromLeft, WINDOW_Y + 42);
        this.windowLight.lineTo(WINDOW_X + ray.fromRight, WINDOW_Y + 42);
        this.windowLight.lineTo(stage.beamLeft + ray.toRight, stage.beamY + 54);
        this.windowLight.lineTo(stage.beamLeft + ray.toLeft, stage.beamY + 54);
        this.windowLight.closePath();
        this.windowLight.fillPath();

        this.windowLight.fillStyle(0xffe1a0, alpha * 0.12);
        this.windowLight.fillEllipse(
          stage.beamLeft + (ray.toLeft + ray.toRight) / 2,
          stage.beamY + 54,
          ray.toRight - ray.toLeft,
          18
        );
      });

      this.windowLight.fillStyle(0x20273c, alpha * 0.22);
      for (let index = 0; index < 4; index += 1) {
        this.windowLight.fillRect(stage.beamLeft + 72 + index * 62, stage.beamY + 50 + index, 32, 5);
      }
      return;
    }

    for (let band = 0; band < 5; band += 1) {
      const inset = band * 20;
      const alpha = stage.beamAlpha * (0.76 - band * 0.1);
      this.windowLight.fillStyle(stage.beamColor, Math.max(0, alpha));
      this.windowLight.beginPath();
      this.windowLight.moveTo(sourceLeft + band * 8, beamTop + band * 5);
      this.windowLight.lineTo(sourceRight - band * 6, beamTop + band * 5);
      this.windowLight.lineTo(stage.beamRight - inset, stage.beamY + band * 8);
      this.windowLight.lineTo(stage.beamLeft + inset, stage.beamY + band * 8);
      this.windowLight.closePath();
      this.windowLight.fillPath();
    }

    this.windowLight.fillStyle(stage.beamColor, stage.beamAlpha * 0.28);
    this.windowLight.fillEllipse(
      (stage.beamLeft + stage.beamRight) / 2,
      stage.beamY + 10,
      stage.beamRight - stage.beamLeft - 50,
      28
    );

    this.windowLight.fillStyle(0x20273c, stage.beamAlpha * 0.34);
    for (let index = 0; index < 4; index += 1) {
      const shadowX = stage.beamLeft + 44 + index * 58;
      this.windowLight.fillRect(shadowX, stage.beamY + index, 32, 5);
    }
  }

  private drawFloorLampLight(stage: LightingStage): void {
    this.floorLampLight.clear();

    const intensity = stage.index >= 3 ? 1 : stage.index >= 2 ? 0.55 : 0;

    if (intensity <= 0) {
      return;
    }

    this.roomLamps
      .filter((lamp) => lamp.lit && !lamp.knocked)
      .forEach((lamp) => {
        if (lamp.kind === "floor") {
          this.floorLampLight.fillStyle(0xfff1b6, 0.14 * intensity);
          this.floorLampLight.fillEllipse(lamp.x, lamp.shadeY + 26, 72, 58);
          this.floorLampLight.fillStyle(0xffd56f, 0.052 * intensity);
          this.floorLampLight.fillEllipse(lamp.x + 28, lamp.shadeY + 92, 152, 152);
          this.floorLampLight.fillStyle(0xfff1b6, 0.032 * intensity);
          this.floorLampLight.fillEllipse(lamp.x + 48, FLOOR_TOP - 34, 178, 58);
          this.floorLampLight.fillStyle(0x101633, 0.08 * intensity);
          this.floorLampLight.fillEllipse(lamp.x + 58, FLOOR_TOP + 3, 168, 12);
          return;
        }

        this.floorLampLight.fillStyle(0xfff1b6, 0.12 * intensity);
        this.floorLampLight.fillEllipse(lamp.x, lamp.shadeY + 22, 70, 54);
        this.floorLampLight.fillStyle(0xffd56f, 0.045 * intensity);
        this.floorLampLight.fillEllipse(lamp.x + 18, lamp.shadeY + 56, 132, 96);
        this.floorLampLight.fillStyle(0x101633, 0.055 * intensity);
        this.floorLampLight.fillEllipse(lamp.x + 20, FLOOR_TOP + 3, 112, 10);
      });
  }

  private drawGarlandLightAndShadows(stage: LightingStage): void {
    const intensity = stage.index >= 3 ? 1 : stage.index >= 2 ? 0.58 : 0;

    this.garlandLight.clear();
    this.garlandShadows.clear();

    if (intensity <= 0 || this.garlandLights.length === 0) {
      return;
    }

    const colors = this.getGarlandColors();

    this.garlandLights.forEach(({ bulb }, index) => {
      const color = colors[index % colors.length];

      this.garlandLight.fillStyle(color, 0.055 * intensity);
      this.garlandLight.fillEllipse(bulb.x, bulb.y + 6, 36, 42);
      this.garlandLight.fillStyle(color, 0.018 * intensity);
      this.garlandLight.fillEllipse(bulb.x, bulb.y + 42, 58, 96);
    });

    this.garlandLight.fillStyle(0xffe6a6, 0.014 * intensity);
    this.garlandLight.fillEllipse(150, 82, 250, 78);

    this.shelfSpecs.forEach((shelf, index) => {
      const shadowOffset = index % 2 === 0 ? 10 : -8;

      this.garlandShadows.fillStyle(0x101633, 0.14 * intensity);
      this.garlandShadows.fillRect(
        shelf.x - shelf.width / 2 + shadowOffset,
        shelf.y + 7,
        shelf.width * 0.74,
        5
      );
      this.garlandShadows.fillStyle(0x101633, 0.06 * intensity);
      this.garlandShadows.fillRect(shelf.x - shelf.width / 2 + 8, shelf.y - 1, shelf.width - 16, 3);
    });

    this.level.furniture.forEach((item) => {
      this.garlandShadows.fillStyle(0x101633, 0.12 * intensity);
      this.garlandShadows.fillEllipse(item.x + 12, item.y + item.height + 6, item.width * 0.72, 10);
      this.garlandShadows.fillStyle(0x101633, 0.055 * intensity);
      this.garlandShadows.fillRect(item.x - item.width / 2 + 8, item.y + 2, item.width - 16, 6);
    });

    this.plants
      .filter((actor) => actor.active)
      .forEach((actor) => {
        const nearestBulb = this.garlandLights.reduce((best, current) => {
          const currentDistance = Phaser.Math.Distance.Between(
            current.bulb.x,
            current.bulb.y,
            actor.sprite.x,
            actor.sprite.y
          );
          const bestDistance = Phaser.Math.Distance.Between(
            best.bulb.x,
            best.bulb.y,
            actor.sprite.x,
            actor.sprite.y
          );

          return currentDistance < bestDistance ? current : best;
        });
        const distance = Phaser.Math.Distance.Between(
          nearestBulb.bulb.x,
          nearestBulb.bulb.y,
          actor.sprite.x,
          actor.sprite.y
        );
        const localAlpha = Math.max(0, 1 - distance / 380) * intensity;
        const shadowDirection = actor.sprite.x >= nearestBulb.bulb.x ? 1 : -1;

        this.garlandShadows.fillStyle(0x101633, 0.2 * localAlpha);
        this.garlandShadows.fillEllipse(
          actor.sprite.x + shadowDirection * 10,
          actor.sprite.y + 4,
          34,
          8
        );
        this.garlandShadows.fillStyle(0x101633, 0.07 * localAlpha);
        this.garlandShadows.fillRect(actor.sprite.x + shadowDirection * 7, actor.sprite.y - 34, 5, 34);
        this.garlandShadows.fillStyle(0xfff1b6, 0.035 * localAlpha);
        this.garlandShadows.fillRect(actor.sprite.x - shadowDirection * 12, actor.sprite.y - 31, 3, 23);
      });
  }

  private updatePurrs(): void {
    this.purrText.setText("Лакомства: " + this.purrs + "/" + PURRS_TO_WIN);
    this.applyLightingStage();
  }

  private win(
    title = "Лакомства собраны",
    body = "Комната темнеет. У котика важные сонные дела."
  ): void {
    const sleepSpot = this.level.sleepSpot;

    this.state = "won";
    this.player.setVelocity(0, 0);
    this.physics.pause();
    playSleepTone();
    this.showMessage(title, body);
    this.applyLightingStage(false, PURRS_TO_WIN);

    this.tweens.add({
      targets: this.player,
      x: sleepSpot.catX,
      y: sleepSpot.catY + 13,
      duration: 1200,
      ease: "Sine.easeInOut",
      onComplete: () => {
        setCatSpriteFrame(this.player, this.cat, "sleep");
        this.applyCatVisualScale();
        this.player.setFlipX(false);
        this.player.setRotation(0);
        this.player.setPosition(sleepSpot.catX, sleepSpot.catY);
        this.add
          .text(sleepSpot.catX - 36, sleepSpot.catY - 35, "zzz", {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#f9e8c8"
          })
          .setDepth(20);
        this.completedStats = this.getStatsAfterCurrentLevel();

        if (this.isLastLevel()) {
          this.showGameCompletePanel(this.completedStats);
        } else {
          this.showLevelSummary();
          this.showNextLevelButton();
        }
      }
    });
  }

  private showLevelSummary(): void {
    const rows = this.getLevelSummaryRows().slice(0, 5);

    if (rows.length === 0) {
      return;
    }

    const panelX = WORLD_WIDTH / 2;
    const panelY = 232;
    const panelWidth = 430;
    const panelHeight = 44 + rows.length * 28;

    this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x24192d, 0.9)
      .setStrokeStyle(1, 0x8a5c80, 0.95)
      .setDepth(28);
    this.add
      .text(panelX - panelWidth / 2 + 14, panelY - panelHeight / 2 + 10, "Итог уровня", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f4c95d",
        fontStyle: "bold"
      })
      .setDepth(29);

    rows.forEach((row, index) => {
      const y = panelY - panelHeight / 2 + 39 + index * 28;
      const icon = this.add.sprite(panelX - panelWidth / 2 + 30, y + 8, "plant-" + row.plant.id)
        .setOrigin(0.5, 1)
        .setScale(0.29)
        .setDepth(29);
      icon.setAlpha(0.96);
      this.add
        .text(panelX - panelWidth / 2 + 58, y - 1, row.plant.commonName, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#f9e8c8"
        })
        .setDepth(29);
      this.add
        .text(panelX + 86, y - 1, row.threatLabel, {
          fontFamily: "monospace",
          fontSize: "9px",
          color: row.threatColor
        })
        .setDepth(29);
    });
  }

  private getLevelSummaryRows(): ReturnType<typeof buildLevelSummaryRows> {
    return buildLevelSummaryRows(
      this.plantActionLog,
      this.plants.map((actor) => actor.plant)
    );
  }

  private getStatsAfterCurrentLevel(): PlantActionStats {
    return buildStatsAfterLevel(
      this.gameStats,
      this.plantActionLog,
      this.roomLamps.filter((lamp) => lamp.knocked).length,
      this.tvBroken
    );
  }

  private isLastLevel(): boolean {
    return this.levelIndex >= LEVELS.length - 1;
  }

  private showNextLevelButton(): void {
    const nextLevel = getLevel(this.levelIndex + 1);

    this.nextButton = this.add
      .text(WORLD_WIDTH / 2, 320, "Следующая комната: " + nextLevel.title + "  [N]", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8",
        backgroundColor: "#6a4f62",
        padding: { x: 8, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });

    this.nextButton.on("pointerover", () => {
      this.nextButton?.setStyle({ backgroundColor: "#8a5c80" });
    });
    this.nextButton.on("pointerout", () => {
      this.nextButton?.setStyle({ backgroundColor: "#6a4f62" });
    });
    this.nextButton.on("pointerdown", () => this.nextLevel());
  }

  private nextLevel(): void {
    this.scene.restart({
      cat: this.cat,
      level: this.levelIndex + 1,
      stats: this.completedStats ?? this.gameStats
    });
  }

  private showGameCompletePanel(stats: PlantActionStats): void {
    this.add
      .rectangle(WORLD_WIDTH / 2, 218, 580, 226, 0x24192d, 0.94)
      .setStrokeStyle(2, 0x8a5c80, 0.95)
      .setDepth(30);

    this.add
      .text(WORLD_WIDTH / 2, 128, "Все комнаты пройдены", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f4c95d",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(228, 162, "Съедено", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#b7f28b",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(31);
    this.add
      .text(516, 162, "Сбито", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ff8eb5",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add.rectangle(384, 176, 472, 1, 0x8a5c80, 0.7).setDepth(31);
    this.drawStatsColumn(108, 190, stats.eaten, "#f9e8c8");
    this.drawStatsColumn(392, 190, stats.knocked, "#f9e8c8");

    this.restartButton = this.add
      .text(WORLD_WIDTH / 2, 306, "Тыгыдыкать снова  [R]", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8",
        backgroundColor: "#6a4f62",
        padding: { x: 8, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });

    this.restartButton.on("pointerover", () => {
      this.restartButton?.setStyle({ backgroundColor: "#8a5c80" });
    });
    this.restartButton.on("pointerout", () => {
      this.restartButton?.setStyle({ backgroundColor: "#6a4f62" });
    });
    this.restartButton.on("pointerdown", () => this.scene.start("StartScene"));
  }

  private drawStatsColumn(
    x: number,
    y: number,
    stats: Record<string, number>,
    color: string
  ): void {
    const rows = Object.entries(stats)
      .map(([itemId, count]) => ({
        itemId,
        plant: PLANTS.find((candidate) => candidate.id === itemId),
        count
      }))
      .filter((row) => row.plant !== undefined || row.itemId === "lamp" || row.itemId === "tv")
      .slice(0, 6);

    if (rows.length === 0) {
      this.add
        .text(x, y, "нет", {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#8b8496"
        })
        .setDepth(31);
      return;
    }

    rows.forEach((row, index) => {
      const lineY = y + index * 18;
      const label = row.plant ? row.plant.commonName : row.itemId === "tv" ? "Телевизор" : "Лампа";

      if (row.plant) {
        this.add
          .sprite(x, lineY + 10, "plant-" + row.plant.id)
          .setOrigin(0.5, 1)
          .setScale(0.19)
          .setDepth(31);
      } else if (row.itemId === "tv") {
        this.drawStatsTvIcon(x, lineY + 8);
      } else {
        this.drawStatsLampIcon(x, lineY + 8);
      }

      this.add
        .text(x + 22, lineY, label + " ×" + row.count, {
          fontFamily: "monospace",
          fontSize: "9px",
          color
        })
        .setDepth(31);
    });
  }

  private drawStatsLampIcon(x: number, y: number): void {
    const icon = this.add.graphics().setDepth(31);

    icon.fillStyle(0x2a2435, 1);
    icon.fillRect(x - 2, y + 2, 4, 10);
    icon.fillRect(x - 10, y + 11, 20, 3);
    icon.fillStyle(0xf9e8c8, 1);
    icon.fillTriangle(x - 9, y - 7, x + 9, y - 7, x + 6, y + 3);
    icon.fillTriangle(x - 9, y - 7, x - 6, y + 3, x + 6, y + 3);
    icon.fillStyle(0xffd56f, 0.92);
    icon.fillRect(x - 5, y - 3, 10, 4);
  }

  private drawStatsTvIcon(x: number, y: number): void {
    const icon = this.add.graphics().setDepth(31);

    icon.fillStyle(0x1f2635, 1);
    icon.fillRect(x - 10, y - 7, 20, 13);
    icon.fillStyle(0x8ee6ff, 0.82);
    icon.fillRect(x - 6, y - 3, 12, 5);
    icon.fillStyle(0x493c53, 0.95);
    icon.fillRect(x - 8, y + 7, 16, 3);
  }

  private lose(): void {
    this.state = "lost";
    playDefeatCat();
    this.physics.pause();
    setCatSpriteFrame(this.player, this.cat, "angry");
    this.applyCatVisualScale();
    this.player.setAngle(0);
    this.nightOverlay.setFillStyle(0x35173f, 1);
    this.nightOverlay.setAlpha(0.6);
    this.infoPanel.setVisible(false);
    this.infoTitle.setVisible(false);
    this.infoText.setVisible(false);
    this.messageTimer?.remove(false);
    this.showDefeatPanel();
  }

  private showControlsHint(): void {
    this.messageTimer?.remove(false);
    this.infoPanel.setVisible(true);
    this.infoTitle.setVisible(false);
    this.infoText.setVisible(true);
    this.infoPanel.setDisplaySize(620, 44);
    this.infoPanel.setAlpha(0.62);
    this.infoText.setPosition(WORLD_WIDTH - 620, 18);
    this.infoText.setFontSize(9);
    this.infoText.setText("A/D — ходить | W — прыгнуть | S — спрыгнуть\nE — съесть | Q — сбросить предмет | J — гербарий | L — сохранение");
  }

  private showMessage(title: string, body: string, persist = false): void {
    this.messageTimer?.remove(false);
    this.infoPanel.setVisible(true);
    this.infoTitle.setVisible(true);
    this.infoText.setVisible(true);
    this.infoPanel.setDisplaySize(500, 64);
    this.infoPanel.setAlpha(0.86);
    this.infoTitle.setText(title);
    this.infoText.setFontSize(11);
    this.infoText.setPosition(WORLD_WIDTH - 500, 38);
    this.infoText.setText(body);

    if (!persist && this.state === "playing") {
      this.messageTimer = this.time.delayedCall(4200, () => this.showControlsHint());
    }
  }

  private showDefeatPanel(): void {
    this.add
      .rectangle(WORLD_WIDTH / 2, 216, 520, 150, 0x24192d, 0.94)
      .setStrokeStyle(2, 0x8a5c80, 0.95)
      .setDepth(30);

    this.add
      .text(WORLD_WIDTH / 2, 164, "Вы прокляты Азурой за невнимательность", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ffd4ec"
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(178, 190, "Котик в порядке. Он просто очень разочарован вашим ботаническим легкомыслием.", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f9e8c8",
        wordWrap: { width: 410 },
        align: "center"
      })
      .setDepth(31);

    this.restartButton = this.add
      .text(WORLD_WIDTH / 2, 254, "Начать комнату заново  [R]", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#f9e8c8",
        backgroundColor: "#6a4f62",
        padding: { x: 8, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });

    this.restartButton.on("pointerover", () => {
      this.restartButton?.setStyle({ backgroundColor: "#8a5c80" });
    });
    this.restartButton.on("pointerout", () => {
      this.restartButton?.setStyle({ backgroundColor: "#6a4f62" });
    });
    this.restartButton.on("pointerdown", () => this.restartLevel());
  }

  private restartLevel(): void {
    stopDefeatCat();
    this.scene.restart({
      cat: this.cat,
      level: this.levelIndex,
      stats: this.gameStats
    });
  }

  private addShelf(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    index: number
  ): void {
    const shelf = group.create(x, y, "shelf") as Phaser.Physics.Arcade.Image;
    this.dropThroughSurfaces.push({
      top: y - SHELF_HEIGHT / 2,
      left: x - width / 2,
      right: x + width / 2
    });
    shelf.setDisplaySize(width, SHELF_HEIGHT);
    shelf.refreshBody();
    this.drawShelfHanging(x, y, width, index);
  }

  private drawShelfHanging(x: number, y: number, width: number, index: number): void {
    const graphics = this.add.graphics().setDepth(1);
    const left = x - width / 2;
    const right = x + width / 2;
    if (this.level.id === "grandma-corner") {
      return;
    }

    const variant = (index + this.levelIndex) % 4;
    const dreamAllowed = this.level.id !== "greenhouse";

    if (variant === 0 && dreamAllowed && width > 130 && this.shelfHangingCounts.dream === 0) {
      this.shelfHangingCounts.dream += 1;
      const hookX = left + Math.min(34, width * 0.24);

      graphics.lineStyle(1, 0xdcc98f, 0.9);
      graphics.lineBetween(hookX, y + 7, hookX, y + 28);
      graphics.strokeCircle(hookX, y + 34, 8);
      graphics.lineBetween(hookX - 5, y + 34, hookX + 5, y + 34);
      graphics.lineBetween(hookX, y + 28, hookX, y + 42);
      graphics.fillStyle(0xf2b7df, 0.9);
      graphics.fillRect(hookX - 5, y + 43, 3, 7);
      graphics.fillStyle(0x8ee6ff, 0.9);
      graphics.fillRect(hookX + 2, y + 42, 3, 8);
      return;
    }

    if (variant === 1 && this.level.id !== "bedroom" && this.shelfHangingCounts.cloth === 0) {
      this.shelfHangingCounts.cloth += 1;
      const clothRight = right - 18;

      graphics.fillStyle(0x8a5c80, 0.95);
      graphics.fillRect(clothRight - 28, y + 6, 28, 7);
      graphics.fillTriangle(clothRight - 28, y + 13, clothRight, y + 13, clothRight - 6, y + 34);
      graphics.fillStyle(0xf2b7df, 0.82);
      graphics.fillRect(clothRight - 24, y + 10, 14, 3);
      return;
    }

    if (variant === 2 && width > 150 && this.shelfHangingCounts.photos === 0) {
      this.shelfHangingCounts.photos += 1;
      const startX = x - 36;

      graphics.lineStyle(1, 0xdcc98f, 0.85);
      graphics.lineBetween(startX, y + 8, startX + 72, y + 15);
      for (let photo = 0; photo < 3; photo += 1) {
        const photoX = startX + 12 + photo * 24;
        const photoY = y + 12 + (photo % 2) * 4;

        graphics.fillStyle(0xf9e8c8, 0.95);
        graphics.fillRect(photoX, photoY, 12, 10);
        graphics.fillStyle(photo % 2 === 0 ? 0x8ee6ff : 0xff8eb5, 0.95);
        graphics.fillRect(photoX + 2, photoY + 2, 8, 5);
        graphics.fillStyle(0x2a2435, 0.8);
        graphics.fillRect(photoX + 5, photoY - 2, 2, 4);
      }
      return;
    }
  }

  private addFurniturePlatform(
    group: Phaser.Physics.Arcade.StaticGroup,
    item: FurnitureSpec
  ): void {
    const addPlatform = (top: number, left: number, right: number): void => {
      const width = right - left;
      const platform = group.create(left + width / 2, top + 6, "floor") as Phaser.Physics.Arcade.Image;

      this.dropThroughSurfaces.push({ top, left, right });
      platform.setDisplaySize(width, 12);
      platform.setVisible(false);
      platform.refreshBody();
    };
    const platformTop = item.kind === "bed" ? FLOOR_TOP - 48 : item.y;

    addPlatform(platformTop, item.x - item.width / 2, item.x + item.width / 2);

    if (item.kind === "sofa") {
      addPlatform(item.y - item.height + 22, item.x - item.width / 2 + 20, item.x + item.width / 2 - 20);
    }

    if (this.level.id === "bedroom" && item.kind === "bed") {
      addPlatform(FLOOR_TOP - 67, 322, 374);
    }

    if (item.kind === "tv-stand" && !this.tvBroken) {
      this.addTvPlatform(group, item);
    }
  }

  private addTvPlatform(group: Phaser.Physics.Arcade.StaticGroup, item: FurnitureSpec): void {
    const screenWidth = this.getTvScreenWidth();
    const screenTop = item.y - this.getTvScreenHeight() - 5;
    const surface = {
      top: screenTop,
      left: item.x - screenWidth / 2,
      right: item.x + screenWidth / 2
    };

    this.tvSurface = surface;
    this.dropThroughSurfaces.push(surface);
    this.tvPlatform = group.create(item.x, screenTop + 6, "floor") as Phaser.Physics.Arcade.Image;
    this.tvPlatform.setDisplaySize(screenWidth, 12);
    this.tvPlatform.setVisible(false);
    this.tvPlatform.refreshBody();
  }

  private addDeskPlatform(group: Phaser.Physics.Arcade.StaticGroup): void {
    const spot = this.level.sleepSpot;
    const deskTop = spot.catY + 17;
    const platform = group.create(spot.catX, deskTop + 6, "floor") as Phaser.Physics.Arcade.Image;

    this.dropThroughSurfaces.push({
      top: deskTop,
      left: spot.catX - 105,
      right: spot.catX + 105
    });
    platform.setDisplaySize(210, 12);
    platform.setVisible(false);
    platform.refreshBody();
  }

  private addWindowSillPlatform(group: Phaser.Physics.Arcade.StaticGroup): void {
    const platform = group.create(
      WINDOW_X,
      WINDOW_SILL_PLATFORM_Y,
      "floor"
    ) as Phaser.Physics.Arcade.Image;

    this.dropThroughSurfaces.push({
      top: WINDOW_SILL_TOP,
      left: WINDOW_X - WINDOW_SILL_WIDTH / 2,
      right: WINDOW_X + WINDOW_SILL_WIDTH / 2
    });
    platform.setDisplaySize(WINDOW_SILL_WIDTH, 12);
    platform.setVisible(false);
    platform.refreshBody();
  }

  private canLandOnFurniture(
    _playerObject: ArcadeCollisionObject,
    furnitureObject: ArcadeCollisionObject
  ): boolean {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const furnitureBody = (furnitureObject as Phaser.Types.Physics.Arcade.GameObjectWithBody)
      .body as Phaser.Physics.Arcade.StaticBody;

    const furnitureTop = furnitureBody.y;
    const isDroppingThroughThisSurface =
      this.dropThroughShelfTop !== undefined &&
      this.time.now < this.dropThroughUntil &&
      Math.abs(furnitureTop - this.dropThroughShelfTop) <= 10;

    if (isDroppingThroughThisSurface || body.velocity.y < 0) {
      return false;
    }

    return body.prev.y + body.height <= furnitureTop + 6;
  }

  private createTextures(): void {
    this.createPlatformTexture();
    ensureCatSpritesheet(this, this.cat);
    PLANTS.forEach((plant) => this.createPlantTexture(plant));
  }

  private createPlatformTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const palette = this.level.palette;

    graphics.fillStyle(palette.shelfShadow);
    graphics.fillRect(0, 0, 64, SHELF_HEIGHT);
    graphics.fillStyle(palette.shelfTop);
    graphics.fillRect(0, 0, 64, 5);
    graphics.fillStyle(0xf9e8c8, 0.16);
    graphics.fillRect(4, 1, 18, 1);
    graphics.fillRect(31, 1, 13, 1);
    graphics.fillRect(50, 2, 8, 1);
    graphics.fillStyle(palette.shelf);
    graphics.fillRect(0, 5, 64, 6);
    graphics.fillStyle(palette.shelfShadow, 0.92);
    graphics.fillRect(0, 11, 64, 3);
    graphics.fillStyle(0x1f2635, 0.35);
    graphics.fillRect(0, 13, 64, 1);
    graphics.fillStyle(0xf2b7df, 0.18);
    graphics.fillRect(10, 6, 11, 1);
    graphics.fillRect(36, 7, 8, 1);
    graphics.fillStyle(0x2a2435, 0.86);
    graphics.fillRect(9, 11, 3, 3);
    graphics.fillRect(52, 11, 3, 3);
    graphics.generateTexture("shelf", 64, SHELF_HEIGHT);

    graphics.clear();
    graphics.fillStyle(palette.floorTrim);
    graphics.fillRect(0, 0, WORLD_WIDTH, 14);
    graphics.fillStyle(0xf9e8c8, 0.12);
    graphics.fillRect(0, 2, WORLD_WIDTH, 1);
    graphics.fillStyle(0x1f2635, 0.2);
    graphics.fillRect(0, 11, WORLD_WIDTH, 2);
    for (let x = 24; x < WORLD_WIDTH; x += 96) {
      graphics.fillStyle(0xf2b7df, 0.16);
      graphics.fillRect(x, 4, 36, 1);
      graphics.fillStyle(0x1f2635, 0.12);
      graphics.fillRect(x + 52, 9, 28, 1);
    }
    graphics.generateTexture("floor", WORLD_WIDTH, 14);
    graphics.destroy();
  }

  private getPotPalette(plantId: string): { dark: number; base: number; light: number } {
    return (
      {
        "cat-grass": { dark: 0x37535f, base: 0x5c8fa3, light: 0x8ee6ff },
        "oat-grass": { dark: 0x5b4b2f, base: 0xb08a46, light: 0xf4c95d },
        "wheat-grass": { dark: 0x684338, base: 0xc27a48, light: 0xffbd66 },
        "barley-grass": { dark: 0x3f5b3e, base: 0x6aa064, light: 0xa5df83 },
        "spider-plant": { dark: 0x493c53, base: 0x8a5c80, light: 0xd69adf },
        "boston-fern": { dark: 0x3e4f48, base: 0x6f8f78, light: 0xa5c68f },
        "moth-orchid": { dark: 0x5d3d5f, base: 0xb56d9a, light: 0xf2b7df },
        lily: { dark: 0x5b392b, base: 0x9c613d, light: 0xf0b46a },
        "aloe-vera": { dark: 0x4e5c51, base: 0x7b8d69, light: 0xb8dfa2 },
        pothos: { dark: 0x3e5a49, base: 0x5f8a5a, light: 0xe0d66a },
        "snake-plant": { dark: 0x34404d, base: 0x596b82, light: 0x8ee6ff },
        "ficus-benjamina": { dark: 0x4a3f31, base: 0x8a6a45, light: 0xdcc98f },
        rose: { dark: 0x5d3d5f, base: 0xb56d9a, light: 0xf2b7df },
        rosemary: { dark: 0x34404d, base: 0x5c8fa3, light: 0x98ddf2 },
        sunflower: { dark: 0x5b4b2f, base: 0xc27a48, light: 0xffbd66 },
        lavender: { dark: 0x493c53, base: 0x8a5c80, light: 0xd69adf }
      } as Record<string, { dark: number; base: number; light: number }>
    )[plantId] ?? { dark: 0x5b392b, base: 0x9c613d, light: 0xd08a55 };
  }

  private createPlantTexture(plant: Plant): void {
    const key = "plant-" + plant.id;

    if (this.textures.exists(key)) {
      return;
    }
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const outline = 0x223044;
    const potPalette = this.getPotPalette(plant.id);
    const stem = 0x4f8f55;
    const leaf = 0x6fc36b;
    const leafDark = 0x397848;
    const leafLight = 0xa5df83;

    const drawLine = (x1: number, y1: number, x2: number, y2: number, width: number, color: number): void => {
      graphics.lineStyle(width + 2, outline, 1);
      graphics.beginPath();
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
      graphics.strokePath();
      graphics.lineStyle(width, color, 1);
      graphics.beginPath();
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
      graphics.strokePath();
    };

    const drawPot = (): void => {
      graphics.fillStyle(outline);
      graphics.fillRect(13, 33, 20, 13);
      graphics.fillRect(11, 30, 24, 7);
      graphics.fillStyle(potPalette.dark);
      graphics.fillRect(15, 35, 16, 9);
      graphics.fillStyle(potPalette.base);
      graphics.fillRect(13, 31, 20, 5);
      graphics.fillStyle(potPalette.light);
      graphics.fillRect(17, 32, 11, 2);
    };

    switch (plant.id) {
      case "cat-grass":
        [13, 17, 21, 24, 28, 31, 18, 26].forEach((x, index) => {
          drawLine(23, 34, x, 13 + (index % 3) * 3, 2, index % 2 === 0 ? leaf : leafLight);
        });
        break;
      case "oat-grass":
        [12, 16, 20, 25, 30, 34].forEach((x, index) => {
          drawLine(23, 34, x, 7 + (index % 2) * 4, 2, 0x83cf65);
          graphics.fillStyle(0xd4c06a);
          graphics.fillRect(x - 1, 7 + (index % 2) * 4, 3, 5);
        });
        break;
      case "wheat-grass":
        [10, 14, 18, 22, 26, 30, 34].forEach((x, index) => {
          drawLine(23, 34, x, 11 + (index % 2) * 2, 2, 0x66bd58);
          graphics.fillStyle(0xf1d778);
          graphics.fillRect(x - 1, 10 + (index % 2) * 2, 3, 7);
        });
        break;
      case "barley-grass":
        [11, 15, 19, 24, 29, 34].forEach((x, index) => {
          drawLine(23, 34, x, 9 + (index % 3) * 4, 2, 0x77c15f);
        });
        graphics.fillStyle(0xd9c56b);
        graphics.fillRect(9, 18, 10, 2);
        graphics.fillRect(27, 15, 10, 2);
        graphics.fillRect(12, 14, 2, 8);
        graphics.fillRect(33, 11, 2, 8);
        break;
      case "spider-plant":
        [
          { x: 6, y: 17, color: 0x7ccf71 },
          { x: 40, y: 16, color: 0x7ccf71 },
          { x: 4, y: 27, color: 0x9edb86 },
          { x: 42, y: 27, color: 0x9edb86 },
          { x: 17, y: 9, color: 0xbbeaa2 },
          { x: 29, y: 9, color: 0xbbeaa2 }
        ].forEach((blade) => {
          drawLine(23, 35, blade.x, blade.y, 3, blade.color);
          graphics.fillStyle(0xf9e8c8, 0.8);
          graphics.fillRect(Math.round((23 + blade.x) / 2), Math.round((35 + blade.y) / 2), 1, 7);
        });
        drawLine(32, 27, 41, 38, 1, 0x5aa75d);
        graphics.fillStyle(0xb7e6a3);
        graphics.fillCircle(41, 39, 5);
        graphics.fillStyle(0x5aa75d);
        graphics.fillRect(40, 35, 2, 7);
        break;
      case "boston-fern":
        [
          { x: 6, y: 17, color: 0x76c66f },
          { x: 12, y: 9, color: 0x8fd37b },
          { x: 23, y: 5, color: 0x6fbd68 },
          { x: 34, y: 9, color: 0x8fd37b },
          { x: 41, y: 18, color: 0x76c66f },
          { x: 13, y: 23, color: 0xa5df83 },
          { x: 34, y: 24, color: 0xa5df83 }
        ].forEach((frond) => {
          drawLine(23, 35, frond.x, frond.y, 2, 0x4f9b55);
          graphics.fillStyle(frond.color);
          for (let leafIndex = 1; leafIndex <= 5; leafIndex += 1) {
            const ratio = leafIndex / 6;
            const leafX = Phaser.Math.Linear(23, frond.x, ratio);
            const leafY = Phaser.Math.Linear(35, frond.y, ratio);
            graphics.fillEllipse(leafX - 3, leafY + 1, 5, 3);
            graphics.fillEllipse(leafX + 3, leafY - 1, 5, 3);
          }
        });
        graphics.fillStyle(0xb9e28d);
        graphics.fillEllipse(23, 14, 7, 4);
        break;
      case "moth-orchid":
        drawLine(23, 34, 23, 7, 2, stem);
        drawLine(23, 18, 33, 13, 1, stem);
        drawLine(23, 24, 14, 17, 1, stem);
        graphics.fillStyle(0x5fac5d);
        graphics.fillEllipse(16, 33, 17, 7);
        graphics.fillEllipse(30, 33, 17, 7);
        graphics.fillStyle(0xf2b7df);
        graphics.fillEllipse(19, 8, 10, 7);
        graphics.fillEllipse(28, 8, 10, 7);
        graphics.fillEllipse(23, 4, 8, 6);
        graphics.fillEllipse(34, 13, 9, 6);
        graphics.fillEllipse(14, 17, 8, 6);
        graphics.fillStyle(0xffe081);
        graphics.fillRect(23, 7, 3, 3);
        graphics.fillRect(33, 12, 2, 2);
        graphics.fillRect(13, 16, 2, 2);
        break;
      case "ficus-benjamina":
        drawLine(23, 34, 23, 6, 3, 0x5b392b);
        drawLine(23, 17, 11, 8, 2, 0x5b392b);
        drawLine(23, 16, 35, 8, 2, 0x5b392b);
        graphics.fillStyle(0x4f8f55);
        [
          [11, 8], [18, 7], [29, 7], [36, 9], [14, 19], [33, 20], [23, 14], [20, 28], [30, 29]
        ].forEach(([x, y]) => graphics.fillEllipse(x, y, 9, 6));
        graphics.fillStyle(0xa5df83, 0.65);
        graphics.fillRect(17, 8, 5, 2);
        graphics.fillRect(31, 19, 5, 2);
        break;
      case "rose":
        drawLine(23, 34, 23, 10, 2, stem);
        drawLine(23, 23, 13, 18, 1, stem);
        drawLine(23, 24, 34, 18, 1, stem);
        graphics.fillStyle(0x5fac5d);
        graphics.fillEllipse(14, 19, 13, 6);
        graphics.fillEllipse(33, 19, 13, 6);
        graphics.fillStyle(0xd64f63);
        graphics.fillCircle(23, 8, 9);
        graphics.fillStyle(0xf2b7df);
        graphics.fillRect(19, 5, 8, 3);
        graphics.fillStyle(0xb54660);
        graphics.fillRect(21, 10, 8, 3);
        break;
      case "rosemary":
        [9, 13, 17, 21, 25, 29, 33, 37].forEach((x, index) => {
          drawLine(23, 34, x, 5 + (index % 3) * 4, 2, 0x6f8f78);
          graphics.fillStyle(index % 2 === 0 ? 0x8fb6a8 : 0xa7c7b7);
          graphics.fillRect(x - 5, 15, 9, 2);
          graphics.fillRect(x - 6, 22, 10, 2);
          graphics.fillRect(x - 4, 29, 8, 2);
        });
        graphics.fillStyle(0x8fb6a8);
        graphics.fillEllipse(15, 33, 16, 5);
        graphics.fillEllipse(31, 34, 16, 5);
        break;
      case "sunflower":
        drawLine(23, 34, 23, 11, 2, stem);
        graphics.fillStyle(0x6aa064);
        graphics.fillEllipse(14, 27, 15, 7);
        graphics.fillEllipse(31, 27, 15, 7);
        graphics.fillStyle(0xffd56f);
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8;
          graphics.fillEllipse(23 + Math.cos(angle) * 8, 10 + Math.sin(angle) * 8, 6, 8);
        }
        graphics.fillStyle(0x5b392b);
        graphics.fillCircle(23, 10, 7);
        break;
      case "lavender":
        [14, 18, 22, 26, 30, 34].forEach((x, index) => {
          drawLine(23, 34, x, 9 + (index % 2) * 4, 2, 0x6f8f78);
          graphics.fillStyle(index % 2 ? 0xd69adf : 0xb56dff);
          graphics.fillEllipse(x, 12 + (index % 2) * 4, 6, 4);
          graphics.fillEllipse(x + 1, 18 + (index % 2) * 3, 6, 4);
        });
        break;
      case "lily":
        drawLine(23, 34, 23, 12, 2, stem);
        drawLine(23, 18, 12, 12, 1, stem);
        drawLine(23, 18, 34, 12, 1, stem);
        graphics.fillStyle(0x7abf67);
        graphics.fillEllipse(14, 29, 16, 6);
        graphics.fillEllipse(31, 30, 15, 6);
        graphics.fillStyle(0xf8d7e8);
        graphics.fillTriangle(23, 1, 14, 20, 23, 13);
        graphics.fillTriangle(23, 1, 32, 20, 23, 13);
        graphics.fillTriangle(9, 8, 18, 24, 23, 13);
        graphics.fillTriangle(37, 8, 28, 24, 23, 13);
        graphics.fillTriangle(12, 10, 7, 21, 18, 15);
        graphics.fillTriangle(34, 10, 39, 21, 28, 15);
        graphics.fillStyle(0xf1a950);
        graphics.fillRect(22, 10, 3, 10);
        graphics.fillRect(26, 14, 2, 7);
        graphics.fillRect(18, 16, 2, 5);
        break;
      case "aloe-vera":
        graphics.fillStyle(outline);
        graphics.fillTriangle(23, 34, 9, 8, 18, 35);
        graphics.fillTriangle(23, 34, 37, 8, 28, 35);
        graphics.fillTriangle(23, 35, 21, 3, 26, 35);
        graphics.fillTriangle(23, 35, 14, 17, 21, 35);
        graphics.fillTriangle(23, 35, 32, 18, 25, 35);
        graphics.fillStyle(0x70b679);
        graphics.fillTriangle(23, 33, 11, 11, 19, 34);
        graphics.fillTriangle(23, 33, 35, 11, 27, 34);
        graphics.fillTriangle(23, 34, 22, 6, 25, 34);
        graphics.fillTriangle(23, 34, 16, 19, 21, 34);
        graphics.fillTriangle(23, 34, 30, 20, 25, 34);
        graphics.fillStyle(0xb8dfa2);
        graphics.fillRect(17, 20, 2, 2);
        graphics.fillRect(28, 18, 2, 2);
        graphics.fillRect(23, 11, 1, 2);
        break;
      case "pothos":
        drawLine(23, 34, 12, 17, 2, 0x4d8b4f);
        drawLine(23, 34, 35, 17, 2, 0x4d8b4f);
        drawLine(13, 18, 8, 42, 2, 0x4d8b4f);
        drawLine(34, 18, 40, 42, 2, 0x4d8b4f);
        [
          { x: 12, y: 16 },
          { x: 35, y: 16 },
          { x: 8, y: 38 },
          { x: 40, y: 38 }
        ].forEach((leafPoint) => {
          graphics.fillStyle(outline);
          graphics.fillTriangle(leafPoint.x, leafPoint.y - 7, leafPoint.x - 8, leafPoint.y, leafPoint.x, leafPoint.y + 8);
          graphics.fillTriangle(leafPoint.x, leafPoint.y - 7, leafPoint.x + 8, leafPoint.y, leafPoint.x, leafPoint.y + 8);
          graphics.fillStyle(0x63ad5f);
          graphics.fillTriangle(leafPoint.x, leafPoint.y - 5, leafPoint.x - 6, leafPoint.y, leafPoint.x, leafPoint.y + 6);
          graphics.fillTriangle(leafPoint.x, leafPoint.y - 5, leafPoint.x + 6, leafPoint.y, leafPoint.x, leafPoint.y + 6);
          graphics.fillStyle(0xe0d66a);
          graphics.fillRect(leafPoint.x - 1, leafPoint.y - 2, 2, 6);
        });
        break;
      case "snake-plant":
        graphics.fillStyle(outline);
        graphics.fillTriangle(12, 35, 13, 8, 21, 35);
        graphics.fillTriangle(20, 35, 24, 2, 31, 35);
        graphics.fillTriangle(30, 35, 34, 10, 39, 35);
        graphics.fillTriangle(7, 35, 9, 15, 15, 35);
        graphics.fillStyle(0x5f9d62);
        graphics.fillTriangle(14, 35, 15, 10, 19, 35);
        graphics.fillTriangle(22, 35, 25, 5, 29, 35);
        graphics.fillTriangle(32, 35, 35, 13, 37, 35);
        graphics.fillTriangle(9, 35, 10, 17, 13, 35);
        graphics.fillStyle(0xb9d36a);
        graphics.fillRect(15, 17, 3, 2);
        graphics.fillRect(24, 11, 4, 2);
        graphics.fillRect(24, 22, 4, 2);
        graphics.fillRect(33, 20, 3, 2);
        graphics.fillRect(10, 25, 2, 2);
        break;
      default:
        [14, 18, 23, 28, 32].forEach((x, index) => {
          drawLine(23, 34, x, 14 + (index % 2) * 3, 2, leafDark);
        });
        break;
    }

    drawPot();
    graphics.generateTexture(key, 46, 48);
    graphics.destroy();
  }
}
