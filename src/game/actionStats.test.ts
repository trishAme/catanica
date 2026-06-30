import { describe, expect, it } from "vitest";
import { PLANTS } from "../data/plants";
import {
  buildLevelSummaryRows,
  buildStatsAfterLevel,
  createEmptyActionStats,
  getThreatLabel
} from "./actionStats";

function plant(id: string) {
  const found = PLANTS.find((candidate) => candidate.id === id);

  if (!found) {
    throw new Error("Missing plant " + id);
  }

  return found;
}

describe("actionStats", () => {
  it("aggregates eaten plants, knocked plants, lamps, and tv into final stats", () => {
    const stats = buildStatsAfterLevel(
      createEmptyActionStats(),
      [
        { plant: plant("cat-grass"), action: "eat" },
        { plant: plant("cat-grass"), action: "eat" },
        { plant: plant("pothos"), action: "knock" },
        { plant: plant("rose"), action: "sniff" }
      ],
      2,
      true
    );

    expect(stats).toEqual({
      eaten: { "cat-grass": 2 },
      knocked: { pothos: 1, lamp: 2, tv: 1 }
    });
  });

  it("keeps dangerous plants visible in the level summary until handled", () => {
    const rows = buildLevelSummaryRows(
      [{ plant: plant("wheat-grass"), action: "eat" }],
      [plant("wheat-grass"), plant("lily"), plant("rose")]
    );

    expect(rows.map((row) => [row.plant.id, row.actionLabel, row.threatLabel])).toEqual([
      ["wheat-grass", "съедено", "полезное"],
      ["lily", "в комнате", "опасное"]
    ]);
  });

  it("uses Russian threat labels for all plant categories", () => {
    expect(getThreatLabel(plant("cat-grass"))).toBe("полезное");
    expect(getThreatLabel(plant("rose"))).toBe("нейтральное");
    expect(getThreatLabel(plant("lily"))).toBe("опасное");
  });
});
