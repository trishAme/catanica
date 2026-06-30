const JOURNAL_KEY = "nine-purrs-plant-journal";

function readIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(JOURNAL_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function getDiscoveredPlantIds(): string[] {
  return readIds();
}

export function markPlantDiscovered(plantId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const ids = readIds();

  if (ids.includes(plantId)) {
    return;
  }

  window.localStorage.setItem(JOURNAL_KEY, JSON.stringify([...ids, plantId]));
}
