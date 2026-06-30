import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDiscoveredPlantIds, markPlantDiscovered } from "./plantJournal";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("plantJournal", () => {
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

  it("stores each discovered plant once", () => {
    markPlantDiscovered("cat-grass");
    markPlantDiscovered("cat-grass");
    markPlantDiscovered("lily");

    expect(getDiscoveredPlantIds()).toEqual(["cat-grass", "lily"]);
  });

  it("ignores malformed journal data and non-string ids", () => {
    window.localStorage.setItem("nine-purrs-plant-journal", JSON.stringify(["rose", 42, null, "lily"]));
    expect(getDiscoveredPlantIds()).toEqual(["rose", "lily"]);

    window.localStorage.setItem("nine-purrs-plant-journal", "{broken");
    expect(getDiscoveredPlantIds()).toEqual([]);
  });
});
