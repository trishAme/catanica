import type { CatVariant } from "../data/cats";
import { getLevel } from "../data/levels";

const SAVE_PREFIX = "nine-purrs-save-";

export type SavedShelf = {
  x: number;
  y: number;
  width: number;
};

export type SavedPlant = {
  id: string;
  x: number;
  y: number;
  active: boolean;
};

export type SavedLamp = {
  id: string;
  lit: boolean;
  knocked: boolean;
};

export type SavedCatPosition = {
  x: number;
  y: number;
};

export type GameSaveState = {
  version: 1;
  savedAt: string;
  cat: CatVariant;
  levelIndex: number;
  purrs: number;
  lightingStage: number;
  seed?: number;
  catPosition?: SavedCatPosition;
  tvBroken?: boolean;
  shelves: SavedShelf[];
  plants: SavedPlant[];
  lamps?: SavedLamp[];
};

export function saveGameSlot(slot: number, save: GameSaveState): void {
  window.localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(save));
}

export function loadGameSlot(slot: number): GameSaveState | undefined {
  const raw = window.localStorage.getItem(SAVE_PREFIX + slot);

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as GameSaveState;

    if (parsed.version !== 1 || !parsed.cat || !Array.isArray(parsed.plants)) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export function getSaveSlotTitle(slot: number): string {
  const save = loadGameSlot(slot);

  if (!save) {
    return "Слот " + slot + ": пусто";
  }

  return "Слот " + slot + ": " + getLevel(save.levelIndex).title;
}
