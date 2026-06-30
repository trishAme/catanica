# Catanica - Game Design Draft

## One-Line Pitch

**Catanica** is a cozy pixel-art educational platformer where the player controls a cat exploring apartment shelves, sniffing houseplants, eating cat-safe treats, knocking dangerous pots away, and collecting five cat treats before bedtime.

## Current Assumptions

- The player directly controls the cat.
- The game has no timer at first. The player can explore calmly.
- The level ends when the cat collects 9 happy faces or eats a dangerous plant.
- The cat is never shown as actually harmed. Failure is dramatic, funny, and educational.
- Plant knowledge is stored in a curated local database, not fetched live at runtime.
- The first version focuses on common household plants: flowers someone brought home, or pots inherited from a relative.
- References and memes, including the Azura failure line, are flavor, not the central premise.

## Target Audience

People around 20-40 who like cats, cozy games, pixel art, geek humor, and light RPG/fantasy references. The tone should feel cute, warm, a little mischievous, and smart enough for people who enjoy discovering small references.

## Cat Selection

At the start of the game, the player chooses a cat coat. This is cosmetic only and does not affect gameplay difficulty or plant rules.

Available coats:

| Coat | Eye color palette |
| --- | --- |
| Gray | green, amber |
| Black | yellow, green, copper |
| Orange | gold, amber |
| White | blue, green, amber, rare odd eyes |
| Tabby | green, amber, hazel |
| Calico | green, gold, copper, rare odd eyes |

The eye color is generated after coat selection from that coat-specific palette. The generated result stays fixed for the playthrough, so the chosen cat feels like a specific little character rather than a constantly changing skin.

## Game Pillars

1. **Cozy first**
   - No early pressure timer.
   - Warm apartment scenes.
   - Pixel art, soft lighting, plants, shelves, blankets, windows, stars.

2. **Learn by choosing**
   - The player can inspect plants, but the game does not directly reveal the correct action before the choice.
   - Failure and neutral outcomes explain what happened after the decision.

3. **Cat agency**
   - The cat is not something to protect from outside.
   - The player is the cat: walking, jumping, sniffing, eating, knocking pots down.

4. **Bedtime progression**
   - Every edible cat plant gives one happy face and a purr.
   - As purrs accumulate, the room becomes darker and calmer.
   - At 5 treats, the cat goes to sleep in a level-specific place.

## Core Loop

```text
explore shelves -> find plant -> sniff/read card -> choose action -> learn result -> collect purrs -> room darkens -> cat sleeps
```

## Controls

| Input | Action |
| --- | --- |
| `Left` / `Right` or `A` / `D` | Walk |
| `W` | Jump |
| `S` or `Down` | Drop through a shelf |
| `F` | Sniff nearby plant |
| `E` | Eat nearby plant |
| `Q` | Knock nearby pot off the shelf |

## Plant Actions

| Plant type | Action | Result |
| --- | --- | --- |
| Edible cat plant | Sniff | Shows plant card with name and short description, without safety label |
| Edible cat plant | Eat | +1 happy face, cat purrs |
| Edible cat plant | Knock down | Plant is lost, no reward |
| Neutral plant | Sniff | Shows plant card with name and short description, without safety label |
| Neutral plant | Ignore | Nothing happens |
| Neutral plant | Eat | No reward; show short fact that the cat is fine, but the plant was not useful |
| Neutral plant | Knock down | No gameplay reward; plant is simply removed |
| Dangerous plant | Sniff | Shows plant card with name and short description, without safety label |
| Dangerous plant | Ignore | Nothing happens while the cat does not eat it |
| Dangerous plant | Knock down | Correct choice; hazard removed |
| Dangerous plant | Eat | Lose state: "Вы прокляты Азурой за невнимательность" |

## Sniffing

Sniffing is a safe inspection action. It opens a small educational card with:

- common plant name;
- optional scientific name;
- short visual/household description;
- one neutral fact that helps recognition.

The sniff card must not say:

- "safe";
- "dangerous";
- "edible";
- "eat this";
- "knock this down".

The goal is to teach recognition without turning the game into a tooltip quiz.

Example sniff card:

```text
Lily
Large showy flowers often found in bouquets. Some varieties have long petals and strong pollen.
```

After the player acts, the result card can reveal the educational safety fact.

Example failure result:

```text
Вы прокляты Азурой за невнимательность.
Котик в порядке, но лилии - один из самых опасных видов растений для кошек.
```

## Win Condition

The player wins a level by collecting 9 happy faces.

Each happy face is earned by eating an edible cat plant. When this happens:

- the cat purrs;
- a happy face is added to the purr tracker;
- the room shifts slightly closer to nighttime;
- the plant is consumed and removed from the level.

At 9 happy faces:

- player control pauses;
- the cat walks to the level's sleeping spot;
- a short bedtime cutscene plays.

## Lose Condition

The player loses only if the cat eats a dangerous plant.

Failure tone:

- dramatic;
- funny;
- clear that the cat is okay;
- educational about the plant.

Main failure line:

```text
Вы прокляты Азурой за невнимательность.
```

Supporting line:

```text
Котик в порядке. Он просто очень разочарован вашим ботаническим легкомыслием.
```

## Visual Style

- Colorful cozy pixel art.
- Cute but not babyish.
- Warm apartment palette with readable plant silhouettes.
- Pixel-perfect scaling.
- No blurry pixel art.
- Day-to-night lighting progression across the level.

Suggested internal canvas resolution:

```text
384 x 216, scaled up with nearest-neighbor rendering
```

## Bedtime Progression

The room changes as happy faces accumulate:

| Happy faces | Mood |
| --- | --- |
| 0-2 | Daylight |
| 3-5 | Warm evening |
| 6-8 | Blue-purple dusk |
| 9 | Night, stars, sleep cutscene |

Cutscene elements:

- dark window;
- slow clouds;
- small stars;
- soft indoor highlights;
- sleeping cat;
- tiny `zzz` or purr animation.

## Level Concepts

### Level 1: Grandma's Pot

Small apartment room with a windowsill, table, and a few shelves. Common plants and one bouquet. Focus: everyday household risks.

Sleeping spot: soft cat bed.

### Level 2: Living Room Shelves

More vertical movement, more similar green houseplants, and more chances to choose between eating, ignoring, and knocking down.

Sleeping spot: blanket shelf.

### Level 3: Desk at Night

Denser room layout, warmer geeky atmosphere, laptop desk, books, and plants with less obvious silhouettes.

Sleeping spot: laptop keyboard.

## Initial Plant Categories

The first plant set should stay small and recognizable.

### Edible Cat Plants

- cat grass;
- oat grass;
- wheat grass;
- barley grass.

### Neutral Plants

- spider plant;
- Boston fern;
- calathea / prayer plant;
- peperomia;
- orchid.

### Dangerous Plants

- lily;
- aloe vera;
- pothos / devil's ivy;
- snake plant;
- dracaena;
- peace lily;
- monstera;
- philodendron;
- dieffenbachia.

## Plant Data Strategy

Use a curated local data file, likely `plants.ts` or `plants.json`.

Each plant entry should include:

```ts
{
  id: "lily",
  commonName: "Lily",
  scientificName: "Lilium / Hemerocallis",
  category: "dangerous",
  sniffDescription: "Large showy flowers often found in bouquets.",
  resultFact: "Lilies are especially dangerous for cats and should not be kept where cats can reach them.",
  visualTags: ["flower", "bouquet", "long-petals"],
  sourceKeys: ["aspca", "pet-poison-helpline"]
}
```

Why local data:

- deterministic gameplay;
- no dependency on network during demo;
- easier to test;
- easier to keep educational text short and game-friendly;
- sources can still be documented in README.

## First Prototype Scope

Build the smallest playable version:

1. One room.
2. One controllable cat.
3. Simple shelves/platforms.
4. Three plant types.
5. Sniff, eat, and knock actions.
6. Happy face tracker.
7. Win at 5 treats.
8. Lose on eating a dangerous plant.
9. Basic day-to-night transition.
10. Simple bedtime cutscene.

## Open Questions

- Should plant names be shown above pots before sniffing, or only inside the sniff card?
- Should edible cat plants respawn, or should levels always contain enough fixed edible plants to win?
- Should the first version use hand-drawn code-native pixel placeholders before generated sprites?
- Should the README be English-only for the workplace challenge, or bilingual?
