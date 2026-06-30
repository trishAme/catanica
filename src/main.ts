import Phaser from "phaser";
import "./style.css";
import { GameScene } from "./game/scenes/GameScene";
import { StartScene } from "./game/scenes/StartScene";

const BASE_WIDTH = 768;
const BASE_HEIGHT = 432;
const RENDER_SCALE = 3;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: BASE_WIDTH * RENDER_SCALE,
  height: BASE_HEIGHT * RENDER_SCALE,
  backgroundColor: "#20233a",
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 920 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [StartScene, GameScene]
};

new Phaser.Game(config);
