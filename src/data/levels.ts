export type WallpaperPattern = "diamonds" | "panels" | "stars";
export type SleepSpotType = "bed" | "hammock" | "laptop" | "blanket";
export type FurnitureKind = "table" | "chair" | "sofa" | "armchair" | "bed" | "tv-stand";

export type RectSpec = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type RoomLampSpec = {
  id: string;
  x: number;
  shadeY: number;
  kind: "floor" | "table";
};

export type RoomDecorConfig = {
  shelfAvoidanceZones?: readonly RectSpec[];
  lamps?: readonly RoomLampSpec[];
};

export type LevelPalette = {
  wall: number;
  lowerWall: number;
  floor: number;
  floorTrim: number;
  wallpaper: number;
  wallpaperAccent: number;
  shelf: number;
  shelfTop: number;
  shelfShadow: number;
};

export type ShelfRow = {
  y: number;
  centers: readonly number[];
  width: number;
};

export type SleepSpot = {
  type: SleepSpotType;
  catX: number;
  catY: number;
};

export type FurnitureSpec = {
  kind: FurnitureKind;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LevelConfig = {
  id: string;
  title: string;
  palette: LevelPalette;
  wallpaper: WallpaperPattern;
  shelves: readonly ShelfRow[];
  furniture: readonly FurnitureSpec[];
  decor?: RoomDecorConfig;
  sleepSpot: SleepSpot;
};

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "window-bed",
    title: "Кухня",
    palette: {
      wall: 0x86a9bd,
      lowerWall: 0x6f889b,
      floor: 0x51445d,
      floorTrim: 0x7a5a6f,
      wallpaper: 0x5f8298,
      wallpaperAccent: 0xdcc98f,
      shelf: 0x6a4f62,
      shelfTop: 0x80607a,
      shelfShadow: 0x3f3348
    },
    wallpaper: "diamonds",
    shelves: [
      { y: 310, centers: [448, 660], width: 132 },
      { y: 242, centers: [250, 520], width: 200 },
      { y: 174, centers: [130, 385, 640], width: 170 },
      { y: 108, centers: [285, 540], width: 180 },
      { y: 60, centers: [430], width: 210 }
    ],
    furniture: [
      { kind: "table", x: 214, y: 334, width: 168, height: 74 },
      { kind: "chair", x: 142, y: 368, width: 66, height: 72 },
      { kind: "chair", x: 286, y: 368, width: 66, height: 72 }
    ],
    sleepSpot: { type: "bed", catX: 664, catY: 379 }
  },
  {
    id: "desk-laptop",
    title: "Кабинет",
    palette: {
      wall: 0x5f8b88,
      lowerWall: 0x426d74,
      floor: 0x3c465d,
      floorTrim: 0x6d788c,
      wallpaper: 0x88b99a,
      wallpaperAccent: 0xffd56f,
      shelf: 0x6b4b3d,
      shelfTop: 0xa06a4d,
      shelfShadow: 0x3c2b30
    },
    wallpaper: "panels",
    shelves: [
      { y: 282, centers: [132, 622], width: 132 },
      { y: 216, centers: [148, 602], width: 132 },
      { y: 156, centers: [156, 650], width: 132 }
    ],
    furniture: [
      { kind: "sofa", x: 224, y: 352, width: 240, height: 88 }
    ],
    decor: {
      shelfAvoidanceZones: [
        { left: 272, right: 496, top: 52, bottom: 400 }
      ],
      lamps: [
        { id: "office-floor-lamp", x: 28, shadeY: 248, kind: "floor" }
      ]
    },
    sleepSpot: { type: "laptop", catX: 578, catY: 342 }
  },
  {
    id: "cat-hammock",
    title: "Гостиная",
    palette: {
      wall: 0x879fc1,
      lowerWall: 0x6f83a4,
      floor: 0x4f435f,
      floorTrim: 0x806b8d,
      wallpaper: 0xc9d6f0,
      wallpaperAccent: 0xf2b7df,
      shelf: 0x4f6b68,
      shelfTop: 0x78a094,
      shelfShadow: 0x2f454d
    },
    wallpaper: "diamonds",
    shelves: [
      { y: 310, centers: [142, 390, 622], width: 184 },
      { y: 244, centers: [250, 528], width: 176 },
      { y: 176, centers: [118, 396, 650], width: 166 },
      { y: 110, centers: [228, 604], width: 176 },
      { y: 62, centers: [108, 470, 640], width: 136 }
    ],
    furniture: [
      { kind: "sofa", x: 214, y: 356, width: 196, height: 64 },
      { kind: "tv-stand", x: 552, y: 372, width: 220, height: 82 }
    ],
    decor: {
      shelfAvoidanceZones: [
        { left: 488, right: 620, top: 270, bottom: 372 }
      ]
    },
    sleepSpot: { type: "blanket", catX: 690, catY: 374 }
  },
  {
    id: "bedroom",
    title: "Спальня",
    palette: {
      wall: 0x7d8aae,
      lowerWall: 0x596680,
      floor: 0x44384f,
      floorTrim: 0x6b5872,
      wallpaper: 0xb4c7e2,
      wallpaperAccent: 0xffd56f,
      shelf: 0x5f4b68,
      shelfTop: 0x806b8d,
      shelfShadow: 0x332b3d
    },
    wallpaper: "stars",
    shelves: [
      { y: 312, centers: [150, 620], width: 176 },
      { y: 244, centers: [260, 540], width: 182 },
      { y: 176, centers: [128, 392, 642], width: 156 },
      { y: 110, centers: [254, 558], width: 168 }
    ],
    furniture: [
      { kind: "bed", x: 190, y: 378, width: 238, height: 102 }
    ],
    decor: {
      shelfAvoidanceZones: [
        { left: 250, right: 420, top: 260, bottom: 400 }
      ],
      lamps: [
        { id: "bedside-lamp", x: 347, shadeY: 294, kind: "table" }
      ]
    },
    sleepSpot: { type: "bed", catX: 654, catY: 379 }
  },
  {
    id: "greenhouse",
    title: "Оранжерея",
    palette: {
      wall: 0x6b9c8f,
      lowerWall: 0x4f746b,
      floor: 0x405047,
      floorTrim: 0x6d8d76,
      wallpaper: 0x9fd2a4,
      wallpaperAccent: 0xf4c95d,
      shelf: 0x4f6b4d,
      shelfTop: 0x78a064,
      shelfShadow: 0x2f4534
    },
    wallpaper: "panels",
    shelves: [
      { y: 318, centers: [132, 342, 574], width: 170 },
      { y: 250, centers: [222, 500, 664], width: 150 },
      { y: 182, centers: [122, 382, 632], width: 158 },
      { y: 116, centers: [280, 548], width: 190 },
      { y: 64, centers: [132, 650], width: 138 }
    ],
    furniture: [
      { kind: "table", x: 230, y: 342, width: 210, height: 64 }
    ],
    decor: {
      shelfAvoidanceZones: [
        { left: 292, right: 476, top: 40, bottom: 400 }
      ]
    },
    sleepSpot: { type: "hammock", catX: 646, catY: 374 }
  },
  {
    id: "grandma-corner",
    title: "Бабушкин угол",
    palette: {
      wall: 0xa88b96,
      lowerWall: 0x756071,
      floor: 0x4b3a4a,
      floorTrim: 0x8a6b7c,
      wallpaper: 0xf0c3a5,
      wallpaperAccent: 0xdcc98f,
      shelf: 0x76513f,
      shelfTop: 0xa06a4d,
      shelfShadow: 0x3c2b30
    },
    wallpaper: "diamonds",
    shelves: [
      { y: 314, centers: [146, 396, 626], width: 178 },
      { y: 246, centers: [256, 528], width: 182 },
      { y: 178, centers: [126, 388, 646], width: 160 },
      { y: 112, centers: [248, 556], width: 174 },
      { y: 64, centers: [430], width: 210 }
    ],
    furniture: [
      { kind: "armchair", x: 184, y: 338, width: 130, height: 132 }
    ],
    decor: {
      lamps: [
        { id: "grandma-window-lamp", x: 476, shadeY: 136, kind: "table" }
      ]
    },
    sleepSpot: { type: "bed", catX: 654, catY: 379 }
  }
];

export function getLevel(index: number): LevelConfig {
  return LEVELS[((index % LEVELS.length) + LEVELS.length) % LEVELS.length];
}
