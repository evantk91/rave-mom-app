# Plan: Hold-to-move touch controls

Implements `_specs/touch-controls.md`. **Built and verified on a real phone** — this document was written before implementation and has since been corrected in place, so it now reflects what actually shipped, including the one thing the plan got wrong.

The plan held up: the approach, the file list, and all four Phaser findings were right, and the riskiest assumption survived its check. What it missed was a geometric consequence of its own dead zone that made a third of the board's cells unreachable — invisible on paper, obvious within a minute on a device.

## Context

The game is arrow-key only. On a phone it loads, renders, and cannot be played at all — that is the gap this closes.

The reason this is now a small change rather than a rewrite is that `update()` in `js/gamescene.js` no longer hardcodes cursor keys. It builds a list of direction descriptors, filters to the ones held, and picks the one engaged most recently:

```js
const held = directions.filter(direction => direction.key.isDown);
const active = held.reduce((latest, d) => d.key.timeDown >= latest.key.timeDown ? d : latest);
```

`key` is only ever read for `.isDown` and `.timeDown`. It is duck-typed. A touch source exposing those two fields joins the same list, so keyboard and touch share one dispatch instead of running parallel paths — and "most recently engaged wins" then arbitrates between them for free, which is exactly the rule the spec asks for.

Two further properties keep the scope small: movement is already single-axis after the diagonal and last-pressed fixes, and the maze is enforced by the block collider in `js/gamescene.js`, with corridors only ~10px wider than the player. Touch has to choose a direction and nothing else — not keep the player in the maze, not align them to corridors.

**Decided during planning: touch only, not mouse.** Desktop behaviour stays exactly as it is.

## Findings that shape the design

Checked against the Phaser 3.16.2 source rather than assumed. Each of these would have changed the design if it went the other way.

| Finding | Consequence |
| --- | --- |
| `InputManager.transformPointer` routes through `scaleManager.transformX/Y` | `pointer.x/y` are already in the 518x632 space; the spec's coordinate requirement needs no math |
| `mousePointer = pointers[0]`, and `startPointer` loops `for (i = 1; ...)` | mouse and touch are separate Pointer objects, so polling `input.pointer1` gives touch-only for free |
| `inputActivePointers` defaults to 1, bumped to 2 when touch is on | exactly one touch pointer exists, so a second finger is ignored with no code — the spec's out-of-scope multi-touch |
| No `touch-action` anywhere in `css/` | scroll, pull-to-refresh, and double-tap zoom will fight the controls until it is added |

## The part most likely to be got wrong

`timeDown` must be written **only on the transition to down**, never re-stamped while the touch is held. This mirrors `Phaser.Input.Keyboard.Key.onDown`, which sets it inside an `if (!this.isDown)` guard — the same property that makes the keyboard's last-pressed-wins rule work.

Re-stamping every frame would give touch the newest stamp permanently, so it would always outrank a held key and the arbitration criterion would fail silently. A direction changing mid-drag *is* a genuine transition and correctly earns a fresh stamp.

## Approach

### 1. New file `js/touch-input.js`

A `TOUCH` global, mirroring how `js/board-data.js` provides `BOARD`. Keeping it out of `gamescene.js` follows the precedent set when the board data was extracted, and gives the spec's "tunables named in one place" a home.

Exposes:

- `TOUCH.up/down/left/right` — each `{ isDown, timeDown }`, shaped to drop straight into the `directions` list
- `TOUCH.update(pointer, player)` — once per frame
- `TOUCH.reset()` — from `create()`, so a held touch cannot survive a scene restart
- Tunables at the top: dead-zone half-extent (37), hysteresis margin (start ~12px)

**The board rectangle is derived from `BOARD.cells`, not hardcoded** — min/max cell coordinate expanded by the dead-zone half-extent gives the 0..518 play field. Deriving it keeps it from drifting the way a fourth hand-typed coordinate structure would.

### 2. Per-frame resolution

1. Pointer not down → clear all four flags and all latched state, return.
2. On the rising edge, latch whether the touch began inside the board rect. A touch beginning outside it — on the score or game-over text — never moves the player for its whole lifetime.
3. Clamp the pointer into the board rect, so a finger wandering off the edge keeps steering instead of stopping dead, **then push a touch in the outer 37px strip to a point beyond the field** — see "What the plan got wrong" below.
4. Offset `dx, dy` from player to the resulting point. If `|dx| <= 37 && |dy| <= 37` the touch is in the dead zone: clear all four flags **and clear the latched axis**, so the next departure picks fresh. This is what makes "dragged across the player" read as a clean stop-and-reverse rather than a stutter.
5. Otherwise pick the axis with hysteresis: keep the latched axis unless the perpendicular offset exceeds the current one by the margin. With no latched axis, the larger offset wins and an exact tie resolves to horizontal.
6. Set exactly one flag true, the other three false, stamping only on transition.

### 3. `js/gamescene.js`

- Call `TOUCH.update(this.input.pointer1, gameState.player)` near the top of `update()`, **outside** the `player.enable` guard, so releasing during a game-over still clears state.
- Extend `directions` with four touch entries reusing the same `vx/vy/anim`. Everything downstream — the max-by, the `blocked` edge check, `anims.play` — is unchanged and covers touch automatically.
- Call `TOUCH.reset()` in `create()`.
- The restart handler is untouched: it listens on `this.input.on('pointerup')` regardless of position, so tap-to-restart keeps working anywhere on the canvas, as the spec requires.

### 4. `css/game.css`

Add to the `canvas` rule: `touch-action: none`, `user-select: none` (plus `-webkit-` prefix), `-webkit-tap-highlight-color: transparent`.

**Scoped to the canvas, not `body`.** The phone column is tight — the tier comment notes it "lands 14px over a 640px-tall screen" — so page scrolling elsewhere has to keep working.

### 5. `index.html` and docs

- Script tag for `js/touch-input.js` **before** `js/gamescene.js`, alongside `js/board-data.js`.
- `CLAUDE.md`: deploy tripwire **73 → 74**, a load-order entry, and a short subsection on the touch model and where the tunables live.

## File changes

| File | Change |
| --- | --- |
| `js/touch-input.js` | new — `TOUCH` module, tunables, resolution |
| `js/gamescene.js` | call + reset + four `directions` entries (~6 lines) |
| `css/game.css` | canvas touch and selection rules |
| `index.html` | one script tag |
| `CLAUDE.md` | tripwire, load order, touch model |

## What the plan got wrong

**The dead zone made the board's boundary cells unreachable.** Not awkward — impossible.

To keep driving right, a touch has to land beyond `player + DEAD_ZONE`. The board stops at the field edge, so that band is squeezed against the rim as the player approaches it, and then runs out:

| player x | thumb room on a phone |
| --- | --- |
| 400 | 46.9px |
| 440 | 23.7px |
| 460 | 12.2px |
| 470 | 6.4px |
| 478 | 1.7px |
| 481 | no touch can move it at all |

Every automated assertion passed with this in place, because each one tested a property in isolation and none asked "can the player reach the edge?". It took about a minute on a phone to notice.

The fix, `reachOutward` in `js/touch-input.js`, sends a touch landing in the outer `DEAD_ZONE`-wide strip to a point *beyond* the field, so the whole border reads as "go to the edge". The band becomes a constant ~22px on a phone at every distance and on all four sides, and the interior is untouched — dead zone, dominant axis and hysteresis all measure the same before and after. The player drives to the boundary and pins there with the direction still engaged, which is what holding a key into a wall already does.

**The lesson for the next plan:** a dead zone that travels with the player interacts with every hard boundary the player can reach. Nothing in the spec's edge cases covered it, because it isn't an edge case — it is a third of the board.

## Verification

**Clock compatibility — done first, because it invalidates the design if wrong.** Confirmed against a real trusted keydown: `event.timeStamp` 101557.9 vs `performance.now()` 101558.3, delta **0.4ms**, same time origin. `performance.now()` is therefore directly comparable with Phaser's `Key.timeDown`.

**Unit tests on the resolution, 14 assertions, all passing.** `TOUCH.update(pointer, player)` takes plain objects, so this runs deterministically and is immune to a bomb ending the game mid-test — which turned out to matter. Covered: dead zone on the player and at a 36px corner, engagement at 38px, all four dominant axes, an exact diagonal stable across five frames, hysteresis holding through a 4px lead and yielding to a decisive one, a touch beginning below the board staying inert even when dragged back on, and `timeDown` frozen while held but refreshed on re-transition.

**Integration into velocity**, driving `pointer1` as Phaser's touch manager would:

```
touchRight [192,0]   touchUp [0,-192]   everDiagonal false
key then touch:  [0,-192] -> [192,0] -> [0,-192] on release
touch then key:  [192,0] -> [0,-192] -> [192,0] on release
touch below board: [0,0]
```

**Arrival**, on a clear corridor: from x=37 with a touch held at x=333, the player stops at exactly **296** — `333 − 37`, the dead-zone edge — with no overshoot and no oscillation.

**Boundaries**, after the `reachOutward` fix: all four reached exactly, with `getPlayerGridPosition` reporting the boundary cell rather than an ambiguous neighbour.

**On a real phone.** Confirmed the two things automation cannot judge — the hysteresis margin feels stable at 12px, and Decision 2's stop-on-arrival reads correctly rather than as the controls dropping out. This pass is also what surfaced the boundary gap.

### Traps hit while verifying

Worth knowing before writing the next harness against this game:

- **Real `TouchEvent`s cannot be tested in a desktop browser.** Phaser auto-detects touch support; with none it builds no touch manager, `pointersTotal` stays 1, and `pointer1` is never driven. That is the correct production behaviour, but it means integration has to be tested by driving `pointer1` directly, and the genuine finger→pointer path needs a device.
- **Monkey-patching `scene.update` to count frames reads zero even when the loop is running.** Phaser 3.16 caches it as `sys.sceneUpdate` at boot. Measure the loop by its effects instead.
- **A game lasts seconds, shorter than one tool round-trip.** Arm a self-driving harness in the page before starting, then read results. Re-assert `gameEnded = false` and `player.enable = true` throughout, or stop the bomb animations — otherwise a run silently measures a dead player and reports all zeroes.
- **Do not park the test player at (259,259)** or any other `BOARD.blockLocations` entry. It is inside a wall, and the collider quietly invalidates the result.

**Deploy.** `firebase --version` current, output reads **74 files**, live 200s on the new script, and `/CLAUDE.md`, `/.git/config`, `/_specs/…`, `/_plans/…` all 404.
