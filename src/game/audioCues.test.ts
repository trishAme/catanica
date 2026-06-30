import { describe, expect, it } from "vitest";
import { LEVELS } from "../data/levels";
import { PLANTS } from "../data/plants";
import { resolvePlantAction } from "../rules/plantActions";
import { DEFEAT_AUDIO_VOLUME, getMusicThemeIds } from "./sound";
import { getObjectKnockAudioCues, getPlantActionAudioCues } from "./audioCues";

function plant(id: string) {
  const found = PLANTS.find((candidate) => candidate.id === id);

  if (!found) {
    throw new Error("Missing plant " + id);
  }

  return found;
}

describe("audio cues", () => {
  it("maps plant actions to the intended non-error sounds", () => {
    expect(getPlantActionAudioCues("eat", resolvePlantAction(plant("cat-grass"), "eat"))).toEqual(["munch"]);
    expect(getPlantActionAudioCues("eat", resolvePlantAction(plant("lily"), "eat"))).toEqual(["defeat-cat"]);
    expect(getPlantActionAudioCues("knock", resolvePlantAction(plant("lily"), "knock"))).toEqual(["meow", "pot-break"]);
    expect(getPlantActionAudioCues("knock", resolvePlantAction(plant("rose"), "knock"))).toEqual(["meow", "pot-break"]);
    expect(getPlantActionAudioCues("sniff", resolvePlantAction(plant("rose"), "sniff"))).toEqual(["blip"]);
  });

  it("uses crash-style cues for breakable room objects", () => {
    expect(getObjectKnockAudioCues("lamp")).toEqual(["meow", "crash"]);
    expect(getObjectKnockAudioCues("tv")).toEqual(["meow", "crash"]);
  });

  it("has a music theme for every room and a quieter defeat sample", () => {
    expect(new Set(getMusicThemeIds())).toEqual(new Set(LEVELS.map((level) => level.id)));
    expect(DEFEAT_AUDIO_VOLUME).toBeLessThanOrEqual(0.35);
  });
});
