# Shadow Mafia

A Mafia party game for one phone. One person, called God, runs the whole game: setup, private role reveals, night actions, voting, eliminations and results.

The app is a static React + Vite frontend. There is no backend, database or login.

## Run

```bash
npm install
npm run dev      # local development
npm test         # game-rule tests (node:test, no extra deps)
npm run build    # production build into dist/
```

## Deploy to Vercel

Import the repo into Vercel. The framework (Vite) is detected automatically, and `vercel.json` sets the build command to `npm run build` with output in `dist`. No environment variables are needed.

## Structure

```
src/game/          pure game rules (no React)
  roles.js         role definitions, setup validation, shuffled assignment
  night.js         night-action targets + simultaneous resolution
  voting.js        vote recording/correction/undo, tallies, final-vote outcome
  elimination.js   shared eliminate() + the single win-condition check
  engine.js        game state, validated phase transitions (reducer)
  game.test.js     rule tests
src/components.jsx shared UI: confirm dialog, player grid, God panel, history
src/screens/       one file per stage (setup, reveal, night, day, voting, game over)
```

## Rules as implemented

- **Night:** the Mafia picks one non-Mafia target. The Healer protects one player, and the Policeman investigates one player. All three actions resolve together. A protected target survives, even if the Healer dies that same night. The Policeman's result is shown only in God-only panels. Roles with no living player are skipped. God can undo a night's resolution from the morning screen.
- **Day:** discussion, then a primary vote that nominates the top vote-getter(s) and eliminates nobody. On a tie, God can nominate everyone tied, hold a re-vote among them, or pick the nominees. Defense comes next, then the final vote. In the final vote every living player can vote for any other living player, and whoever gets the most votes is eliminated. A tie goes to a runoff between the tied players. A runoff tie eliminates nobody.
- **Skip to final vote** (from the discussion screen) jumps straight to the final vote, with no nominations or defense.
- **Joker** wins only when eliminated by the final vote. **Suicide Bomber** takes one extra living player down only when eliminated by the final vote. Being killed at night or by the Bomber triggers neither.
- **Win check** runs after every elimination sequence. Town wins at 0 Mafia. Mafia wins when it equals or outnumbers everyone else.
- Players cannot vote for themselves. Each special role (Policeman, Healer, Joker, Suicide Bomber) is limited to one per game.

**House rules (set up before the game):** Healer self-protection, Healer protecting the same player on consecutive nights, whether the Joker's win ends the game, and whether God may break a runoff tie.

## Custom artwork (optional)

The game ships with built-in SVG art. To use your own images (for example from an AI image generator), drop them into `src/assets/art/` with these names (`.png`, `.jpg` or `.webp`). Any file that is present replaces the built-in drawing, and missing ones fall back automatically.

| File | Used for | Example prompt |
|---|---|---|
| `mafia` | Mafia role card | "noir mafia boss in fedora, shadowed face, red rim light, dark background, portrait card art" |
| `villager` | Villager card, Town win | "humble 1930s townsperson holding a lantern, warm light, dark noir style, card art" |
| `policeman` | Policeman card | "1930s detective with badge and flashlight, blue rim light, noir card art" |
| `healer` | Healer card | "night nurse with glowing teal aura, noir style, card art" |
| `joker` | Joker card, Joker win | "sinister jester with grin, amber spotlight, dark noir card art" |
| `suicide-bomber` | Suicide Bomber card | "shadowy figure with lit fuse, orange sparks, noir card art" |
| `night` | Night / welcome scenes | "noir city skyline at night, full moon, purple sky, wide banner" |
| `morning` | Morning / day scenes | "noir city skyline at sunrise, orange glow, wide banner" |
| `graveyard` | Graveyard background | "foggy moonlit graveyard, dark, wide banner" |
| `explosion` | Suicide Bomber screen | "cartoon explosion burst, transparent background" |

Square images work best for roles (about 512×512). Wide images work best for scenes (about 1600×600).

## Limitations

- The game exists only in memory. Refreshing or closing the tab ends it, and the browser warns before you leave.
- Secrets are hidden in the UI, not cryptographically protected. Anyone using browser developer tools can see the game state. The app is meant for a trusted group sharing one device.
