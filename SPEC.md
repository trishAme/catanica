# SPEC.md - Catanica / Котаника

## 1. Game Rules

### 1.1 Player Role

The player controls the cat directly. The game is not about protecting a cat from the outside; the player is the cat, making decisions in the room.

### 1.2 Goal

Each level is completed when the cat collects **5 treats** by eating edible cat plants. When the level goal is met, the cat walks to a room-specific sleeping spot and lies down.

If all plants are removed before the treat goal is reached, the level still ends successfully with the message that the cat goes to sleep hungry but proud.

### 1.3 Plant Categories

Plants have one of three categories:

| Category | Player Action | Result |
| --- | --- | --- |
| Edible / cat plant | Eat | +1 treat, plant removed |
| Edible / cat plant | Knock | Plant removed, no treat |
| Neutral plant | Eat | Plant removed, no treat, no loss |
| Neutral plant | Knock | Plant removed, no treat |
| Dangerous plant | Knock | Hazard removed, no loss |
| Dangerous plant | Eat | Loss state |

### 1.4 Plant Recognition Labels

When the cat stands near a plant, the game shows the plant name as a contextual label. The label helps the player identify the plant, but it does not reveal the safety category before the player acts.

### 1.5 Loss State

The player loses only if the cat eats a dangerous plant.

Primary loss line:

~~~text
Вы прокляты Азурой за невнимательность
~~~

The cat is visually safe. The failure is intentionally dramatic and humorous.

### 1.6 Progression

The game currently contains six linear rooms:

1. Kitchen
2. Remote Office
3. Living Room
4. Bedroom
5. Greenhouse
6. Grandma Corner

The player advances to the next room after completing the current one.

## 2. Scope Definition

### 2.1 In Scope for V1

- Playable browser game built with Phaser.
- Six rooms with different visual themes.
- Cat selection screen.
- Six cat coats: gray, black, orange, white, tabby, calico.
- Generated eye color based on coat.
- Keyboard controls.
- Platforming across shelves and furniture.
- Edible, neutral, and dangerous plants.
- Local plant database.
- Room-specific plant pools.
- Contextual plant labels, eat actions, and knock actions.
- Treat counter.
- Lighting progression within levels.
- Level recap with plant model, name, action, and threat level.
- Final game statistics: eaten and knocked items.
- Local save slots using localStorage.
- Plant journal / herbarium.
- Generated PNG spritesheets and plant assets.
- Web Audio sound effects and room music.
- Automated tests and headless visual smoke checks.

### 2.2 Out of Scope for V1

- Online multiplayer.
- Backend storage.
- Real-time plant API integration.
- Veterinary-grade medical advice.
- Mobile touch controls.
- Fully hand-authored professional sprite sheets.
- Perfect pixel-art polish for every object.
- Production deployment as a required MVP deliverable.

### 2.3 Optional Bonus Scope

- GitLab Pages / GitDocs deployment.
- README playable link.
- Short demo video.
- More rooms and more plant families.
- Real imported sprite sheets.

## 3. Functional Requirements

### 3.1 Start Screen

- The game must show the title and cat selection.
- The player must be able to select a cat by clicking the cat sprite.
- Save slots must show room names rather than raw room numbers.
- The start screen must show an educational disclaimer.

### 3.2 Controls

- The cat must be able to walk left and right.
- The cat must jump.
- The cat must drop through shelves.
- The game must show contextual plant names near the cat.
- The cat must eat and knock nearby plants or objects.
- The player must be able to open the herbarium.
- The player must be able to open save slots.
- The player must be able to restart / return to the main menu with confirmation.

### 3.3 Plants

- Every plant must have an id, Russian common name, category, recognition text, result text, visual tags, and source keys.
- Every plant must have a PNG sprite.
- Every room plant pool must contain enough edible plants to make the level winnable.
- Dangerous plants must cause a loss when eaten.
- Dangerous plants must be removable by knocking.
- Neutral plants must not reward treats.

### 3.4 Levels and Layout

- Each level must have shelves, furniture, sleep spot, palette, and room metadata.
- Generated shelf layouts must be deterministic by seed.
- Generated layouts must pass validation: shelves are reachable, objects do not overlap, and enough plant slots exist for the level goal.

### 3.5 Save System

- The game must support three local save slots.
- A save must preserve cat variant, level index, treat count, lighting stage, seed, shelf layout, plant states, lamp states, and TV broken state.
- Save slots are overwrite-only in V1.

### 3.6 Audio

- Eating an edible plant must play a munch-like sound.
- Knocking a pot must play a meow and ceramic break sound.
- Breaking a lamp or TV must play a meow and crash sound.
- Eating a dangerous plant must play the defeat cat sample for up to three seconds or until restart.
- Every room must have a music theme.

### 3.7 Summary and Ending

- At the end of each level, the game must show a compact recap of plants encountered in that room.
- At the end of all rooms, the game must show final statistics with eaten and knocked columns.
- Knocked lamps and TV must be counted in the knocked column.

## 4. Acceptance Criteria

The project is acceptable for the challenge when:

1. A reviewer can clone the repository, run npm install, then run npm run dev and play the game locally.
2. npm run check passes.
3. README explains overview, gameplay, screenshots, setup, run, and test instructions.
4. SPEC.md, ARCHITECTURE.md, and RETROSPECTIVE.md exist at repository root.
5. The player can complete all six rooms without developer tools.
6. The player can lose by eating a dangerous plant.
7. The player can save and load local progress.
8. The plant journal opens and shows discovered plants.
9. The final screen shows eaten and knocked statistics.
10. The repository does not contain tokens, credentials, or work-private product code.

## 5. Non-Functional Requirements

- The game must run in a modern desktop browser.
- The game must not require network access at runtime.
- The game must keep plant data deterministic and locally testable.
- The game should be easy to demo from the README.
- The game should remain small enough for quick iteration.
