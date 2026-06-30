# AI Tools and Technical Issues

This document briefly records which Codex-side tools, skills, and workflows were used while building **Catanica**, plus the technical issues encountered during the process.

## Codex Tools Used

### File and Shell Tools

- `exec_command`: inspected files, ran Node/npm commands, checked git status, and launched the local dev server.
- `apply_patch`: created and edited project files when the sandbox allowed direct patching.
- `multi_tool_use.parallel`: read multiple files or statuses in parallel to reduce waiting time.
- `update_plan`: tracked multi-step implementation work during larger changes.
- `view_image`: attempted to inspect generated screenshots directly.
- `node_repl`: displayed the visual smoke screenshot when `view_image` was blocked by the sandbox helper.

### Browser and Visual Checks

- `mcp__chrome_devtools`: attempted to open the game in the browser, but the environment could not launch a headful browser because there was no X server.
- A project-local `npm run visual:smoke` script was added as a workaround. It starts Vite, opens the game with headless Chrome, captures a screenshot, and checks that the screenshot is not blank.
- A direct headless Chrome screenshot of `/` was also used for StartScene layout checks, because the smoke route intentionally jumps straight into the game scene.

### Web and Research

- `web.run`: used to look up current plant-safety references and source URLs for the local plant database.
- Primary plant-safety references recorded so far:
  - ASPCA Toxic and Non-Toxic Plant List - Cats;
  - Pet Poison Helpline - Lilies.

### Tool Discovery

- `tool_search`: checked whether a dedicated audio/sound generation tool was available. No relevant audio tool was found, so the first prototype uses Web Audio API tones.

## Skills Used

### `imagegen`

The `imagegen` skill documentation was read to understand how Codex can later generate pixel-art bitmap assets such as:

- cat sprites;
- plant sprites;
- cozy room backgrounds;
- win/lose cutscene art.

The project has not yet used generated image assets. The first playable prototype intentionally uses code-generated placeholder sprites so gameplay is not blocked by art production.

## Project Tools Added

### Phaser 3

Chosen as the browser game engine because it provides:

- a game loop;
- keyboard input;
- sprites;
- simple arcade physics;
- collision handling;
- browser-friendly deployment.

### Vite

Used for local development and production builds.

### TypeScript

Used for typed plant data, cat variants, and game logic.

### Vitest

Used for unit tests around:

- plant action rules;
- cat eye-color generation.

### Headless Chrome Visual Smoke Test

Added in `scripts/visual-smoke.mjs`.

It verifies that the game can render in a browser-like environment without requiring a visible desktop window.

## Technical Issues Encountered

### Sandbox Helper Failures

Several simple commands intermittently failed with:

```text
bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted
```

This affected commands such as:

- `rg --files`;
- `mkdir -p`;
- `node --version`;
- `npm run test`;
- `npm run build`;
- local `curl` requests;
- some `apply_patch` file edits;
- direct screenshot viewing with `view_image`.

Workaround:

- reran safe commands with narrow escalation approvals when needed;
- used `perl -0pi` for small targeted edits when `apply_patch` could not read files through the sandbox helper;
- avoided broad or destructive permissions.

### Headful Browser Could Not Launch

The Chrome DevTools MCP failed with:

```text
Missing X server to start the headful browser.
```

Workaround:

- added a headless Chrome smoke test;
- used `/usr/bin/google-chrome` with `--headless=new`;
- saved screenshots under `artifacts/`;
- ignored generated screenshots in git.

### TypeScript Build Error

The first `npm run build` caught a Phaser config type error:

```text
Property 'x' is missing in type '{ y: number; }' but required in type 'Vector2Like'.
```

Fix:

- changed arcade gravity from `{ y: 430 }` to `{ x: 0, y: 430 }`.

### Large Bundle Warning

The production build warns that the Phaser bundle is larger than 500 kB after minification.

Current decision:

- acceptable for the first prototype;
- no code splitting yet, because the project is still small and the priority is playable functionality.

### 2026-06-27 Visual QA Note

During the room-detail iteration, direct Chrome DevTools access still failed because the environment could not start a headful browser without an X server. A normal local `curl` check also hit the sandbox helper issue. Workaround: used approved headless Chrome screenshots and displayed the resulting PNG through `node_repl.emitImage` for visual review.

### 2026-06-27 Animation and Reachability Fix Note

While fixing idle cat jitter and second-room shelf reachability, `apply_patch` again failed with the sandbox helper error:

```text
bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted
```

Workaround:

- used narrow `perl -0pi` replacements for the small code edits;
- reran `npm run check`;
- captured a second-room headless Chrome screenshot at `/tmp/nine-purrs-level2-fix.png` for visual inspection.

### 2026-06-27 Defeat Sound Asset Note

Added `public/assets/nononono-cat.mp3` from the user-provided Downloads file for the defeat state. The sound is played for up to three seconds and stopped early when the player restarts the level. Creating the asset directory and copying the file both hit the known `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted` sandbox helper issue, so the commands were rerun with narrow approvals.

### 2026-06-29 Spritesheet and Save Iteration Note

Started moving the cat from direct per-frame drawing inside the scene to a spritesheet-style helper in `src/game/catSprites.ts`. The current sheet is still generated by code, but the scene now switches named frames such as idle, walk, jump, angry, and sleep through a single texture API. This keeps the game ready for real imported spritesheet assets later.

Added the first local save-slot implementation with `localStorage`, contextual plant-name labels, and a compact end-of-level plant recap.

The user-provided defeat mp3 was trimmed in place to roughly the first three seconds. `ffmpeg` was not available in the environment, so the trim was done with the Node REPL by parsing mp3 frame headers and writing a shortened file.

### 2026-06-29 Russian UI and Room QA Note

While translating the in-game UI and checking room layouts, the local sandbox helper again intermittently failed with:

```text
bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted
```

Affected operations:

- `apply_patch` could not read files for direct patching;
- sandboxed `rg` sometimes failed while searching for leftover English UI strings;
- `view_image` could not open the generated screenshots.

Workaround:

- used `node_repl` for small exact workspace file edits after `apply_patch` failed;
- reran read-only `rg` with narrow approval;
- captured room screenshots with approved headless Chrome and displayed them via `node_repl.emitImage`;
- reran `npm run check` after the code and test updates.

### 2026-06-29 Level Validator and Seed Iteration Note

Added deterministic level-generation seeds, a reusable level validator, and tests for room blueprints, resolved shelf layout failures, save-slot seed persistence, and PNG asset presence. The validator checks reachability, window/UI overlap, shelf overlap, decor avoidance zones, furniture clearance, and cat vertical clearance for resolved shelf layouts.

The sandbox helper issue appeared again while editing:

```text
bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted
```

Workaround:

- attempted `apply_patch` first, then used `node_repl` for exact workspace file edits after the sandbox helper failed;
- reran read-only inspections and `npm run check` with narrow approvals;
- kept the full verification path green after the changes.

## Current Verification Commands

```bash
npm run test
npm run build
npm run visual:smoke
npm run check
```

`npm run check` currently runs unit tests, production build, and the headless visual smoke test.
