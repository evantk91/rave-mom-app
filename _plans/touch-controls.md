# Plan: Hold-to-move touch controls

Implements `_specs/touch-controls.md`. **Written before implementation** — unlike the other documents in this folder, this one is a plan of record rather than an account of what shipped. It should be corrected in place once the work is done and the browser has had its say.

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
3. Clamp the pointer into the board rect, so a finger wandering off the edge keeps steering instead of stopping dead.
4. Offset `dx, dy` from player to clamped point. If `|dx| <= 37 && |dy| <= 37` the touch is in the dead zone: clear all four flags **and clear the latched axis**, so the next departure picks fresh. This is what makes "dragged across the player" read as a clean stop-and-reverse rather than a stutter.
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

## Verification

**Clock compatibility — first, because it invalidates the design if wrong.** Confirm a `KeyboardEvent`'s `timeStamp` and `performance.now()` share a time origin, by capturing a real keydown and comparing against a `performance.now()` taken beside it. If they differ, stamp touch from whatever source Phaser uses instead. Get this wrong and the arbitration breaks silently.

**Automated, in the browser.** A game lasts seconds — shorter than one tool round-trip — so arm a self-driving harness in the page *before* starting, then read results afterwards. Assert:

- dead zone: a touch within 37px on both axes leaves velocity at zero
- arrival: a held point outside the zone brings the player to rest on reaching it, without oscillating
- single axis: no sample ever has both velocity components non-zero
- hysteresis: a point held near the 45-degree line does not alternate between frames
- arbitration: key then touch → touch wins; touch then key → key wins; releasing the newer returns control to the older
- region: a touch beginning below the board never moves the player, while tap-to-restart still fires
- edges: a touch held into a wall leaves the player stationary rather than sliding along another axis

**Regression.** Keyboard-only play unchanged: spawn at `(37, 37)`, ~9.6px per 50ms while held, clean stop on release, and the last-pressed-direction cases.

**Manual, on a real phone.** The two things automation cannot judge: whether the hysteresis margin feels stable, and whether the spec's Decision 2 — the player stopping on *arrival*, which turns one touch into "move to here and stop" — actually feels right. That is the only decision here that changes how the game plays, and it is far cheaper to revisit now than after the rest is polished.

**Deploy.** `firebase --version` current, output reads **74 files**, live 200s on the new script, and `/CLAUDE.md`, `/.git/config`, `/_specs/…`, `/_plans/…` all 404.
