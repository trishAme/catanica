import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getSaveSlotTitle,
  loadGameSlot,
  saveGameSlot,
  type GameSaveState
} from "./saveState";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("saveState", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: new MemoryStorage()
      }
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow
    });
  });

  it("stores and reads a local save slot", () => {
    const save: GameSaveState = {
      version: 1,
      savedAt: "2026-06-29T00:00:00.000Z",
      cat: { coat: "calico", eyeColor: "green" },
      levelIndex: 1,
      purrs: 2,
      lightingStage: 2,
      seed: 123456,
      catPosition: { x: 240, y: 312 },
      tvBroken: true,
      shelves: [{ x: 100, y: 200, width: 160 }],
      plants: [
        { id: "wheat-grass", x: 120, y: 180, active: true },
        { id: "lily", x: 180, y: 180, active: false }
      ],
      lamps: [{ id: "bedside-lamp", lit: false, knocked: true }]
    };

    saveGameSlot(2, save);

    expect(loadGameSlot(2)).toEqual(save);
    expect(getSaveSlotTitle(2)).toBe("Слот 2: Кабинет");
  });

  it("treats empty or invalid slots as missing", () => {
    window.localStorage.setItem("nine-purrs-save-3", "{nope");

    expect(loadGameSlot(1)).toBeUndefined();
    expect(loadGameSlot(3)).toBeUndefined();
    expect(getSaveSlotTitle(1)).toBe("Слот 1: пусто");
  });

  it("does not load saves with an unsupported version or missing plant state", () => {
    window.localStorage.setItem("nine-purrs-save-1", JSON.stringify({ version: 2, cat: { coat: "gray", eyeColor: "green" }, plants: [] }));
    window.localStorage.setItem("nine-purrs-save-2", JSON.stringify({ version: 1, cat: { coat: "gray", eyeColor: "green" } }));

    expect(loadGameSlot(1)).toBeUndefined();
    expect(loadGameSlot(2)).toBeUndefined();
  });
});
