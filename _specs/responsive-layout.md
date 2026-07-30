# Spec for responsive-layout

branch: claude/feature/responsive-layout

## Summary

Every page in this app was built for one window size. `#game-container`, `#leaderboard-page`, and `#nav-card-container` were fixed-height flex rows, and `.panel` pinned the dashboard, canvas, and leaderboard to a hardcoded `518x632` box (plus a 3px border) via the custom properties in `css/shared.css`. On a narrow window one of the two panels on `index.html` ran off-screen; on a phone the layout was simply wider than the viewport. `#nav-card` was `width: 50%`, so on a 390px phone the login forms were squeezed into 156px — narrower than their own headings.

This feature makes all three pages adapt to the window they are given.

The game page has **three** layouts, chosen on viewport width:

| Width | Layout | Dashboard | Board |
|---|---|---|---|
| ≥ 1121px | side by side | 524x638 | native 518x632 |
| 561–1120px | stacked, dashboard above board | 524x638 | native 518x632 |
| ≤ 560px | stacked, dashboard above board | content height, 306px wide | fixed 300x366 |

Two rules hold across every stacked layout: **the dashboard and the board are exactly the same width**, and **the whole page fits on screen without scrolling at phone sizes**. The middle tier deliberately does not fit the screen — it keeps both panels at their original dimensions and lets the page scroll, because preserving the desktop look matters more there than avoiding a scrollbar.

The login and leaderboard pages get the same narrow-viewport treatment so the whole app is usable at phone sizes, not just the game.

The hard constraint underneath all of this is the canvas. `js/game.js` creates a fixed 518x632 Phaser canvas, and the panel sizing in `css/shared.css` was written to avoid ever scaling it, because scaling blurs pixel art. A phone viewport is 320–430 CSS px wide, so the canvas cannot be native there. The resolution is Phaser's Scale Manager, capped so it only ever scales *down*.

## Decisions

Settled during design and implementation. Recorded so they are not re-litigated.

1. **Canvas scaling goes through Phaser's Scale Manager** — `Phaser.Scale.FIT` with `autoCenter`, not CSS scaling of the canvas element. Phaser then owns the canvas's display size and keeps pointer coordinates in the 518x632 game space, which the `pointerup` handlers in `js/startmenu.js` and `js/gamescene.js` rely on. Capped at native size so it never scales up.
2. **Phone support is display-only, not playable.** Movement is keyboard-only (`gameState.cursors`), so a phone user can see and start the game but not move. Accepted. Touch controls are a separate, later spec — **do not add them as part of this work**.
3. **The side-by-side breakpoint is the natural threshold** — the width at which two 524px panels stop fitting beside each other, ~1120px.
4. **Layout keys on width only, and nothing is ever hidden.** There is no second layout triggered by height.
5. **The middle tier keeps original dimensions and scrolls.** Between 561px and the side-by-side breakpoint, both panels stay 524x638 and the column runs ~1334px tall. Scrolling is the accepted cost of preserving the desktop appearance.
6. **The phone tier uses a fixed 300x366 board**, not a fluid one. Fluid sizing fails here because the two goals fight: a wider board is a taller board, and a *narrower* column makes the dashboard taller as the instruction text rewraps — so the column grows at both ends and short screens scroll. Pinning the board makes the column a known height that fits every common phone. The cost is margins either side on a large phone.
7. **The dashboard and board are exactly the same width in every stacked layout.** This is why the board is width-driven rather than fitted to leftover height: a height-fitted board gets letterboxed horizontally and ends up narrower than the dashboard.
8. **Type does not scale with the viewport.** It holds its original size at every width above the phone breakpoint and steps down once, at 560px. Fixed values work below the breakpoint because the panel there is pinned at 306px on every phone, so the space the text must fit never changes.
9. **The login page's visual identity may change** where it fights a small viewport — `#nav-card`'s percentage sizing and `border-radius: 10%` in particular.
10. **Form inputs never go below 16px.** Under 16px, iOS Safari auto-zooms on focus and rescales the page mid-login.

## Functional Requirements

### Game page (`index.html` / `css/game.css` / `js/game.js`)

- Above the side-by-side breakpoint, keep the original row layout with the dashboard left and the board right, rendering the canvas at native 518x632.
- The two panels must be centred as a pair and evenly spaced — equal gaps left, between, and right — at every width above the breakpoint.
- Below the breakpoint, reflow to a single column with the dashboard first and the board second, matching the source order in `index.html`.
- In the middle tier both panels keep their original dimensions and the page scrolls vertically; nothing is clipped or unreachable.
- In the phone tier the board is a fixed size and the dashboard sizes to its content, so the column fits the viewport without scrolling.
- **In both stacked tiers the dashboard and the board must be exactly the same width**, with their left and right edges aligned to the pixel.
- Add a Phaser `scale` configuration using `FIT` with `autoCenter`, capped so the canvas never renders larger than native.
- The scaled canvas must keep its 518:632 aspect ratio and must not be cropped.
- Scaling must not change game logic. The 7x7 / 74px grid, `gameState.playerGridPositions`, the hardcoded explosion arrays, `gameState.raveGirlLocations`, and the movement bounds in `js/gamescene.js` all assume the 518x632 coordinate space and must keep operating in it.
- Click-to-start (`js/startmenu.js`) and click-to-play-again (`js/gamescene.js`) must register correctly on a scaled canvas.
- The game-over button reveal must keep working in every layout: `js/gamescene.js` toggles `game-over` on `<body>` and `css/game.css` flips `visibility`. `visibility` rather than `display` must be preserved so the dashboard does not shift when the buttons appear.

### Login page (`login.html` / `css/login.css`)

- `#nav-card` must fit the viewport at phone widths with the forms fully usable, and scroll rather than clip on a short window.
- Both forms, including the submit inputs and `#sign-up-message`, must be visible and usable on a phone.
- Focusing a text or password input must not trigger an iOS zoom.

### Leaderboard page (`leaderboard.html` / `css/leaderboard.css`)

- `#leaderboard-container` must fit narrow viewports.
- Preserve the existing behaviour where only `#leaderboard` scrolls, keeping the title and "Return to Game" button in place.
- Score entries must not overflow horizontally — `Press Start 2P` is wide and usernames are arbitrary.

### Cross-cutting

- All three pages already ship `<meta name="viewport" content="width=device-width, initial-scale=1.0">`; nothing in CSS may defeat it.
- No page may scroll horizontally at any width down to 320px.
- Layout must respond to a live window resize and to a device orientation change.
- The background image must still cover the full viewport when the content is shorter than the window.
- The work stays within CSS plus the Phaser scale configuration. There is no build step or preprocessor, so this is plain CSS in the existing `css/` files. Any new file ships publicly unless `firebase.json`'s ignore list excludes it — prefer editing existing stylesheets over adding new ones.

## Possible Edge Cases

- **`height: 100%` is load-bearing in two directions.** It makes the background cover the viewport, but it also caps the page containers at viewport height and clips overflow. Content taller than the window must scroll, *and* the background must still cover when content is shorter.
- **Centred flex containers hide overflow where scrolling can't reach it.** When content is taller than a centred flex container the overflow goes off the *top*. On `#game-container` and `#leaderboard-page` — both flex rows — the culprit is `align-items`, not `justify-content`. The axes swap when the game page becomes a column.
- **Auto margins cancel `justify-content`.** An auto margin on a flex item absorbs the free space before `justify-content` distributes it, which silently breaks even spacing and pins the first panel to one edge.
- **Phaser measures the parent's border box** to size the canvas, so that element's own border or padding is counted and inflates the result.
- **The canvas border interacts with `box-sizing`.** Phaser writes an inline width/height onto the canvas; under a global `border-box` reset the border is subtracted from that size and breaks the aspect ratio.
- **`* { background-color: black }` in `css/shared.css`** paints every element opaque black. Any element given a definite size will cover the page's background image — including a container that previously collapsed onto its contents.
- **The default `body` margin fights `100dvh` sizing** and produces a permanent scrollbar on a page that otherwise fits.
- **`100vh` reports iOS Safari's *expanded* height**, so a page sized with it sits partly under browser chrome when the address bar is showing. `dvh` is the fix, and DevTools emulation does not reproduce the problem.
- **Non-integer downscale and `image-rendering: pixelated`.** Nearest-neighbour can drop pixel rows and look worse than the browser's default smoothing; this needs eyeballing rather than reasoning.
- **The dashboard's height feeds back into the layout.** A narrower column rewraps the instruction text into more lines, making the dashboard *taller* — so shrinking the column to gain vertical room can lose it instead.
- **`js/login.js` calls `localStorage.clear()` on load**, so any test that visits the login page destroys the session and `js/session-guard.js` bounces subsequent visits to `index.html`.

## Acceptance Criteria

All of the following were measured in a browser.

**Game page — no horizontal scrolling at any width, and dashboard/board widths identical in every stacked layout:**

| Viewport | Layout | Dashboard / board | Vertical scroll |
|---|---|---|---|
| 1800x900 | side by side | 524 / 524 | no |
| 1400x900 | side by side | 524 / 524 | no |
| 1121x900 | side by side | 524 / 524 | no |
| 1119x900 | stacked | 524 / 524 | yes |
| 900x700 | stacked | 524 / 524 | yes |
| 561x900 | stacked | 524 / 524 | yes |
| 560x900 | stacked (phone tier) | 306 / 306 | no |
| 430x932 | stacked (phone tier) | 306 / 306 | no |
| 414x896 | stacked (phone tier) | 306 / 306 | no |
| 390x844 | stacked (phone tier) | 306 / 306 | no |
| 390x700 | stacked (phone tier) | 306 / 306 | no |
| 360x640 | stacked (phone tier) | 306 / 306 | no |
| 320x640 | stacked (phone tier) | 306 / 306 | no |

- Above the phone breakpoint the canvas renders at exactly `518x632` with no upscaling; in the phone tier it renders at `300x366`.
- The two panels are centred as a pair with equal outer gaps — at 1400px, gaps of 117 / 114 / 117 with the pair's centre on the viewport's centre; at 1800px, 250 / 247 / 250.
- Type is constant from 561px to 1800px — welcome 32px, instructions 16px, buttons 20px — and steps once at 560px to 12.5 / 9.5 / 11px.
- A real click on a canvas scaled to 0.58x starts the game, and the player spawns at `(37, 37)` and moves to `(123, 37)` on arrow-right — logical 518x632 coordinates, unaffected by display scale.
- Adding `game-over` to `<body>` flips both buttons from `hidden` to `visible` without changing the dashboard's height.
- The background image covers the full viewport when content is shorter than the window.

**Login and leaderboard:**

- At 390x844 and 320x640, `login.html` shows the heading, both forms, all inputs, and both submit buttons with no clipping, no horizontal scrolling, and no element exceeding the viewport width.
- All form fields compute to 16px at every width, so iOS will not zoom on focus.
- At 390x844, `leaderboard.html` shows the title, list, and "Return to Game" button with no horizontal overflow.
- Type on both pages is constant above 560px and steps once below it.

**Deploy:** `firebase deploy` must still report **70 files** (see `CLAUDE.md`).

## Open Questions

- None blocking. Two things could not be verified without a physical device or a full playthrough, and remain open:
  - **A real game over.** The CSS half of the reveal is confirmed, but the `gameState.playerloses.once('animationrepeat', …)` handoff in `js/gamescene.js` was never exercised end-to-end.
  - **iOS Safari's collapsing address bar.** `dvh` is the documented fix and is in place, but DevTools emulation does not reproduce the behaviour, so the no-scrolling guarantee on a real iPhone is unverified.
- One judgment call is worth a look on a real screen: `image-rendering: pixelated` at the phone tier's 0.579 scale, versus the browser's default smoothing.
