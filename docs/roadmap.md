# Catanica Roadmap

This document captures planned improvements for the game after the first playable prototype.
The goal is to keep the project demo-friendly while gradually making it richer, cozier, and more educational.

## Guiding Priorities

1. Keep the core loop clear: sniff, decide, eat or knock, learn, sleep.
2. Improve readability before adding complexity: plants, platforms, UI, and cat states must be understandable at a glance.
3. Add atmosphere in layers: sound, light, room props, and animation should support gameplay instead of hiding it.
4. Keep the demo easy to run from the README.

## Current Product Decisions

- Demo priority: visual polish first, then deeper educational systems.
- Current win target for the first version is 5 useful plants; the final number does not have to be 9.
- Save system:
  - use 3 browser-local save slots;
  - slots are overwritten, not deleted;
  - save selected cat appearance, current room, plant state, and time-of-day/progress state;
  - no sound settings in the first save version.
- Plant label behavior:
  - when the cat is close to a plant, show the plant name;
  - no description is required in the first version;
  - do not reveal the plant category before the level summary.
- End-of-level reveal:
  - show each relevant plant with its visual model, name, and threat level;
  - this is where plant category/safety information becomes explicit.
- Room order is linear.
- Main room set:
  - kitchen;
  - remote worker's office;
  - living room;
  - bedroom;
  - greenhouse;
  - grandma's flower corner.
- Each room should ideally teach a different plant group or household scenario.
- Gameplay stays consistent for now:
  - collect N useful plants;
  - or finish when all useful plants are gone/handled;
  - no special room-specific mechanics yet.
- Dangerous plants can remain untouched unless the cat eats them.
- Neutral plants do nothing for now.
- Knockable lamps should remove their own light when knocked down, but should not make the level significantly harder yet.
- Meme/geek references are allowed, but should stay subtle.
- No mute/volume UI is needed yet.

## Phase 1: Make the Current Prototype Feel Polished

### Music And Sound

- Add dynamic 8-bit music states:
  - daytime: light, playful, simple melody;
  - evening: warmer, softer, fewer notes;
  - night: quiet lullaby-like loop.
- Add several variants of meow and purr sounds so repeated actions do not sound identical.
- Add short room ambience:
  - quiet street outside the window;
  - soft lamp hum in evening or night states;
  - subtle garland shimmer;
  - light night ambience after the final purr.

### Visuals

- Improve the cat animation set:
  - clearer tail and ear movement;
  - better jump pose;
  - soft landing pose;
  - less rigid movement when changing direction.
- Improve plant readability:
  - larger leaves and flowers;
  - unique silhouettes per plant type;
  - stronger detail differences between grasses, orchids, aloe, lilies, pothos, snake plant, and fern.
- Improve lighting:
  - softer window light;
  - warmer lamp and garland light;
  - clearer shadows from shelves, pots, and furniture.
- Improve outside-window states:
  - daytime clouds;
  - sunset palette;
  - city lights at night;
  - tree silhouettes behind the balcony door.

### UX And Demo

- Make the restart-level button always available.
- Add level selection for demo/testing.
- Update README with:
  - quick launch instructions;
  - current controls;
  - screenshots or GIFs;
  - short project pitch.

## Phase 2: Education And Better Feedback

### Gameplay Feedback

- Replace the current `F`-only info flow with contextual plant labels:
  - when the cat stands near a plant, show the plant name;
  - no description is required in the first version;
  - do not directly reveal whether the plant is useful, neutral, or dangerous before the level summary;
  - keep the label short enough that it does not block platforms or the cat.
- After each level, show a compact recap:
  - plants eaten;
  - plants knocked down;
  - dangerous plants encountered;
  - one short educational reminder.

### Learning Layer

- Add a disclaimer:
  - the game is educational and playful;
  - it is not veterinary advice;
  - if a real cat may have eaten a toxic plant, contact a veterinarian or poison hotline.
- Later, add a simple herbarium/journal:
  - sniffed plants can be recorded;
  - acted-on plants can reveal their category after the fact;
  - source links can live in README or an in-game appendix.

## Phase 3: More Rooms And Level Variety

Target total: 6-7 rooms.

Planned room themes:

- Kitchen with windowsill.
- Remote worker's office.
- Grandma's flower corner.
- Living room with sofa.
- Greenhouse.
- Bedroom.
- Optional extra: cozy balcony room or gamer room.

Each room should have:

- unique window or door layout;
- unique sleep spot;
- unique furniture shape;
- increasing visual detail as levels progress;
- enough readable platform routes;
- enough plants for the active level goal.

Add background/interior props gradually:

- scratching post;
- cardboard box;
- cat tunnel;
- cat house;
- blanket;
- food or water bowl;
- toy mouse;
- books;
- cups;
- teapot;
- curtains that can be bumped or brushed during jumps.

Important visual rule: do not overload rooms. Props should create life and warmth, not hide plants or platforms.

## Phase 4: New Gameplay Mechanics

### Level Goals

Later, consider different goal types after the core loop feels stable:

- collect 5 useful plants;
- remove all dangerous plants;
- reach the sleep spot after solving a room;
- optional later goal: identify a target plant from its description.

### Knockable Objects

- Add knockable desk lamps:
  - lamp casts local warm light;
  - the cat can knock it down;
  - the room lighting changes after the lamp goes out.
- Add lightweight props as either obstacles or cozy decoration:
  - books;
  - cups;
  - teapot;
  - small boxes.

## Save System

Planned feature: 3 save slots.

Recommended first implementation: browser-local saves.

Use `localStorage` for the first version because:

- the game is a local browser demo;
- no backend or account system is needed;
- save data will be small;
- it is easy to inspect and reset during development.

Possible saved data:

- selected cat coat;
- current room index;
- plant state in the current room;
- time-of-day/progress state;
- optional later: unlocked herbarium entries;
- optional later: completed room summaries.

Possible future upgrade:

- move from `localStorage` to IndexedDB only if save data grows or includes larger structured state;
- use a backend only if the project later needs cross-device saves or shared demo progress.

## Technical Work

- Add a level validator:
  - all shelves are reachable;
  - platforms do not overlap the window, UI, or important decor;
  - the cat fits between jumpable surfaces;
  - plant slots do not overlap each other or books/decor.
- Move room decorations into config:
  - easier to add rooms;
  - less hardcoded drawing logic in `GameScene`;
  - clearer separation between gameplay geometry and background art.
- Add deterministic generation seed:
  - useful for reproducing layout bugs;
  - can be shown in debug UI;
  - save files can store seed per room.
- Replace some code-generated pixel art with real spritesheets later:
  - cat spritesheet;
  - plant spritesheet;
  - room prop spritesheet;
  - possible animated light effects.

## Suggested Next Implementation Order

1. Improve cat jump, landing, tail, and ear animation.
2. Improve plant silhouettes, size, and detail.
3. Improve lighting polish for window, lamps, garland, and shadows.
4. Add contextual plant-name labels near the cat.
5. Add end-of-level plant recap with model, name, and threat level.
6. Add 3 local save slots.
7. Add level selection for demo/testing.
8. Add the level validator.
9. Add one new room using config-driven decor as the test case.

## Open Questions

- Should the herbarium reveal plant safety only after the first action, or after sniffing plus level completion?
- Should dangerous plants be visually ordinary, or should some have subtle non-obvious warning cues?
- Where should the disclaimer live: README only, start screen, end-of-level recap, or herbarium?
- Should knockable lamps stay purely visual forever, or can darkness later make some plants harder to inspect?
- How many real plant facts should be in-game versus kept in README/source notes?

## Glossary For Planning

- Procedural/code-generated pixel art: sprites are drawn by TypeScript code using rectangles, circles, and simple shapes. This is fast to edit and keeps the project lightweight, but it is harder to make very polished.
- Spritesheet: a normal image file that contains multiple frames of a character or object, for example cat idle, walk, jump, landing, sleep. The game cuts that image into frames and animates them.
- Cat spritesheet option: better visual quality and smoother animation, but we need to create or clean up image assets.
- Code-generated cat option: faster to iterate inside the code, but visual detail is limited.
- Web Audio API: browser-generated sounds made from code. Good for simple 8-bit tones, purrs, blips, and crashes.
- Local mp3/wav assets: real audio files stored in the project. Better for meme sounds, ambience, and music, but they add file size and need asset management.
