# Plan: Responsive layout for desktop resize and mobile

Implements `_specs/responsive-layout.md`.

## Context

Every page is built for one window size. `body, html` and all three page containers use `height: 100%`, and `.panel` (`css/shared.css:26-30`) pins the dashboard, canvas, and leaderboard to a fixed `524x638` outer box derived from the 518x632 Phaser canvas in `js/game.js:7-8`. Narrow the window and `#game-container`'s flex **row** (`css/game.css:3-13`) pushes a panel off-screen; open it on a phone and the layout is simply wider than the viewport.

Per `_specs/responsive-layout.md`, the game page gets two layouts chosen on **width alone** — side-by-side above the breakpoint, dashboard-above-canvas below it. The two layouts treat height differently, and that difference is the heart of this plan: side-by-side ignores height and **scrolls**, while stacked **fits the canvas to the leftover height** so a phone shows everything at once.

### Decisions locked in (from the spec)

1. Canvas scaling via Phaser's Scale Manager (`FIT` + `autoCenter`), **capped at native size** so it only ever scales down.
2. Phone support is **display-only**. Movement stays keyboard-only. **Do not add touch controls.**
3. Breakpoint is the natural threshold — where two 524px panels stop fitting side by side.
4. Layout breakpoint keys on width only; nothing is ever hidden. Side-by-side ignores height and scrolls.
5. `.panel` stays fixed side by side, becomes fluid once stacked.
6. Login page visual identity may change where it fights a small viewport.
7. **Stacked layout fits the screen** — dashboard takes what it needs, canvas takes the rest and scales down. No scrolling on a phone.
8. **The canvas has a floor.** Below a playable size it stops shrinking and the page scrolls instead.

## Critical existing behavior to preserve

1. **Neither `pointerup` handler reads pointer coordinates.** `js/startmenu.js:23` and `js/gamescene.js:411` are bare "click anywhere" handlers. This substantially de-risks scaling — even if Phaser's input transform were off, click-to-start and click-to-play-again still work. Verify anyway, but it is not the hazard it would be in a game with positional input.
2. **All gameplay math is in the 518x632 space** — the 74px grid, `gameState.playerGridPositions`, the 40 hardcoded explosion arrays, `gameState.raveGirlLocations`, and the movement bounds at `js/gamescene.js:608-617`. The Scale Manager scales the *presentation* only; none of these constants change. **Do not touch them.**
3. **The `game-over` body-class handoff** (`js/gamescene.js:596-602`, `css/game.css:56-64`) must keep working in both layouts, and must stay `visibility` not `display` so the dashboard doesn't shift.
4. **`* { background-color: black }`** (`css/shared.css:16-19`) paints every element opaque black. Any new wrapper would cover the background image — so add no new elements; restyle existing ones.
5. **The `@import` at `css/shared.css:1` must stay the first rule** or the font silently stops loading.
6. **`js/session-guard.js` stays the first, non-deferred tag** in `<head>` on `index.html` and `leaderboard.html`.
7. Markup order already has `#dashboard` before `#canvas-container` (`index.html:20-39`), so the stacked order falls out of source order — **no `order` property needed**.

## The three real hazards

**A. Flex centering clips overflow.** All three containers center with `justify-content` / `align-items: center`. When content is taller than a centered flex container, the overflow goes off the **top** and is unreachable — scrolling cannot get to it. This is exactly the short-window case in the side-by-side layout, and it will silently defeat the scroll requirement. Fix: `justify-content: flex-start` plus vertical padding wherever content can overflow, rather than relying on `center`.

**B. `border-box` + Phaser's inline canvas size distorts the art.** `FIT` writes `style.width`/`style.height` onto the canvas in px. With the global `box-sizing: border-box` and `canvas { border: 3px }` (`css/game.css:46-50`), that 6px is subtracted *from* the display box — the art renders into 512x626 and the aspect ratio breaks. Fix: move the border off the canvas onto `#canvas-container` so Phaser's inline sizing is unambiguous. Visually identical.

**C. `FIT` fits height too — wanted stacked, wrong side by side.** `FIT` scales to `min(parentW/518, parentH/632)`. That is precisely Decision 7's behavior in the stacked layout, and precisely wrong in side-by-side, where a short window must leave the canvas at native size and scroll. **The same Phaser config produces both**, so the difference has to come from the parent box: `#canvas-container` is height-constrained only in the stacked layout. Get this backwards and the desktop canvas shrinks on short windows (violating Decision 4) or the phone canvas overflows (violating Decision 7).

## File changes

### `js/game.js` — add the scale config

Add a `scale` block to `config`, replacing the bare `width`/`height`:

```js
scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'canvas-container',
    width: 518,
    height: 632,
    max: { width: 518, height: 632 }   // never upscale — Decision 1
}
```

`max` keeps a large desktop window from blowing the canvas up and blurring the pixel art. `CENTER_BOTH` rather than horizontal-only, since the stacked layout can now leave vertical slack. Keep `parent` here and drop the top-level `parent`/`width`/`height` so there is one source of truth.

One config serves both layouts — all the layout-specific behavior comes from the size of `#canvas-container` (hazard C).

Phaser is pinned to **3.16.2** (`index.html:15`), the release that *introduced* the Scale Manager. If `max` misbehaves, the fallback is to cap size in CSS via `#canvas-container`'s `max-width` and leave Phaser on `Phaser.Scale.NONE` — but note that fallback gives up Decision 7, since only `FIT` does the fit-to-height work.

### `css/game.css` — the layout work

**Default (side-by-side), unchanged behavior:**
- `#game-container`: `height: 100%` → `min-height: 100dvh`, so tall content overflows into a scrollbar instead of clipping. Keep the background rules. Replace the centering per hazard A with `flex-start` + vertical padding.
- `#canvas-container` (currently has no rules at all): `width: 100%`, `max-width: var(--panel-outer-width)`, `aspect-ratio: 518 / 632`, `margin: 0 auto`, and the border moved off the canvas per hazard B. The `aspect-ratio` derives a definite height from the width — **not** from the viewport — which is what keeps the canvas native on a short wide window. Without a definite width the parent sizes to the canvas while the canvas sizes to the parent, and the measurement is circular.
- `canvas`: drop the `border` (now on the parent); add `image-rendering: pixelated`.

**Stacked layout — one `@media (max-width: …)` block**, threshold ≈ **1120px** (two 524px panels plus the gap `space-evenly` produces); confirm against the real layout:
- `#game-container`: `flex-direction: column`, and `height: 100dvh` — a hard height, not `min-height`, so there is a fixed budget for the children to divide. This is the one place a viewport-height constraint is correct.
- `#dashboard`: `flex: 0 0 auto` — takes exactly the height its content needs. Release the fixed `.panel` size (Decision 5): `width: 100%`, `max-width: var(--panel-outer-width)`, `height: auto`.
- `#canvas-container`: `flex: 1 1 auto`, `min-height: 0`, and **drop the `aspect-ratio`** — it now gets the leftover box and `FIT` letterboxes the 518:632 canvas inside it. `min-height: 0` is required or the flex item refuses to shrink below its content size.
- Decision 8's floor: `min-height` of roughly **320px** (≈0.5× scale, 37px grid cells) on `#canvas-container`. Once the floor binds, the column exceeds `100dvh` and the page scrolls — which is the intended fallback. Tune the value by eye; 0.5× is a starting guess, not a measured one.

**Text sizing** — under Decision 7 the dashboard's height is subtracted directly from the board, so this is now sizing, not just legibility:
- `.rules`: `font-size: 12pt` → a `clamp()`.
- `#welcome-message`: same treatment.
- Consider tightening `.rule-container` spacing in the stacked block; every pixel saved goes to the canvas.

### `css/shared.css` — panel and button sizing

- `.panel` keeps its fixed size as the default (desktop unchanged) and is relaxed inside the stacked media query.
- `.button`: `width: 60%` gains a `min-width` so it stays tappable, and `font-size: 20px` becomes a `clamp()` so it doesn't overflow at 320px. Its `margin-top: 10px` also comes out of the canvas budget on a phone.
- `.form-field`: `font-size: 16px` minimum — under 16px, iOS Safari auto-zooms on focus and breaks the login layout mid-interaction.

### `css/login.css`

`#nav-card-container` gets `min-height: 100dvh` + the hazard-A overflow treatment. `#nav-card`'s `margin-top: 150px`, `height: 60%`, `width: 50%` become responsive (auto margins, `height: auto`, a percentage width with a `max-width`). Today on a 390px phone that card is **195px wide** with `form { width: 80% }` inside it — 156px, narrower than the `Press Start 2P` heading — so the forms are currently unusable there. Decision 6 permits adjusting `border-radius: 10%` / `box-shadow`; the percentage radius distorts once the card's aspect ratio changes.

### `css/leaderboard.css`

`#leaderboard-page` gets the same `min-height` + overflow treatment. `#leaderboard-container` releases its fixed panel size in the stacked media query. `#leaderboard li` gets `overflow-wrap: break-word` and a `clamp()`ed font size — `Press Start 2P` is wide and a long username will overflow at 390px. Preserve the "only the list scrolls" behavior where there's room; below that the page scrolls so "Return to Game" stays reachable.

### No HTML changes

All three pages already have a correct `<meta name="viewport">`. Verify nothing in CSS defeats it. No new files, no new elements.

## Verification

Run it locally — `lite-server` (or any static server) from the repo root, with the `rave-mom-api` backend running so login works.

**Desktop, `index.html`:**
1. Wide window: dashboard left, canvas right, canvas exactly 518x632, crisp, no upscaling.
2. Drag narrower past ~1120px: reflows live to dashboard-above-canvas, no reload, nothing clipped.
3. Drag **short** (below ~640px tall) at full width: layout unchanged, canvas **still 518x632**, vertical scrollbar appears, and scrolling reaches both the top of the dashboard and the bottom of the canvas. This is the hazard-A and hazard-C check and the most likely thing to be wrong.
4. Play a full game: click-to-start, arrow-key movement, collect a rave girl, get hit by a laser, confirm the score POST fires, then click-to-play-again.
5. After game over, Log Out and Leaderboard appear in both layouts without shifting the dashboard.

**Mobile** — DevTools emulation first, then a **real iPhone**, which is required here:
6. 390x844 portrait: stacked column, everything visible at once, **no scrolling in either direction**. Measure the rendered canvas — it should be noticeably smaller than 518x632.
7. Same device with Safari's address bar **expanded**: still no scrolling. This is what `dvh` buys and what DevTools cannot reproduce — if it fails here, `100vh` leaked in somewhere.
8. 844x390 landscape: above the width breakpoint, so side-by-side and scrolling. Nothing hidden.
9. Squeeze the height until the canvas floor binds (Decision 8): confirm the canvas stops shrinking and the page starts scrolling, and that the transition doesn't flicker while dragging.
10. 320px width: text doesn't overflow, canvas readable. **Compare `image-rendering: pixelated` against the default here** — at non-integer downscale, nearest-neighbour can drop pixel rows and look worse than smoothing. Pick whichever actually looks better and note the choice.
11. `login.html` at 390x844: both forms usable, tapping a field does not zoom.
12. `leaderboard.html` at 390x844: full top ten, no horizontal overflow, "Return to Game" reachable.

**All pages:** background image still covers the full viewport when content is *shorter* than the window — the `height: 100%` → `min-height` change is the thing most likely to break this.

**Before merge:** `firebase deploy` must still report **70 files**.
