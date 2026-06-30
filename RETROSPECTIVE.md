# RETROSPECTIVE.md - Catanica / Котаника

## 1. Summary

Catanica was built as an AI-native development challenge project: a cozy pixel-art browser game where a cat explores rooms, learns about houseplants, eats safe cat grass, knocks down risky pots, and goes to sleep.

The most valuable part of the project was not the game idea itself, but the process: using Codex as a development partner across product thinking, implementation, visual iteration, testing, debugging, and documentation.

## 2. AI Tools Used

### Codex

Codex was used for brainstorming, planning, Phaser implementation, TypeScript refactoring, code-generated pixel art, tests, debugging, and documentation.

### Browser / Visual Feedback Loop

The user reviewed the running game in the browser and shared screenshots with specific feedback. This was especially important for cat shape, shelf reachability, lamp and window light placement, plant readability, room decor, and start screen composition.

### Headless Chrome

Headless Chrome was used for visual smoke tests after normal headful browser automation failed in the environment.

### Web Research

Plant-safety references were checked and then converted into a curated local database. Runtime plant lookup was not added.

## 3. Development Workflow

The project evolved in several phases:

1. Concept phase: chose an educational cat-and-plants platformer.
2. Vertical slice phase: built movement, shelves, plants, eating, knocking, win, and loss.
3. Visual iteration phase: reworked cat sprites, rooms, lighting, furniture, plants, sound, and animation details.
4. Systems phase: added save slots, plant journal, statistics, room plant pools, and seeded generation.
5. Testing phase: added unit tests and visual smoke tests.
6. Documentation phase: created README, specification, architecture, and retrospective deliverables.

## 4. What Worked Well

### 4.1 Fast Iteration From Visual Feedback

The strongest workflow was screenshot -> critique -> targeted change -> screenshot again. The user could point at a concrete visual issue, and Codex could quickly locate the relevant drawing or layout code.

### 4.2 Pure Logic Extraction Improved Quality

Early game logic lived mostly inside the Phaser scene. As bugs repeated, the project improved by extracting logic into modules such as plantActions.ts, levelGeneration.ts, levelValidation.ts, actionStats.ts, and audioCues.ts.

### 4.3 Seed-Based Reproducibility Was Important

Random shelf generation caused bugs that were hard to explain from screenshots alone. Adding deterministic seeds made layout issues reproducible and testable.

### 4.4 AI Was Good at Turning Feedback Into Variants

Codex was effective at producing multiple implementation options quickly, especially for room themes, plant pools, sound behavior, test strategy, and documentation structure.

## 5. What Did Not Work Well

### 5.1 Procedural Pixel Art Has Limits

Code-generated pixel art was useful for speed, but many objects initially looked unclear. Furniture, flowers, the tea set, and the cat tail all required repeated redesign.

### 5.2 Visual Taste Still Required Human Direction

Codex could generate shapes, but the user had to repeatedly steer visual taste. The AI accelerated execution, but did not replace art direction.

### 5.3 The Phaser Scene Became Too Large

The main GameScene.ts grew quickly because gameplay, rendering, animation, UI, audio triggers, and level transitions all started in one place. Refactoring helped, but the project would benefit from earlier separation.

### 5.4 Environment Issues Slowed Down Simple Tasks

The local environment repeatedly hit sandbox helper errors:

~~~text
bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted
~~~

Headful browser automation also failed because there was no X server. Workarounds existed, but they added overhead.

## 6. Surprises and Discoveries

### 6.1 Tests Became More Useful After Bugs Repeated

The most valuable tests were not written first. They appeared after recurring bugs: shelves overlapping lamps, unreachable shelves, plants too small, room objects intersecting platforms, save state missing pieces, and wrong sound cues.

### 6.2 Small Visual Fixes Are Often System Fixes

A request like “the shelf overlaps the lamp again” was not just a coordinate change. It meant the decor avoidance zone was incomplete, fallback generation could bypass validation, or tests were too narrow.

### 6.3 AI Is Strong at Maintaining Momentum

The project had many small, subjective iterations. Codex helped keep momentum by making the next small change cheap.

## 7. Estimated Percentage of AI-Generated Code

Estimated AI-generated / AI-edited code: **85-90%**.

Human contribution was still essential in concept direction, visual taste, acceptance decisions, prioritization, and feedback on what felt wrong. Most code was typed by AI, but the product direction was human-led.

## 8. Time Spent

Estimated total time: **20-25 hours** across brainstorming, implementation, visual review, testing, and documentation.

This is an estimate from the working sessions. The exact time should be adjusted if a precise submission number is needed.

## 9. What I Would Do Differently Next Time

1. Start with a thinner GameScene.
2. Define visual asset strategy sooner.
3. Add seed-based validation earlier.
4. Create screenshot baselines earlier.
5. Keep a running retrospective from day one.

## 10. Key Lessons Learned

- AI-native development works best as a loop, not a one-shot prompt.
- The user should give concrete feedback with screenshots and examples.
- AI can produce code quickly, but tests are needed to stabilize repeated bug classes.
- Random generation needs seeds and validators.
- Visual polish requires human judgment.
- Documentation is easier when the workflow is recorded during development.
- Small games are excellent AI-native practice because they include product, design, code, testing, sound, assets, and delivery.

## 11. Reusable Patterns for the Organization

### Pattern 1: Screenshot-Driven Iteration

Use screenshots as review artifacts. Ask the AI to make one focused visual change at a time, then verify with a new screenshot.

### Pattern 2: Convert Repeated Feedback Into Tests

If the same class of issue appears twice, write a validator or unit test.

### Pattern 3: Keep AI Tooling Logs

Record tools used and technical issues as they happen. This makes the retrospective much more useful.

### Pattern 4: Human Product Owner, AI Implementation Partner

The best results came when the human owned taste and direction, while AI handled fast implementation and verification.

### Pattern 5: Make Demoability a Requirement

A project becomes much more useful when someone can run it from README instructions or open a playable link. Local success is not the same as reviewable success.
