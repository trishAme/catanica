# Catanica

Cozy pixel-art educational platformer about a cat, houseplants, and the important bedtime work of collecting five cat treats.

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Test

```bash
npm run test
npm run build
npm run visual:smoke
```

`npm run visual:smoke` runs the game in a local Vite server, opens it in headless Chrome, saves a screenshot to `artifacts/visual-smoke-game.png`, and checks that the screenshot is not blank. It uses `/usr/bin/google-chrome` by default; set `CHROME_BIN` if Chrome lives elsewhere.

## How to Play

Choose a cat coat, then explore the room as the cat.

| Input | Action |
| --- | --- |
| `Left` / `Right` or `A` / `D` | Walk |
| `W` | Jump |
| `S` or `Down` | Drop through a shelf |
| `F` | Sniff a nearby plant |
| `E` | Eat a nearby plant |
| `Q` | Knock a nearby pot off the shelf |

Eat cat-grass-style plants to gain purrs. Sniff plants to see their name and a short recognition clue. Knock down plants that should not be eaten. The level ends when the cat gets 5 treats and goes to sleep, or when the cat eats a dangerous plant.

## Current Prototype Scope

- Phaser 3 + TypeScript + Vite.
- Start screen with gray, black, orange, white, tabby, and calico cats.
- Eye color generated from the selected coat palette.
- One playable room with shelves and placeholder pixel-style sprites.
- Local curated plant data.
- Sniff, eat, and knock actions.
- Unit-tested plant action rules.
- Basic purr tracker and day-to-night transition.

## Plant Data Note

The game uses a small curated local plant database instead of fetching plant data at runtime. This keeps the demo deterministic and easy to run.

This is an educational prototype, not veterinary advice. If a real cat may have eaten a harmful or questionable plant, contact a veterinarian or animal poison control.

Initial references:

- [ASPCA Toxic and Non-Toxic Plant List - Cats](https://www.aspca.org/pet-care/animal-poison-control/cats-plant-list)
- [Pet Poison Helpline - Lilies](https://www.petpoisonhelpline.com/poison/lilies/)

## Design Docs

- [Game Design Draft](docs/game-design.md)
- [Technical Scope](docs/technical-scope.md)
- [AI Tools and Technical Issues](docs/ai-tools-and-issues.md)
- [Later Notes](docs/later-notes.md)
- [Next Iteration Questions and Ideas](docs/next-iteration-questions.md)
- [Pixel Art Asset Plan](docs/pixel-art-asset-plan.md)
