# Catanica - Technical Scope

## Recommended Stack

Use:

- **Phaser 3** for the 2D game engine;
- **TypeScript** for game logic and typed plant data;
- **Vite** for local development and bundling;
- **Vitest** for small unit tests around plant rules and scoring;
- **Web Audio API** for simple generated sound effects at first.

## Why Phaser

Phaser is a good fit for this project because it already handles the parts that are annoying to write from scratch:

- game loop;
- sprites;
- keyboard input;
- tilemaps or simple platform collision;
- camera;
- animations;
- arcade physics;
- browser deployment.

This keeps the first version focused on the game idea instead of engine plumbing.

## Alternatives Considered

### Plain Canvas + TypeScript

Simpler dependency tree, but more custom work for collisions, animation states, scenes, and input. Good for tiny arcade games, less convenient for a platformer with shelves and jumping.

### Godot

Great for 2D games, but heavier for a workplace Codex challenge. It also makes the project less immediately inspectable from a typical web README.

### Unity

Too heavy for this scope.

## Project Shape

Expected structure:

```text
.
├── docs/
│   ├── game-design.md
│   └── technical-scope.md
├── public/
│   └── assets/
│       ├── sprites/
│       ├── audio/
│       └── data/
├── src/
│   ├── game/
│   │   ├── scenes/
│   │   ├── entities/
│   │   ├── systems/
│   │   └── config.ts
│   ├── data/
│   │   ├── plants.ts
│   │   ├── cats.ts
│   │   └── sources.ts
│   ├── rules/
│   │   └── plantActions.ts
│   ├── ui/
│   ├── main.ts
│   └── style.css
├── index.html
├── package.json
├── README.md
└── vite.config.ts
```

The exact structure can stay smaller during the first prototype. Add folders only when there is real code to put in them.

## First Playable Prototype

The first playable version should include only:

1. one room scene;
2. a simple start screen with cat coat selection;
3. one controllable cat;
4. walk, jump, drop-through, sniff, eat, and knock controls;
5. simple shelf platforms;
6. a small local plant database;
7. plant interaction rules;
8. purr tracker with 9 happy faces;
9. lose state when eating a dangerous plant;
10. win state when reaching 5 treats;
11. basic day-to-night visual transition.

Do not include generated art, multiple levels, advanced animations, or references in the first coding pass unless the prototype needs them.

## Cat Variant Model

Use a small typed model for the start-screen cat choice:

```ts
export type CatCoat = "gray" | "black" | "orange" | "white" | "tabby" | "calico";
export type CatEyeColor = "green" | "amber" | "yellow" | "copper" | "gold" | "blue" | "hazel" | "odd";

export type CatVariant = {
  coat: CatCoat;
  eyeColor: CatEyeColor;
};
```

Eye color should be generated once from the selected coat palette and then stored for the current playthrough. This keeps the choice cosmetic and simple while making each cat feel personal.

## Plant Data Model

Use typed local data:

```ts
export type PlantCategory = "edible" | "neutral" | "dangerous";

export type Plant = {
  id: string;
  commonName: string;
  scientificName?: string;
  category: PlantCategory;
  sniffDescription: string;
  resultFact: string;
  visualTags: string[];
  sourceKeys: string[];
};
```

Runtime should not fetch plant data from the internet. Sources should be cited in the README and kept in a local `sources.ts` file.

## Plant Rule Model

Keep the rules deterministic and testable outside Phaser:

```ts
export type PlantAction = "sniff" | "eat" | "knock";
export type PlantActionOutcome =
  | "show-sniff-card"
  | "gain-purr"
  | "no-reward"
  | "remove-hazard"
  | "lose";
```

The rule function should answer:

```ts
resolvePlantAction(plant, action) -> outcome
```

This lets tests verify the educational/gameplay behavior without needing a browser.

## Art Strategy

Start with simple pixel-style placeholders:

- colored rectangles and tiny pixel silhouettes;
- CSS or Phaser-generated textures;
- readable plant shapes before final art.

Later, use generated pixel-art assets for:

- cat animation states;
- plant sprites;
- cozy room backgrounds;
- win and lose cutscene accents.

This avoids blocking gameplay on asset generation.

## Sound Strategy

Start with Web Audio API sounds:

- short purr sound for edible plants;
- soft bump/crash for knocked pots;
- tiny UI blip for sniff cards;
- ominous chord for dangerous plant failure;
- soft bedtime tone for level completion.

No music in the first prototype unless the gameplay feels too quiet after the basic sounds are in.

## Testing Strategy

Unit-test first:

- edible + eat -> gain purr;
- edible + knock -> no reward;
- neutral + eat -> no reward;
- neutral + knock -> no reward;
- dangerous + knock -> remove hazard;
- dangerous + eat -> lose;
- sniff never reveals category directly.

Build verification:

- `npm run test`;
- `npm run build`;
- manual browser playthrough.

Optional later:

- Playwright smoke test that loads the game and verifies the canvas appears.

## What the User Needs to Decide

For the first implementation, only a few creative decisions are needed:
- first room vibe;
- whether plant names appear only after sniffing;
- whether the README should be English-only or bilingual.

Everything else can start with conservative defaults and be changed after the first playable version exists.

## Initial Defaults

- Cat coats: gray, black, orange, white, tabby, and calico.
- First room: cozy windowsill and shelves.
- Plant names: shown in sniff cards only.
- README: English first, with Russian notes if useful.
- Asset style: colorful cozy pixel art.
