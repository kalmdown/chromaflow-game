# Chromaflow

A turn-limited colour flood puzzle for the browser. You own one tile on the board's rim;
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
| `npm run levels:analyze` | Dev-only: difficulty profile of every level — forced moves, grind moves, options per move |
| `npm run levels:shapes` | Dev-only: build each shape at 8×8–12×12 and report how the results play |
| `npm run levels:origins` | Dev-only: hold each board fixed and move only the origin — rim, centre, random — to see what the start does to a level |
| `python3 scripts/generate-icons.py` | Dev-only: regenerate the PWA icons and iOS launch images in `public/`, and print the `<link>` block for `index.html` |

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
counted, and the generator rejects any mask that would disconnect the board.
The origin — the tile the flow grows from — is drawn from the shape's *rim*: the
playable tiles furthest from everything else by walking distance, skipping any
with a single way out. Each level records it as `origin: [x, y]` (top-left when
omitted).

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
| `weave` | interleaved diagonal lattice, most fragmented | 18 |
| `quadrants` | each quadrant leans on its own overlapping run of three colours, so regions demand different picks | 9, 14 |
| `gradient` | one wide band per colour along the diagonal — huge absorptions near the origin, then a long tail | 10 |
| `veins` | long snaking single-colour threads traced by random walks, so one pick can reach right across the board | 15 |

#### Shapes have a minimum viable size

`npm run levels:shapes` builds every shape at 8×8 through 12×12 and profiles the
result. The constraint turns out **not** to be how much of the board survives —
it is **how wide the narrowest passage is**.

Shapes that punch holes into a solid field (`pillars`, `teeth`, `frame`, `cross`)
keep wide passages and play well from 8×8: 0–17% grind moves, a median of three
colours worth considering per move. Shapes that carve a *thin structure*
(`atoll`'s ring, `hourglass`'s neck) leave corridors only a couple of tiles wide
on a small grid, and the flow stops having choices — `hourglass` at 8×8 profiles
at four forced moves with a median of **one** live option, and `atoll` at 8×8
spends 40% of its moves absorbing two tiles or fewer. Both need 11×11 before what
survives is thick enough to branch.

Density is a misleading proxy: `frame` at 75% density plays fine while `cross` at
63% plays worse, because the frame's ring stays three tiles thick. So levels 8
and 10 are 11×11 — but that is not a difficulty spike, because those masks are
so subtractive that they yield only 66 and 71 playable tiles, *fewer than the
9×9 boards on levels 5 and 6*.

#### Pairing

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
  The worker is re-checked on `visibilitychange` and hourly, because an
  installed app is suspended and resumed for days without a navigation, and a
  navigation is otherwise the only thing that would notice a new build.
- **Launch images.** iOS ignores the manifest's `background_color` and flashes
  blank white on launch unless an `apple-touch-startup-image` matches the
  device exactly, so ten portrait sizes ship. They are deliberately kept out
  of the Workbox precache (`globIgnores`): Safari reads them at launch and the
  running app never requests them, so precaching would roughly double the
  offline payload.
- **The screen stays awake** while a board is live (`src/hooks/useWakeLock.ts`).
  A turn-based puzzle invites sitting on one position for a minute, which the
  OS reads as idle. The lock is dropped on win, loss or leaving the board, and
  reacquired on return — browsers release it whenever the page is hidden.

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

The `*.pages.dev` URL this produces is HTTPS, so the game is fully installable
from it — worth testing there before touching DNS. A custom domain is optional.

### Custom domains

Add the domain under the Pages project's *Custom domains* tab; Cloudflare
provisions the certificate once DNS resolves. What that takes depends on which
hostname you use:

- **A subdomain** (`play.example.com`) — add the CNAME Cloudflare shows you at
  whatever host already runs the domain's DNS. Nothing moves, and mail for the
  domain is untouched. Pages accepts a CNAME from external DNS; a Cloudflare
  *Worker* would not, which is why this project deploys to Pages.
- **The apex** (`example.com`) — DNS has to move to Cloudflare, because DNS
  forbids a CNAME at the zone root. That is a nameserver change at the
  registrar; the registration itself stays put. Check that MX and SPF/DKIM
  records import correctly *before* switching, or mail for that domain breaks.

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
- **Solvable is the floor, not the bar.** A board can be perfectly winnable and
  still open with three forced clicks and a run of two-tile nibbles. Generation
  therefore also gates on how the reference solution *plays*: the opening move
  must absorb at least three tiles and be a real choice, at most two moves may
  have a single live option, and at most a quarter may absorb two tiles or
  fewer. `levels:analyze`
  reports the same numbers for the shipped catalogue, so a regression shows up
  as a flagged row rather than as a level that merely feels bad.
- **The origin sits on the rim, never in a repair.** Early builds pinned the
  origin to (0,0) and reconnected it whenever a mask bit off that corner —
  first with a one-tile corridor (every move through it forced), then with a
  carved bay. Both bolted something onto the shape that was not the shape. The
  origin study (`levels:origins`) showed that the start's eccentricity is what
  sets a level's length — a centre start shortens solutions by two moves and up
  to eight on the big boards — and that every shape's natural start was already
  a rim tile. So the generator now draws the origin from the rim and nothing is
  carved: the cross starts on an arm, the atoll on the ring.
- **Locks are placed by walking distance and checked for reachability.**
  Manhattan distance from a corner was the old yardstick, which broke the moment
  the origin moved — from the board's centre no tile was ever "far", and lock
  groups were silently dropped on a third of the levels. Placement now uses BFS
  distance from the actual origin, scaled to its reach, and a cluster is undone
  if it leaves its own key — or an earlier group's — unreachable without
  crossing a lock. A five-lock cluster can sever a ring; this is what stops it.
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

**Back up / transfer** on the title screen is the answer to that: it copies the
profile out as text and pastes one back in. Copy/paste rather than a file
download, because an installed iOS PWA handles `<a download>` and blob URLs
badly; the share sheet appears only where the API exists.

Imports **merge** rather than overwrite. Every field of a level record is a
maximum and `flawless` is a disjunction, so `mergeSaves` is order-independent —
importing A into B gives the same profile as importing B into A, and a device
with its own progress cannot lose a level to an import. Settings stay local,
since motion and symbol preferences describe the device, not the profile. That
property is also what any future cross-device sync would be built on; the merge
is pinned by tests in `src/game/__tests__/progress.test.ts`.
