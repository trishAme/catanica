export const CAT_COATS = [
  "gray",
  "black",
  "orange",
  "white",
  "tabby",
  "calico"
] as const;

export type CatCoat = (typeof CAT_COATS)[number];

export type CatEyeColor =
  | "green"
  | "amber"
  | "yellow"
  | "copper"
  | "gold"
  | "blue"
  | "hazel"
  | "odd";

export type CatVariant = {
  coat: CatCoat;
  eyeColor: CatEyeColor;
};

export type CatPalette = {
  label: string;
  body: number;
  accent: number;
  stripe?: number;
  patch?: number;
};

export const CAT_LABELS: Record<CatCoat, string> = {
  gray: "Серый",
  black: "Чёрный",
  orange: "Рыжий",
  white: "Белый",
  tabby: "Табби",
  calico: "Трёхцветный"
};

export const CAT_EYE_PALETTES: Record<CatCoat, readonly CatEyeColor[]> = {
  gray: ["green", "amber"],
  black: ["yellow", "green", "copper"],
  orange: ["gold", "amber"],
  white: ["blue", "green", "amber", "blue", "green", "amber", "odd"],
  tabby: ["green", "amber", "hazel"],
  calico: ["green", "gold", "copper", "green", "gold", "copper", "odd"]
};

export const CAT_PALETTES: Record<CatCoat, CatPalette> = {
  gray: {
    label: "Серый",
    body: 0x7a7f8d,
    accent: 0xa9afbd
  },
  black: {
    label: "Чёрный",
    body: 0x1b1b22,
    accent: 0x3b3a45
  },
  orange: {
    label: "Рыжий",
    body: 0xd17a2f,
    accent: 0xffbd66,
    stripe: 0x8f4b1f
  },
  white: {
    label: "Белый",
    body: 0xf0eadf,
    accent: 0xc9c3bc
  },
  tabby: {
    label: "Табби",
    body: 0x8a7252,
    accent: 0xc9ad7a,
    stripe: 0x4f3a2d
  },
  calico: {
    label: "Трёхцветный",
    body: 0xf0eadf,
    accent: 0x27242a,
    patch: 0xd17a2f
  }
};

export const EYE_COLORS: Record<CatEyeColor, number> = {
  green: 0x8ee06f,
  amber: 0xf0b44b,
  yellow: 0xffdf5d,
  copper: 0xc8743d,
  gold: 0xf4c95d,
  blue: 0x80c7ff,
  hazel: 0x9cad63,
  odd: 0x80c7ff
};

export function createCatVariant(
  coat: CatCoat,
  random: () => number = Math.random
): CatVariant {
  const palette = CAT_EYE_PALETTES[coat];
  const index = Math.min(Math.floor(random() * palette.length), palette.length - 1);

  return {
    coat,
    eyeColor: palette[index]
  };
}
