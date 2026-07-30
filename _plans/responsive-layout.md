# Plan: Responsive layout for desktop resize and mobile

Implements `_specs/responsive-layout.md`. **Built and verified in a browser** — this document reflects what was actually implemented, including several things the original plan got wrong.

## Context

Every page was built for one window size. `body, html` and all three page containers used `height: 100%`, and `.panel` pinned the dashboard, canvas, and leaderboard to a fixed `524x638` outer box derived from the 518x632 Phaser canvas in `js/game.js`. Narrowing the window pushed a panel off-screen; a phone got a layout wider than the viewport.

The result is three tiers on the game page. The middle tier — stacked but at original dimensions — is the part that isn't obvious: it exists because preserving the desktop look on a narrow-ish window matters more than avoiding a scrollbar, while a phone needs the opposite trade.

| Width | Layout | Dashboard | Board | Scrolls |
|---|---|---|---|---|
| ≥ 1121px | row | 524x638 | native 518x632 | no |
| 561–1120px | column | 524x638 | native 518x632 | yes |
| ≤ 560px | column | content height, 306px | fixed 300x366 | no |

## Critical existing behaviour preserved

1. **All gameplay math stays in the 518x632 space** — the 74px grid, `gameState.playerGridPositions`, the 40 explosion arrays, `gameState.raveGirlLocations`, and the movement bounds in `js/gamescene.js`. The Scale Manager scales presentation only. **Verified**: with the board at 0.58x, the player still spawns at `(37, 37)` and steps to `(123, 37)`.
2. **Neither `pointerup` handler reads coordinates** (`js/startmenu.js`, `js/gamescene.js`) — bare "click anywhere" handlers, which de-risks scaling considerably. **Verified**: a real click on a scaled canvas starts the game.
3. **The `game-over` body-class handoff** (`js/gamescene.js`, `css/game.css`) still works, and stays `visibility` not `display` so the dashboard doesn't shift. **Verified** for the CSS half; the animation handoff itself was never exercised.
4. **`js/session-guard.js` stays the first, non-deferred tag** in `<head>`.
5. Markup order already has `#dashboard` before `#canvas-container`, so the stacked order falls out of source order — no `order` property needed.

## The five things that actually bit

The original plan predicted two of these. The other three only showed up in the browser.

**A. Centred flex containers hide overflow where scrolling can't reach it.** Content taller than a centred flex container overflows off the *top*. On `#game-container` and `#leaderboard-page` — flex **rows** — the vertical axis is the cross axis, so the culprit is `align-items`, not `justify-content`. Fixed with a `safe center` declaration behind a plain `center` fallback. The axes swap when the game page becomes a column, so `justify-content` gets the same treatment there.

**B. Phaser's inline canvas size vs. `box-sizing`.** `FIT` writes an inline width/height onto the canvas; under the global `border-box` reset the 3px border is subtracted *from* it, squashing 518x632 into 512x626. Fixed with `box-sizing: content-box` on the canvas so the border sits outside the drawn area.

**C. `#canvas-container` painted itself black.** `* { background-color: black }` in `css/shared.css` applies to everything. This box previously collapsed onto the canvas so its background was never visible; giving it a definite size turned it into black bars around a letterboxed canvas. Fixed with `background-color: transparent`. *(The plan flagged this hazard for new wrappers and it bit an existing one.)*

**D. `body`'s default 8px margin.** With containers sized in `100dvh`, an 8px margin puts a permanent scrollbar on a page that otherwise fits exactly. Fixed with `margin: 0`.

**E. `margin: 0 auto` cancelled `space-evenly`.** An auto margin on a flex item absorbs the free space *before* `justify-content` distributes it. The dashboard was pinned flush left and the pair sat 85px off-centre (gaps of 3 / 171 / 174 at 1400px). Fixed by removing it — horizontal centring when stacked comes from `align-items` — and replacing it with a **fixed** 3px margin standing in for the canvas border, so the item's outer width is 524px like `.panel` and the gaps divide evenly.

## File changes

### `js/game.js`

```js
scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'canvas-container',
    width: 518,
    height: 632,
    max: { width: 518, height: 632 }
}
```

Replaces the top-level `width`/`height`/`parent` so there's one source of truth. The `max` cap is belt-and-braces: `#canvas-container`'s `max-width` already holds the parent at the bitmap's width, so `FIT` can't exceed 1x regardless. Phaser is pinned to **3.16.2**, the release that introduced the Scale Manager, so the CSS backstop matters.

### `css/shared.css`

- `html { height: 100% }` + `body { min-height: 100%; margin: 0 }` — a definite height for containers to size against, but a body that grows with its content.
- `.panel` → `width: 100%; max-width: var(--panel-outer-width)`. Identical to the old fixed 524px on any window wide enough, fluid below.
- `.button` → fixed `20px`, with a `@media (max-width: 560px)` step to `11px`. `min-width: min(200px, 100%)` keeps it a usable tap target.
- `.form-field` → `font-size: max(16px, 1rem)`. The 16px floor is what stops iOS zooming on focus.

### `css/game.css`

**Base (side by side):**
- `#game-container`: `min-height: 100dvh`, `padding: 20px var(--panel-border)`, hazard-A fix on `align-items`. `justify-content: space-evenly` unchanged.
- `#canvas-container`: `width: calc(100% - var(--panel-border) * 2)`, `max-width: var(--panel-width)`, `aspect-ratio: 518 / 632`, `margin: 0 var(--panel-border)`, `background-color: transparent`. **No border and no padding** — Phaser measures this element's border box, so anything it carries inflates the canvas.
- `canvas`: `box-sizing: content-box`, the border moved here, `image-rendering: pixelated`.
- Type: fixed at original sizes, no `clamp()`.

**Middle tier — `@media (max-width: 1120px)`:**
- `flex-direction: column`, `justify-content: safe center`, `gap: 24px`.
- `#dashboard, #canvas-container { flex: 0 0 auto }` — neither panel flexes, so both keep their original size and the column overflows rather than shrinking.

**Phone tier — `@media (max-width: 560px)`:**
- `#canvas-container { width: min(300px, calc(100% - var(--panel-border) * 2)) }` — the fixed board; height follows from the base `aspect-ratio`.
- `#dashboard { height: auto; max-width: min(306px, 100%); padding-bottom: 8px }` — 306 is 300 plus the canvas border, which is what makes the widths match.
- `gap: 10px`, `padding: 12px var(--panel-border)`, `.rules { margin: 5px 0 }`, type stepped down once.
- The tightened padding and margins are load-bearing: without them the column runs 15px over a 640px-tall screen.

### `css/login.css`

`#nav-card-container` gets `min-height: 100dvh` and the hazard-A treatment. `#nav-card`'s `width: 50%; height: 60%; margin-top: 150px` becomes `width: 100%; max-width: 520px; height: auto` with auto margins — the old rule gave a 195px card holding 156px forms on a 390px phone. `border-radius: 10%` → `16px`, since a percentage radius distorts once the aspect ratio changes.

### `css/leaderboard.css`

`#leaderboard-page` gets the same `min-height` + hazard-A treatment. `#leaderboard li` gets `overflow-wrap: break-word`. Type stepped at 560px. The "only the list scrolls" behaviour is preserved.

### No HTML changes

All three pages already had a correct viewport meta. No new files, no new elements.

## Verification

A static server (`python3 -m http.server`) plus Chrome. Two notes for anyone repeating this:

- **macOS Chrome won't resize its window below ~600px**, so phone widths can't be tested by dragging. Load the page in a fixed-size **iframe** — it gets its own viewport for media queries and `vw` units — or use the DevTools device toolbar.
- **Visiting `login.html` wipes the session** (`js/login.js` calls `localStorage.clear()`), after which `js/session-guard.js` bounces `index.html` back. Seed `token` / `user_id` / `username` *after* any visit to the login page.

Results are recorded in the spec's Acceptance Criteria. Summary: widths match exactly in every stacked layout, no horizontal scrolling at any width from 320px up, the canvas is native above the phone tier and 300x366 below it, type is constant above 560px, and a real click on a scaled canvas starts the game with gameplay coordinates unaffected.

**Two things remain unverified** and need a real device or a full playthrough:

1. **A real game over** — the `gameState.playerloses.once('animationrepeat', …)` handoff was never exercised end to end.
2. **iOS Safari's collapsing address bar** — `dvh` is in place, but DevTools emulation doesn't reproduce it.

**Before merge:** `firebase deploy` must still report **70 files**.
