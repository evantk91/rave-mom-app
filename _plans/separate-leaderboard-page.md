# Plan: Separate the leaderboard into its own page

## Context

`#game-container` is a flex **row** (`game.css:76-84`), and `#leaderboard-container` is `display: none` until the Leaderboard button sets it to `block` (`game.css:159-165`, `dashboard.js:19`). So opening the leaderboard doesn't overlay anything — it drops a third 30%-wide column inline beside the dashboard and canvas, squeezing the game. That crowding is the problem this solves.

Per `_specs/separate-leaderboard-page.md`, the leaderboard moves to its own page and the button navigates instead of expanding a panel. Because navigating away unloads Phaser, the button is only offered after a game over — and Log Out follows the same rule, so no buttons show during play. The dashboard, canvas, and leaderboard panels are all squared to one size, and today's single `game.css` splits per page.

This also removes real duplication: leaderboard fetch/render exists in `dashboard.js:34-60` **and** again inside `gamescene.js`'s `create()` (`gamescene.js:601-622`), with `gamescene.js:412-414` reaching across global scope for `dashboard.js`'s `leaderboard` and `scoresURL` bindings. With no leaderboard on the game page, that in-game copy is deleted rather than shared.

### Decisions locked in (from the spec's answered questions)

- Page is `leaderboard.html`; panel **centered**; list **scrolls** inside the panel if it overruns.
- Buttons appear **after the first full knocked-out animation loop**, and reserve their space while hidden.
- Existing Close button becomes **"Return to Game"** — the page's only control (no welcome message, no logout).
- Failed/unauthorized/empty score fetch → **render an empty list**, no error UI, but must not throw.
- Stylesheets: `shared.css` + `login.css` + `game.css` (narrowed) + `leaderboard.css`.
- Plain top-ten list; no player rank. `index.html` keeps its filename.

## Critical existing behavior to preserve

1. **`playerloses` loops forever.** `gamescene.js:296-301` sets `repeat: -1`, so `animationcomplete` never fires on it. Use `gameState.playerloses.once('animationrepeat', …)`, which fires the instant the first cycle ends (~1.3s at 4 frames / frameRate 3). Animation config stays unchanged. **Verify the event name fires under Phaser 3.16.2 in the browser**; if it doesn't, fall back to `this.time.delayedCall(1333, …)`.
2. **The global-scope handoff must be cut in one step.** `gamescene.js:412-414` reads `leaderboard` and `scoresURL` from `dashboard.js`'s top-level scope. Deleting `dashboard.js`'s leaderboard code without simultaneously deleting `gamescene.js`'s restart-refresh throws `ReferenceError` on every restart. Both edits land together.
3. **Each bomb handler declares its own local `scoresURL`** (`gamescene.js:319` and `:364`) for the score POST. Those are independent of the global and **stay**.
4. **`session-guard.js` must stay a plain, non-deferred, first-in-`<head>` script** on both `index.html` and the new `leaderboard.html` — that's what prevents a content flash before redirect.
5. **`login.js:5` calls `localStorage.clear()` on load.** `leaderboard.html` must never load `login.js`, or viewing the leaderboard logs the user out.
6. **`@import` of Press Start 2P (`game.css:1`) must be the first rule in `shared.css`** — CSS ignores `@import` that isn't at the top. The universal `* { background-color: black }` (`game.css:3-6`) also belongs in `shared.css`; a lot of the look depends on it.
7. **Phaser scopes pointer input to the canvas**, so the DOM buttons shouldn't trigger the click-to-play-again handler at `gamescene.js:406`. Confirm during verification.
8. `#canvas-container` is Phaser's render parent (`game.js:9`) and currently has **no CSS rules at all**.

## File changes

### New: `leaderboard.html`
Mirrors `index.html`'s head contract — `session-guard.js` as the literal first tag (plain, not deferred), then `shared.css`, `leaderboard.css`, favicon, and `leaderboard.js` deferred. Body holds the `#leaderboard-container` block moved from `index.html:38-47`, with `#leaderboard-close` becoming `#return-to-game` labelled "Return to Game". No Phaser scripts, no `login.js`.

### New: `leaderboard.js`
Move the render logic out of `dashboard.js:34-60` — `parseJSON`, `displayScores`, `topTenScores`, `appendScore`, `clearLeaderboard` — plus its own `scoresURL` and the auth-header fetch from `dashboard.js:20-27`. Drop `displayScores`'s `leaderboardButton.style.display = "none"` line (no such button here). Return-to-game handler navigates to `index.html`.

**Guard the response shape.** An unauthorized or errored request returns an object, not an array, and `topTenScores` calls `.sort()` on it — that throws. Normalize with an `Array.isArray()` check plus a `.catch()`, both resolving to an empty list. This is what makes the "empty list, never throws" requirement actually hold.

### Modified: `index.html`
Delete the `#leaderboard-container` block (lines 38-47). Swap the stylesheet link for `shared.css` + `game.css`.

### Modified: `dashboard.js`
Keep the welcome message and logout. Point the Leaderboard button at `leaderboard.html` instead of revealing a panel. Delete `leaderboardContainer`, `leaderboardClose`, the top-level `leaderboard` and `scoresURL` consts, and every render helper — the file drops to roughly its first 15 lines plus the two navigation handlers.

### Modified: `gamescene.js`
- Delete the leaderboard refresh inside the restart handler (`gamescene.js:411-421`), keeping `gameState.score = 0` and `this.scene.restart()`.
- Delete the duplicated helpers at `gamescene.js:601-622`.
- Add a local `revealGameOverButtons()` in `create()` that does `document.body.classList.add('game-over')`, and call it from a `gameState.playerloses.once('animationrepeat', …)` registered right after each `anims.play('playerloses', true)` (`:352` and `:397`). A single local helper avoids a third copy-paste across the two symmetric bomb handlers.
- In the restart handler, `document.body.classList.remove('game-over')`.

Toggling a body class — rather than calling into another script — is the "defined hand-off" the spec asks for: no shared globals, no load-order coupling, and it survives `scene.restart()` cleanly.

### Modified: CSS — split `game.css` four ways

| File | Contents |
|---|---|
| `shared.css` | `@import` (first line), `*` reset, `body, html`, `.button`, `.button-container`, `.form-field`, panel sizing |
| `login.css` | `#nav-card-container`, `#nav-card`, `.nav-bar-member`, `form`, `h2`, `.form-title`, `#sign-up-message` |
| `game.css` | `#game-container`, `#dashboard`, `#welcome-message`, `.rule-container`, `.rules`, `canvas`, button visibility |
| `leaderboard.css` | `#leaderboard*` rules, centering, scroll |

**Panel sizing** — declare once in `shared.css` and apply to `#dashboard`, `#canvas-container`, and `#leaderboard-container`:

```css
:root { --panel-w: 518px; --panel-h: 632px; }   /* matches game.js:7-8 */
```

To make the two columns actually line up: drop `padding-top: 50px` from the `canvas` rule (`game.css:149`) and `#dashboard`'s `margin-top: 100px` / `margin-bottom: 50px`, then set `#game-container { align-items: center; }`. Otherwise the canvas's padding pushes it 50px past a 632px-tall box. **Exact pixel reconciliation needs eyeballing in the browser** — borders and `box-sizing: border-box` (`game.css:4`) both affect the final box.

**Button visibility** — `visibility: hidden` rather than `display: none`, which is what reserves their space:

```css
#user-logout, #leaderboard-button { visibility: hidden; }
body.game-over #user-logout,
body.game-over #leaderboard-button { visibility: visible; }
```

**Leaderboard scroll** — make `#leaderboard-container` a flex column and give the `#leaderboard` `<ul>` `flex: 1; overflow-y: auto;` so the title and Return to Game button stay pinned while only the list scrolls. Also drop the dead `#leaderboard-update` rule (`game.css:190-192`) — no such element exists.

### Modified: `login.html`
Stylesheet link becomes `shared.css` + `login.css`. Nothing else changes.

### Modified: docs
- `session-guard.js:1` — comment says "Runs before anything else on index.html"; it now guards two pages.
- `CLAUDE.md` — three-page structure, the stylesheet split, and (importantly) delete the note that `gamescene.js` depends on `dashboard.js`'s `leaderboard`/`scoresURL` globals, since this work removes exactly that. Document the `body.game-over` handoff.
- `README.md` — one line noting the three pages; it currently documents no file structure at all.

### No change
`game.js`, `startmenu.js`, `firebase.json` (no rewrites exist, so `/leaderboard.html` is served directly), and the score POST in both bomb handlers.

## Verification

Backend must be running (`rails s` in `rave-mom-api`); serve this repo statically (`python3 -m http.server 8000`) — no build step.

1. Clear `localStorage`, visit `/` → redirect to `login.html`, no game flash.
2. Log in → game page. **No buttons visible** in the dashboard, only welcome message and rules.
3. Confirm dashboard and canvas are the same width and height and aligned top and bottom.
4. Play; verify no buttons appear mid-game and the canvas is full width with no third column.
5. Die → score POSTs; the knocked-out sprite keeps looping; **both buttons appear after ~1.3s**. Confirm surrounding content doesn't shift when they appear (the reserved-space check).
6. Click Leaderboard → `leaderboard.html`, panel centered, same size as the game, top ten rendered.
7. Return to Game → back to `index.html`, lands on the start menu.
8. Die again, click to play again instead → buttons hide, new game starts, **no `ReferenceError` in console** (highest-risk regression: the `leaderboard`/`scoresURL` global cut).
9. Repeat death/restart 3+ times → buttons toggle correctly each cycle.
10. Click a button right after death → confirm it does *not* also trigger click-to-play-again.
11. Stop the backend, reload `leaderboard.html` → empty list, no unhandled console error. Repeat with a corrupted `token`.
12. Visit `leaderboard.html` with `localStorage` cleared → redirect to login, no content flash.
13. Log out from the game page → back to `login.html`; confirm login page still looks unchanged after the CSS split.
14. Confirm the pixel font loads on all three pages (the `@import`-position check).

## Risks

- **`animationrepeat` not firing under Phaser 3.16.2** — the one unverified assumption. Fallback is `this.time.delayedCall`. Check first; it gates the whole button-reveal design.
- **CSS cascade drift from the split** — rules that only worked because of their position in one file. Steps 3, 13, 14 are the guards.
- **Panel sizing** is the most likely thing to need visual iteration; the numbers above are a starting point, not a final answer.
