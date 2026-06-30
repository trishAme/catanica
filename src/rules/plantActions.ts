import type { Plant } from "../data/plants";

export type PlantAction = "sniff" | "eat" | "knock";

export type PlantActionOutcome =
  | "show-sniff-card"
  | "gain-purr"
  | "no-reward"
  | "remove-hazard"
  | "lose";

export type PlantActionResult = {
  outcome: PlantActionOutcome;
  title: string;
  body: string;
  purrDelta: number;
  removePlant: boolean;
  revealCategory: boolean;
  isLoss: boolean;
};

export function resolvePlantAction(
  plant: Plant,
  action: PlantAction
): PlantActionResult {
  if (action === "sniff") {
    return {
      outcome: "show-sniff-card",
      title: plant.commonName,
      body: plant.sniffDescription,
      purrDelta: 0,
      removePlant: false,
      revealCategory: false,
      isLoss: false
    };
  }

  if (action === "knock") {
    if (plant.category === "dangerous") {
      return {
        outcome: "remove-hazard",
        title: `${plant.commonName}: опасность устранена`,
        body: plant.resultFact,
        purrDelta: 0,
        removePlant: true,
        revealCategory: true,
        isLoss: false
      };
    }

    return {
      outcome: "no-reward",
      title: `${plant.commonName}: горшок сбит`,
      body:
        plant.category === "edible"
          ? "Перекус потерян, лакомство не получено."
          : "Растение убрано. Лакомств нет, с котиком всё в порядке.",
      purrDelta: 0,
      removePlant: true,
      revealCategory: true,
      isLoss: false
    };
  }

  if (plant.category === "edible") {
    return {
      outcome: "gain-purr",
      title: `${plant.commonName}: вкусно`,
      body: plant.resultFact,
      purrDelta: 1,
      removePlant: true,
      revealCategory: true,
      isLoss: false
    };
  }

  if (plant.category === "neutral") {
    return {
      outcome: "no-reward",
      title: `${plant.commonName}: без восторга`,
      body: plant.resultFact,
      purrDelta: 0,
      removePlant: true,
      revealCategory: true,
      isLoss: false
    };
  }

  return {
    outcome: "lose",
    title: "Вы прокляты Азурой за невнимательность",
    body: plant.resultFact,
    purrDelta: 0,
    removePlant: false,
    revealCategory: true,
    isLoss: true
  };
}
