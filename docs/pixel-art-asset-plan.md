# Pixel Art Asset Plan

Short plan for moving from code-generated pixel art to real bitmap assets without breaking the prototype.

## Current Status

The prototype now loads real PNG assets from `public/assets/` for cat spritesheets, plant sprites, and the first decor object. The procedural drawing code remains as fallback while gameplay sizes and collision feel are still changing.

The current PNGs are a technical bridge, not the final art pass: they prove the asset pipeline, but future iterations can replace them with cleaned hand-authored spritesheets without changing gameplay code.

## Cat Sprite Sheet

Required frames for the first real cat sheet:

- idle
- walk-a
- walk-b
- jump
- sniff
- eat
- knock
- angry
- sleep

Acceptance criteria:

- transparent PNG;
- all frames use the same canvas size;
- paws, tail, ears, and sleep pose are readable at game scale;
- frame bounds match the current cat collision body closely enough that platforms still feel fair;
- coat variants can be recolored or supplied as matching sheets.

## Plant Assets

Plants should be grouped by room and safety role, but the safety category must not be obvious from UI color alone.

Acceptance criteria:

- each plant has a unique silhouette;
- common plants are recognizable first: cat grass, wheat grass, oat grass, aloe, lily, orchid, pothos, snake plant, spider plant, fern;
- flowers and leaves are larger than the pot at gameplay scale;
- pot colors can vary without changing the plant identity;
- asset names stay tied to the local plant database IDs.

## Suggested Pipeline

1. Generate or collect reference images for one small batch.
2. Clean the image into pixel art manually or with a constrained editor pass.
3. Export transparent PNG sheets into `public/assets/`.
4. Load the sheet in Phaser and keep the current procedural version as fallback until the new asset is verified.
5. Run unit tests, build, and visual smoke after each batch.

## First Batch

Start with the cat sheet and the most repeated plants:

- cat grass
- wheat grass
- oat grass
- aloe vera
- lily
- pothos
