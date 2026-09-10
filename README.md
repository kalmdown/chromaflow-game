# Chromaflow

A turn-limited colour flood puzzle for the browser. You own the top-left tile;
each turn you pick a colour, your whole region becomes that colour and swallows
every connected tile of it. Clear the board before your turns run out — and land
on the level's target colour with your last move.

Original game, original art (everything is CSS and inline SVG — no image assets),
original level data. No backend, no accounts, no telemetry, no ads.

## Running it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:5173 by default).

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck (`tsc -b`) then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` on its own |
| `npm test` | Vitest — engine unit tests plus a solvability replay of all 18 levels |
| `npm run levels:validate` | Dev-only: replay every level's reference solution and report |
| `npm run levels:build` | Dev-only: regenerate `src/game/levels.ts` from the specs in `scripts/generate-levels.ts` |
| `python3 scripts/generate-icons.py` | Dev-only: regenerate the PWA icon PNGs in `public/` |

## Rules

- **Flood fill.** Connections are orthogonal only — up, down, left, right.
- **Picking a colour.** Use the palette buttons, the number keys, or just tap a
  tile on the board — a tile is a shortcut to its own colour.
- **Turn limit.** A turn is spent only on a valid colour change; re-picking your
  current colour is disabled.
- **Target colour.** You win only when every playable tile is absorbed *and*
  your flow's final colour is the level's target.
- **Target reserve.** If you absorb the last unclaimed tiles of the target
  colour while other tiles remain, the level ends immediately as a loss — there
  is no longer any way to finish on the target. Save one.
- **Scoring.** 10 points per absorbed tile. Four or more tiles in a turn extends
  a combo; consecutive combo turns multiply by 1.25×, 1.5×, then 2× (capped).
  One small turn resets it.
- **Stars.** One star for completing, a second and third for score plus spare
  turns. Only *completion* unlocks the next level.

### Board variety

Two independent axes, both set per level in `scripts/generate-levels.ts`.

**Shape** — the board outline. Holes (`void` tiles) are never playable and never
counted; the generator rejects any mask that would disconnect the board, and
carves a one-tile inlet along the top edge if a corner cut would strand the
origin at (0,0).

Every shape other than `full` changes how the flow can route — a hole that only
trims tiles off a far corner is decoration, not design.

| Shape | Effect on play | Levels |
| --- | --- | --- |
| `full` | plain rectangle | 1–6, 11, 12, 15, 18 |
| `serpentine` | two offset walls with gaps at opposite ends — an S-shaped route through two chokepoints | 7 |
| `atoll` | a diamond with its middle punched out; the far side is reached by committing to one arm of the ring | 8 |
| `cross` | arms a third of the board wide, so the four lobes meet only at a central hub | 9, 17 |
| `hourglass` | two bulbs joined by a neck a couple of tiles wide that everything has to pass through | 10 |
| `frame` | hollow centre — you play around a ring | 13 |
| `pillars` | a lattice of 2×2 obstacles that every route has to weave through | 14 |
| `teeth` | a comb of dead-end fingers along the bottom edge, each entered and finished deliberately | 16 |

**Layout** — how the hues are distributed, each with 25–35% noise so no board is
mechanically regular.

| Layout | Character | Levels |
| --- | --- | --- |
| `blobs` | clumpy organic regions, big early absorptions | 1, 2, 4, 7, 11 |
| `bands` | repeating diagonal stripes | 3, 16 |
| `rings` | concentric square rings from the centre | 6, 8, 13 |
| `patchwork` | 2×2 blocks | 5, 12, 17 |
| `weave` | interleaved diagonal lattice, most fragmented | 14, 18 |
| `quadrants` | each quadrant leans on its own overlapping run of three colours, so regions demand different picks | 9 |
| `gradient` | one wide band per colour along the diagonal — huge absorptions near the origin, then a long tail | 10 |
| `veins` | long snaking single-colour threads traced by random walks, so one pick can reach right across the board | 15 |

Shape and layout are chosen to reinforce each other: `quadrants` gives each lobe
of the `cross` its own palette, `gradient` runs its strata down the `hourglass`
toward the neck, and `veins` gives the shuffle on level 15 something with long
reach to re-deal.

Layout drives solution length more than size does — `weave` and `bands`
fragment the board and need far more moves than `blobs` at the same dimensions.
Adding a shape or layout is one `case` in `shapeMask` or `makeGrid` plus a spec
entry, then `npm run levels:build`.

### Special tiles

| Tile | Behaviour |
| --- | --- |
| **Key** | Absorbed like any tile of its colour; opens every lock in its group. |
| **Lock** | Grey and unabsorbable until its key is collected. While locked it does **not** count as an available target-colour tile. |
| **Shuffle** | Absorbs normally, then instantly re-deals the colours of the remaining ordinary tiles. Positions, tile kinds, key/lock pairings, locked tiles and your own region are all preserved. |

## Installing it as an app

The build is an installable PWA: a web manifest, maskable icons, and a Workbox
service worker that precaches every built file (~300 KB), so once loaded the
game plays with no network at all. There is no backend to be offline from.

- **Android / Chrome** — the browser offers "Install app" on its own.
- **iOS / Safari** — no prompt exists; the player must use Share → *Add to
  Home Screen*. Once installed it runs without browser chrome, drawing under
  the status bar, which the safe-area padding in `index.css` accounts for.
- **Updates** are opt-in rather than silent: `registerType: 'prompt'` means a
  new deploy surfaces the toast in `src/components/UpdatePrompt.tsx`, and the
  bundle is only swapped when the player taps **Reload** — never mid-level.

## Deploying to Cloudflare Pages

The game is static, so hosting only needs to serve files over HTTPS — a service
worker will not register without it. Cloudflare Pages is the fit here: free at
this size, deploys straight from the repo, and issues the certificate itself.

Connect the repository in the Cloudflare dashboard (*Workers & Pages* → *Create*
→ *Pages* → *Connect to Git*) with:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | read from `.node-version` (22) |

Two files in this repo matter to the deploy:

- `.node-version` — Vite 8 needs Node 20+, and Pages defaults to an older
  runtime without it.
- `public/_headers` — the cache policy. Hashed bundles under `/assets/*` are
  immutable for a year; `index.html`, `sw.js` and `manifest.webmanifest` are
  `no-cache`, because those three decide which bundle a browser gets. Caching
  them is what leaves an installed copy stuck on an old version after a deploy.

For a custom domain, add it under the project's *Custom domains* tab and create
the record it asks for at your registrar — the domain does not need to move.
Cloudflare provisions the certificate once DNS resolves.

## Architecture

```
src/
  game/            pure, framework-free game logic (no React imports)
    types.ts       ColorId, Tile, TileKind, BoardState, LevelDefinition,
                   GameStatus, MoveResult, GameState
    palette.ts     seven hues, each with a name and a distinct shape mark
    rng.ts         mulberry32; the cursor lives in GameState so play is replayable
    board.ts       level-row parsing, orthogonal neighbours, flood fill, counters
    engine.ts      createGame / applyMove / scoring / win-loss rules / stars
    levels.ts      GENERATED catalogue of 18 levels, each with a reference solution
    solver.ts      dev-only: randomised greedy search + reference-solution replay
    progress.ts    localStorage save/load, level records, unlock rules
    __tests__/     Vitest suites for the engine and the catalogue
  hooks/           useLevelSession (undo history, animation lock), useReducedMotion
  components/      React views — they call the engine and render state, nothing more
  index.css        the whole stylesheet
scripts/           dev-only level generation and validation (not bundled)
```

### Move resolution order

`applyMove` is a pure function: it clones the state, never mutates the input,
and resolves in a fixed order.

1. Validate the colour (in the level's palette, not the current colour, game
   still in progress).
2. Recolour the owned region.
3. Absorb every connected tile of the new colour.
4. Resolve keys and open matching locks.
5. Resolve shuffle tiles and re-deal the remaining ordinary tiles.
6. Score the turn and update the combo multiplier.
7. Target-colour premature-exhaustion loss.
8. Win check.
9. Turn-limit loss.

Steps 3–5 run to a fixpoint, so a key that connects a new region — or a shuffle
that drops a matching colour next to the flow — is absorbed in the same turn.
The invariant that holds after every move: *no reachable tile of the owned
colour is adjacent to the owned region.*

### Design choices worth knowing

- **DOM grid, not canvas.** Boards top out at 121 tiles, so a CSS grid is
  cheaper to write, trivially responsive, and gets accessible markup, focus and
  per-tile CSS animation for free.
- **Tile clicks are delegated to the grid**, not put on 121 buttons. The palette
  is the keyboard and screen-reader path, so the tiles stay out of the tab order
  and out of the accessibility tree, and the board keeps a single `role="img"`
  summary instead of a hundred redundant stops.
- **Shape marks are drawn, not typed.** Unicode glyphs (● ▲ ■ ◆ ★ …) render at
  very different optical weights at one font-size and depend on whichever font
  supplies them. `Glyph.tsx` draws all seven in a shared 24×24 box, sized for
  roughly equal ink area with the usual optical corrections (solid circle and
  square pulled in, spiky triangle and star pushed out).
- **Undo is unlimited and snapshot-based.** Each move pushes the previous
  `GameState`; undo restores board, turns, score, combo, unlocked groups, RNG
  cursor and status in one assignment. Using it clears the *flawless* badge for
  that run but never corrupts saved progress.
- **Deterministic shuffles.** The RNG cursor is part of the game state, so a
  shuffle replays identically after an undo, and the generator and test-suite
  see exactly what a player sees.
- **A shuffle permutes, it never re-rolls.** The colour multiset is preserved,
  which means a shuffle can never be the thing that makes the target colour run
  out. (A defensive check re-seeds one target tile anyway.)
- **The catalogue is generated, then frozen.** `scripts/generate-levels.ts` lays
  out each board from a hand-tuned spec (size, palette, layout family, shape
  mask, special-tile plan), searches for a real solution with the engine itself,
  and only emits a level once one is found — with the turn limit set from that
  solution plus a per-level slack. The solution ships in the data file and is
  replayed by `npm test`, so an unwinnable level cannot reach the app.
- **Colour is never the only signal.** Every hue carries a glyph (on tiles and
  on the buttons), buttons are labelled by name, and the board exposes a
  screen-reader summary of what is left.

## Accessibility

- Mouse, touch and keyboard all work: click or tap tiles, click the palette, or
  play entirely from the keyboard.
- Full keyboard play: <kbd>1</kbd>–<kbd>7</kbd> pick colours, <kbd>Z</kbd> /
  <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo, <kbd>R</kbd> restart (with confirmation),
  <kbd>Esc</kbd> opens pause / closes dialogs.
- Dialogs trap focus and restore it on close.
- `prefers-reduced-motion` is respected, and can be overridden either way in
  Settings.
- Touch targets are at least 44px; the board and controls reflow down to 320px.
- Move results are announced through a polite live region.

## Persistence

Everything lives in `localStorage` under `chromaflow.save.v1`: per-level stars,
best score, best spare turns, the flawless flag, the last level played and the
two settings. Reads are defensive — a corrupt or missing blob degrades to a
fresh profile rather than throwing, and writes are wrapped so private-browsing
modes just don't persist. **Reset progress** on the title screen clears it.

Installed on a phone this is the only copy of a player's progress, and iOS
clears script-writable storage for sites left unopened for about a week. The
app asks for storage persistence on boot (`requestPersistentStorage`), which
Chrome grants to installed PWAs and Safari currently ignores — so treat an
iOS save as durable but not guaranteed.
