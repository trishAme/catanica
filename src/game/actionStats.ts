import type { Plant } from "../data/plants";
import type { PlantAction } from "../rules/plantActions";

export type PlantActionLogEntry = {
  plant: Plant;
  action: PlantAction;
};

export type PlantActionStats = {
  eaten: Record<string, number>;
  knocked: Record<string, number>;
};

export type LevelSummaryRow = {
  plant: Plant;
  actionLabel: string;
  threatLabel: string;
  threatColor: string;
};

export function createEmptyActionStats(): PlantActionStats {
  return { eaten: {}, knocked: {} };
}

export function cloneActionStats(stats: PlantActionStats): PlantActionStats {
  return {
    eaten: { ...stats.eaten },
    knocked: { ...stats.knocked }
  };
}

export function buildStatsAfterLevel(
  baseStats: PlantActionStats,
  actionLog: readonly PlantActionLogEntry[],
  knockedLampCount: number,
  tvBroken: boolean
): PlantActionStats {
  const stats = cloneActionStats(baseStats);

  actionLog.forEach((entry) => {
    if (entry.action === "eat") {
      addPlantStat(stats, "eaten", entry.plant);
    } else if (entry.action === "knock") {
      addPlantStat(stats, "knocked", entry.plant);
    }
  });

  if (knockedLampCount > 0) {
    stats.knocked.lamp = (stats.knocked.lamp ?? 0) + knockedLampCount;
  }

  if (tvBroken) {
    stats.knocked.tv = (stats.knocked.tv ?? 0) + 1;
  }

  return stats;
}

export function buildLevelSummaryRows(
  actionLog: readonly PlantActionLogEntry[],
  plantsInRoom: readonly Plant[]
): LevelSummaryRow[] {
  const rows = new Map<string, LevelSummaryRow>();

  actionLog.forEach((entry) => {
    rows.set(entry.plant.id, {
      plant: entry.plant,
      actionLabel: getActionLabel(entry.action),
      threatLabel: getThreatLabel(entry.plant),
      threatColor: getThreatColor(entry.plant)
    });
  });

  plantsInRoom
    .filter((plant) => plant.category === "dangerous")
    .forEach((plant) => {
      if (rows.has(plant.id)) {
        return;
      }

      rows.set(plant.id, {
        plant,
        actionLabel: "в комнате",
        threatLabel: getThreatLabel(plant),
        threatColor: getThreatColor(plant)
      });
    });

  return Array.from(rows.values());
}

export function getActionLabel(action: PlantAction): string {
  if (action === "eat") {
    return "съедено";
  }

  if (action === "knock") {
    return "сбито";
  }

  return "обнюхано";
}

export function getThreatLabel(plant: Plant): string {
  if (plant.category === "edible") {
    return "полезное";
  }

  if (plant.category === "neutral") {
    return "нейтральное";
  }

  return "опасное";
}

export function getThreatColor(plant: Plant): string {
  if (plant.category === "edible") {
    return "#b7f28b";
  }

  if (plant.category === "neutral") {
    return "#8ee6ff";
  }

  return "#ff8eb5";
}

function addPlantStat(stats: PlantActionStats, column: keyof PlantActionStats, plant: Plant): void {
  stats[column][plant.id] = (stats[column][plant.id] ?? 0) + 1;
}
