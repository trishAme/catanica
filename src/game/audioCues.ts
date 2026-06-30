import type { PlantActionResult } from "../rules/plantActions";
import type { PlantAction } from "../rules/plantActions";

export type AudioCue = "blip" | "munch" | "meow" | "pot-break" | "crash" | "defeat-cat";

export function getPlantActionAudioCues(action: PlantAction, result: PlantActionResult): AudioCue[] {
  if (action === "sniff") {
    return ["blip"];
  }

  const cues: AudioCue[] = [];

  if (result.outcome === "gain-purr") {
    cues.push("munch");
  }

  if (action === "knock" && result.removePlant) {
    cues.push("meow", "pot-break");
  }

  if (result.isLoss) {
    cues.push("defeat-cat");
  }

  return cues;
}

export function getObjectKnockAudioCues(object: "lamp" | "tv"): AudioCue[] {
  return object === "lamp" ? ["meow", "crash"] : ["meow", "crash"];
}
