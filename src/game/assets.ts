import Phaser from "phaser";
import { CAT_COATS, CAT_EYE_PALETTES } from "../data/cats";
import { PLANTS } from "../data/plants";
import {
  CAT_FRAME_HEIGHT,
  CAT_FRAME_WIDTH,
  getCatSpritesheetKey
} from "./catSprites";

export function preloadPixelAssets(scene: Phaser.Scene): void {
  CAT_COATS.forEach((coat) => {
    const eyeColors = Array.from(new Set(CAT_EYE_PALETTES[coat]));

    eyeColors.forEach((eyeColor) => {
      scene.load.spritesheet(
        getCatSpritesheetKey({ coat, eyeColor }),
        "assets/cats/" + coat + "-" + eyeColor + ".png",
        {
          frameWidth: CAT_FRAME_WIDTH,
          frameHeight: CAT_FRAME_HEIGHT
        }
      );
    });
  });

  PLANTS.forEach((plant) => {
    scene.load.image("plant-" + plant.id, "assets/plants/" + plant.id + ".png");
  });

  scene.load.image("decor-tea-set", "assets/decor/kitchen-tea-set.png");
}
