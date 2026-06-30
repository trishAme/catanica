# ARCHITECTURE.md - Catanica / Котаника

## 1. Technology Stack

| Area | Technology |
| --- | --- |
| Game engine | Phaser 3 |
| Language | TypeScript |
| Build tool | Vite |
| Tests | Vitest |
| Visual smoke | Headless Chrome + pngjs |
| Audio | Web Audio API + one local mp3 defeat sample |
| Storage | Browser localStorage |
| Art pipeline | Code-generated PNG spritesheets and decor assets |
| Runtime data | Local TypeScript data modules |

## 2. Architecture Overview

The project is a small browser game with a data-first structure.

~~~text
src/
  data/
    cats.ts                cat coats, palettes, eye colors
    plants.ts              curated plant database
    roomPlantPools.ts      room-specific plant pools
    levels.ts              room metadata and static layout config
    levelValidation.ts     resolved layout validator
    levelGeneration.ts     seed-based shelf and plant-plan generation
  rules/
    plantActions.ts        pure plant action rules
  game/
    actionStats.ts         level and final statistics helpers
    audioCues.ts           testable audio cue mapping
    assets.ts              asset preload helpers
    catSprites.ts          generated spritesheet frame API
    plantJournal.ts        local herbarium persistence
    saveState.ts           local save-slot persistence
    sound.ts               Web Audio music and effects
    scenes/
      StartScene.ts        title screen, cat selection, saves
      GameScene.ts         main Phaser scene
scripts/
  generate-pixel-assets.mjs
  visual-smoke.mjs
~~~

The main scene owns real-time Phaser behavior, while rules and data-heavy logic are kept in pure modules wherever practical. This made it possible to test the most error-prone logic without starting a browser.

## 3. Major Design Decisions

### 3.1 Local Curated Plant Database

The game does not fetch plant data at runtime. Plant information lives in src/data/plants.ts.

Reasons:

- deterministic demo;
- no network dependency;
- easier testing;
- easier review of educational copy;
- avoids implying live medical authority.

### 3.2 Seed-Based Level Generation

Shelf placement is generated from a seed and then validated. The seed is saved with the game state, so bugs can be reproduced.

The validator checks shelf reachability, window/UI/decor overlap, object overlap, furniture clearance, cat vertical clearance, and enough usable plant slots.

### 3.3 Pure Rule Modules for Testability

Plant rules are implemented in src/rules/plantActions.ts rather than directly inside Phaser event handlers. The same approach was later used for action statistics, audio cue contracts, and level generation.

### 3.4 Generated Pixel Art First

The game currently uses code-generated PNG assets and Phaser-generated fallback sprites. This was a conscious prototype decision.

Benefits:

- no external art pipeline blocker;
- easy regeneration after cat/plant changes;
- tests can verify asset existence and rough visible bounds;
- later migration to real sprite sheets is still possible.

Tradeoff:

- procedural art is harder to make charming than hand-authored assets;
- small visual details required many screenshot iterations.

### 3.5 Web Audio for Most Sounds

Most sound effects and music are generated with Web Audio API. One user-provided mp3 sample is used for the defeat sound.

### 3.6 Local Save Slots

The save system uses localStorage with three overwrite-only slots. A backend was intentionally not added because the challenge does not require cross-device progress.

## 4. AI Tooling Used

Primary tool:

- Codex as coding agent, planner, test writer, and documentation assistant.

Supporting workflows:

- browser screenshots through the in-app browser and headless Chrome;
- visual smoke tests for nonblank rendering;
- Node-based scripts for asset generation and diagnostics;
- iterative user feedback on screenshots and game feel.

The project also records a more detailed tool log in [docs/ai-tools-and-issues.md](docs/ai-tools-and-issues.md).

## 5. Agent Workflow

The workflow was intentionally AI-native and iterative:

1. Brainstorm game concept with the user.
2. Convert the concept into a playable vertical slice.
3. Use screenshots for visual critique.
4. Apply targeted fixes.
5. Add tests after repeated bug patterns appeared.
6. Refactor fragile scene logic into pure helper modules.
7. Expand documentation once the first version stabilized.

The user acted as product owner, visual director, QA reviewer, and domain sanity-checker. Codex acted as implementation partner, test writer, debugger, and documentation drafter.

## 6. Testing Architecture

Current verification command:

~~~bash
npm run check
~~~

It runs unit tests, a TypeScript production build, and headless Chrome visual smoke screenshots for the start screen and all six rooms.

Test coverage includes plant action rules, cat eye generation, room plant pools, level blueprints, level generation across many seeds, save state, plant journal, final statistics, audio cue contracts, generated PNG assets, and visual smoke checks.

## 7. Deployment Notes

The current MVP is local-first.

Recommended GitLab Pages / GitDocs next step:

1. Build with npm run build.
2. Publish Vite dist/ as a static site.
3. Add a README playable link.
4. Store any credentials only in GitLab CI/CD variables, never in the repository.

For Vite under GitLab Pages, the final base path may need to be configured depending on repository/project URL.
