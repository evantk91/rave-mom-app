# Spec for responsive-layout

branch: claude/feature/responsive-layout

## Summary

Every page in this app is currently built for one window size and one only. `#game-container`, `#leaderboard-page`, and `#nav-card-container` are fixed-height flex rows, and `.panel` pins the dashboard, canvas, and leaderboard to a hardcoded `518x632` box (plus a 3px border) via the custom properties in `css/shared.css`. On a narrow or short window the two panels on `index.html` are pushed side by side until one runs off-screen; on a phone the layout is simply wider than the viewport, so the game and its instructions cannot both be seen and parts of the UI are unreachable.

This feature makes all three pages adapt to the size of the window they are given.

The game page gets two layouts, chosen on viewport **width** alone:

1. **Wide enough for both** — the current side-by-side layout, dashboard left and canvas right, canvas at native 518x632. Unchanged from today.
2. **Too narrow for both** — reflow to a single column with **the dashboard (welcome message + instructions + buttons) on top and the game canvas below it**, so both panels stay visible and reachable.

Viewport height never changes the layout. When a window is too short to show everything at once — a landscape phone, a desktop window dragged short — the content stays exactly as it is and **the page scrolls**. Nothing is hidden, shrunk, or rearranged on account of height.

The login and leaderboard pages get the same narrow-viewport treatment so the whole app is usable at phone sizes, not just the game.

The hard constraint running through all of this is the canvas. `js/game.js` creates a fixed 518x632 Phaser canvas, and `css/shared.css` deliberately derives the panel sizing from that bitmap's outer box **so the canvas is never scaled** — scaling it blurs the pixel art. An iPhone viewport is roughly 375–430 CSS px wide, so the canvas cannot be shown at its native size on a phone. The resolution is Phaser's Scale Manager, capped so it never scales *up* past native size (see Decisions).

## Decisions

These were open questions, now settled. They are recorded here so they are not re-litigated during planning.

1. **Canvas scaling: Phaser's Scale Manager.** Configure `scale` in `js/game.js` with `Phaser.Scale.FIT` and `autoCenter`, rather than scaling the canvas element with CSS. Phaser then owns the canvas's display size and keeps pointer coordinates in the 518x632 game space for free, which is what the `pointerup` handlers in `js/startmenu.js` and `js/gamescene.js` depend on. The scale config must be capped at native size so the canvas is only ever scaled *down* — on a large desktop window it must still render at exactly 518x632, not blown up.
2. **Phone support is display-only, not playable.** Movement is keyboard-only (`gameState.cursors = this.input.keyboard.createCursorKeys()`), so a phone user will be able to see and start the game but not move. That is a known and accepted outcome of this feature. On-screen touch controls (or swipe-to-move) in `js/gamescene.js` are deferred to a separate, later spec. **Do not add touch controls as part of this work.**
3. **The stacked-layout breakpoint is the natural threshold** — the width at which the dashboard and the canvas stop fitting side by side. That is roughly 1100px given two 524px outer boxes plus spacing; the exact value should be derived from the real layout rather than guessed.
4. **The breakpoint keys on width only. Short viewports scroll.** There is no height breakpoint and nothing is ever hidden because the window is short. A window that is wide enough for the side-by-side layout keeps it no matter how short it gets; the content overflows and the user scrolls to reach it. The same goes for the stacked layout on a phone.
5. **`.panel` stays fixed-size side by side, and becomes fluid once stacked.** Above the breakpoint the current desktop appearance is preserved exactly. Below it, the panel sizing gives way to content- and width-driven sizing.
6. **The login page's visual identity may change** where it fights a small viewport — `#nav-card`'s `border-radius: 10%`, `box-shadow`, and `margin-top: 150px` in particular. Revisiting its styling is a follow-up, not part of this work.

## Functional Requirements

### Game page (`index.html` / `css/game.css` / `js/game.js`)

- At or above the width breakpoint, keep today's side-by-side row layout with the dashboard left and the canvas right, and render the canvas at native 518x632.
- Below the width breakpoint, reflow `#game-container` to a single column with the dashboard first and the canvas second, matching the reading order in the markup.
- In both layouts, when the content is taller than the viewport the page must scroll vertically rather than clipping the canvas, the instructions, or the buttons. Every element stays reachable at any window height.
- `#game-container` currently sets `height: 100%`, which caps it at the viewport and is what causes clipping on short windows. It needs to size to its content instead, so that content taller than the viewport produces a scrollbar rather than being cut off — while the background image still covers the full viewport when the content is shorter.
- Viewport height must not trigger any layout change: no hiding, no rearranging, no shrinking of panels because the window is short.
- `.panel` must stop being a fixed pixel size in the stacked layout. The dashboard should size to its content and to the available width rather than forcing 518x632.
- Add a `scale` configuration to `js/game.js` using `Phaser.Scale.FIT` with `autoCenter`, capped so the canvas never renders larger than its native 518x632.
- Canvas sizing must respond to available **width**, not height. On a short-but-wide window the canvas stays at native size and the page scrolls; it must not shrink to fit the viewport height.
- The scaled canvas must keep its 518:632 aspect ratio and must remain visually crisp — the pixel art must not be smoothed when scaled down.
- Scaling the canvas must not change game logic. The 7x7 / 74px grid, `gameState.playerGridPositions`, the hardcoded explosion coordinate arrays, and `gameState.raveGirlLocations` in `js/gamescene.js` all assume the 518x632 coordinate space and must continue to operate in that space regardless of the canvas's displayed size.
- Click-to-start (`js/startmenu.js`) and click-to-play-again (`js/gamescene.js`) must register at the correct spot on a scaled canvas.
- The instruction text (`.rules`, currently a fixed `12pt`) and the welcome message must remain legible and must not overflow their container at phone widths.
- The game-over button reveal must keep working across all layouts: `js/gamescene.js` toggles `game-over` on `<body>` and `css/game.css` flips `visibility`. The `visibility: hidden` approach (rather than `display: none`) must be preserved so the dashboard does not shift when the buttons appear.

### Login page (`login.html` / `css/login.css`)

- `#nav-card` currently uses percentage width/height plus a fixed `margin-top: 150px`, which pushes the card off short viewports. It must fit within the viewport at phone widths without the forms being cut off, and scroll rather than clip when the window is too short for it.
- Both the signup and login forms, including the submit inputs and the `#sign-up-message` output, must be visible and usable on a phone.
- Form fields must be tappable at a comfortable size, and the page must not zoom unexpectedly when a text or password input is focused on iOS.

### Leaderboard page (`leaderboard.html` / `css/leaderboard.css`)

- `#leaderboard-container` must fit narrow viewports the same way the dashboard does.
- The existing behavior where only `#leaderboard` scrolls — keeping `#leaderboard-title` and the "Return to Game" button fixed in place — should be preserved where there is room for it. On a window too short for that to work, the page itself should scroll so the button stays reachable.
- Score entries (`Press Start 2P` is a wide monospace face) must not overflow horizontally on a phone.

### Cross-cutting

- All three pages already ship `<meta name="viewport" content="width=device-width, initial-scale=1.0">`; verify it is correct on each and that nothing in CSS defeats it.
- No page may scroll horizontally at any viewport width down to 320px. Vertical scrolling is expected and fine.
- Buttons (`.button`, currently `width: 60%` with `font-size: 20px`) must stay legible and tappable across the range, and must not overflow at narrow widths.
- Layout must respond to a live window resize on desktop, not just to the width at page load.
- Layout must respond to a device orientation change on mobile.
- The work stays within CSS plus the Phaser scale configuration in `js/game.js`. There is no build step, bundler, or CSS preprocessor in this repo, so the implementation is plain CSS in the existing `css/` files. Any new file added to the repo is publicly deployed unless `firebase.json`'s ignore list excludes it, so prefer editing the existing stylesheets over adding new ones.

## Possible Edge Cases

- **`height: 100%` is load-bearing in two directions.** `body, html` in `css/shared.css` and the three page containers all use `height: 100%` to make the background image cover the viewport. Changing them so content can overflow risks collapsing that background on short-content pages. The background must still fill the viewport when content is shorter than it.
- **Landscape phone.** An 844x390 viewport is wide enough to be above the width breakpoint but far too short for a 638px panel. It gets the side-by-side layout and scrolls. Verify that scrolling actually works there and that the canvas is not clipped by a viewport-height container.
- **`Phaser.Scale.FIT` fits both dimensions.** By default it scales to fit the parent's height as well as its width, which on a short window would shrink the canvas — the opposite of Decision 4. The parent container must not be constrained to the viewport height, or the canvas will silently shrink instead of overflowing.
- **`Phaser.Scale.FIT` scales up as well as down.** Without a cap at native size, a large desktop window would upscale the canvas and blur the pixel art — the exact thing the panel sizing in `css/shared.css` was written to prevent.
- **Non-integer scale factors.** `FIT` produces arbitrary fractional scales. `image-rendering: pixelated` on the canvas is the usual mitigation; verify the art actually holds up at awkward widths rather than assuming it does.
- **Phaser vs. CSS ownership of the canvas.** With a `scale` config in place, Phaser sets the canvas's inline style. Any CSS that also sets canvas width/height will fight it. The existing `canvas` rule in `css/game.css` sets `margin` and `border` — confirm those still behave once the Scale Manager is managing size, and that the border is accounted for in the parent's sizing.
- **iOS viewport height.** Safari's collapsing address bar changes the visible height as the user scrolls, and `100%`/`100vh` heights interact badly with it — content can sit under browser chrome. Since height no longer drives layout, this is now only a background-coverage and scroll-position concern rather than a layout-thrash one.
- **Scrolling during active play.** On a short window the player may be scrolled away from part of the board while bombs are cycling. Worth confirming the game is still playable, and that arrow-key input does not also scroll the page out from under the player.
- **Very small viewports (320px).** The 518px canvas scales to roughly 60% here; verify the game is still readable and that `Press Start 2P` text does not overflow.
- **The `*` selector sets `background-color: black` on every element** in `css/shared.css`. Any new wrapper element added for layout inherits an opaque black background, which will cover the page's background image.
- **Existing markup order.** On `index.html` the dashboard already precedes `#canvas-container` in the DOM, so the requested stacked order falls out of the source order — no reordering hack needed. Confirm this holds rather than reaching for `order`.
- **Panel sizing is shared.** `.panel` in `css/shared.css` is used by the dashboard, the canvas sizing math, and the leaderboard. Changing it affects all three pages at once; changes must be verified on each.

## Acceptance Criteria

- On a desktop window above the width breakpoint, `index.html` still shows the dashboard and the canvas side by side, and the canvas renders at native 518x632 with no visible blurring and no upscaling.
- Narrowing the desktop window past the width breakpoint reflows the game page to a single column with the dashboard above the canvas; both panels remain fully visible and no content is clipped or pushed off-screen.
- The reflow happens live during a window resize, without a page reload.
- Dragging the desktop window shorter than the panel height changes nothing about the layout — the panels stay side by side at full size and the page becomes vertically scrollable, with the canvas and all dashboard content reachable by scrolling.
- On an iPhone-sized viewport (390x844) in portrait, `index.html` shows the welcome message, all three instruction lines, and the game canvas stacked in a single column, all within the viewport's width, with no horizontal scrolling and everything reachable by scrolling vertically.
- Rotating that device to landscape (844x390) keeps the content visible and reachable by scrolling; nothing is hidden or clipped.
- The game canvas, at whatever size it is displayed, keeps its aspect ratio and its pixel-art crispness, and does not shrink in response to viewport height.
- Starting a game from the start menu and playing to a game over works on a resized desktop window, with click-to-start and click-to-play-again landing on the right spot on the scaled canvas.
- After a game over, the Log Out and Leaderboard buttons appear in every layout, and their appearance does not shift the surrounding dashboard content.
- `login.html` at 390x844 shows the heading, both forms, all inputs, and both submit buttons without clipping or horizontal scrolling; tapping a field does not trigger an iOS zoom that breaks the layout. On a short window the page scrolls rather than cutting off the forms.
- `leaderboard.html` at 390x844 shows the title, a full top-ten list, and the "Return to Game" button, with no horizontal overflow and the button reachable at any window height.
- On every page, the background image still covers the full viewport when the content is shorter than the window.
- No page scrolls horizontally at any width from 320px up.
- A deploy still reports **70 files** (see `CLAUDE.md`); if the count changed, a new file is being published that should be in `firebase.json`'s ignore list.

## Open Questions

- None blocking.
