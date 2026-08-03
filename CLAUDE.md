# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Rave Mom is a single-player survival game built with Phaser 3 and vanilla JavaScript. The player navigates a 7x7 grid, collecting "rave girls" for points while avoiding bomb/laser explosions. This repo is the **frontend only** — it pairs with a separate Rails backend, `rave-mom-api` (https://github.com/evantk91/rave-mom-api), which handles auth and score persistence.

Live site: https://rave-mom.firebaseapp.com/

## Running the project

There is no build step, bundler, or package manager (no `package.json`). This is plain static HTML/CSS/JS loaded via `<script>` tags across three pages — `login.html` (signup/login), `index.html` (game), and `leaderboard.html` (top-ten scores) — with Phaser 3 pulled from a CDN.

To run locally:
1. Also clone and run the backend, `rave-mom-api` — `bundle install` then `rails s`.
2. Serve this repo's static files with `lite-server` or equivalent (any static file server works, since there's no build process).

There are no lint or test commands configured in this repo.

## Repository layout

```
index.html          game page
login.html          signup/login page
leaderboard.html    top-ten scores page
404.html            Firebase Hosting fallback
css/                one shared stylesheet + one per page
js/                 all page and game scripts
assets/             images and favicons
sprite_sheets/      Aseprite sources + exported PNG spritesheets
_specs/, _plans/    feature specs and implementation plans (not deployed)
```

The three HTML pages stay at the repo root because Firebase Hosting serves the
root as `/` — moving them into a subdirectory would change every public URL.
Only CSS and JS are grouped into folders.

Because there's no bundler, **relative paths resolve against two different
bases** and moving a file means checking which kind you're touching:
- Paths in `css/*.css` (`url(...)`) resolve against the **stylesheet**, so they
  reach assets with `../assets/...`.
- Paths in `js/*.js` passed to the Phaser loader resolve against the **HTML
  document** at the repo root, so they stay `./sprite_sheets/...` and
  `./assets/...` with no `../` — despite the script itself living in `js/`.

## Deployment

Hosted on Firebase Hosting (`firebase.json`, `.firebaserc`, project `rave-mom`). Deploys are `firebase deploy` from the repo root.

The public root is `.` — the whole repo — so **hosting is opt-out, not opt-in**: every new file ships unless `firebase.json`'s `ignore` list excludes it. That list is the only thing standing between a working file and a public URL, and JSON can't hold comments, so it's documented here instead:

| Pattern | Excludes |
| --- | --- |
| `**/.*` | dotfiles *themselves* (`.gitignore`, `.firebaserc`) |
| `**/.*/**` | the *contents* of dot-directories (`.git/`, `.claude/`) |
| `_specs/**`, `_plans/**` | specs and plans |
| `CLAUDE.md`, `README.md` | repo docs — this file included |
| `**/*.aseprite` | Aseprite sources; only the exported PNGs ship |

The first two rows are the subtle part and both are needed. `**/.*` matches a path whose *final* segment starts with a dot, so it excludes `.git` but **not** `.git/config` — on its own it left the entire `.git` directory publicly fetchable, which is how the git history and an unpushed local branch ended up on the live site. `**/.*/**` is what covers files nested inside a dot-directory. Don't drop either one.

A correct deploy reports **73 files**. If that number jumps, something that shouldn't be public probably is; the fastest check is the ignore list above. Update this number whenever a file is deliberately added or removed — it was stale at 70 for a while after `js/clear-stored-password.js` landed, which makes the tripwire useless in both directions.

### Use a current CLI — an old one silently publishes an empty site

**Check `firebase --version` before deploying.** `firebase` is not always on `PATH`; there are old copies inside nvm Node installs (`~/.nvm/versions/node/*/bin/firebase`), and **version 8.2.0 does not glob this `ignore` list correctly — it matches every file and deploys nothing**:

```
i  hosting[rave-mom]: found 0 files in .
✔  Deploy complete!
```

It exits successfully with a green tick. The only signal is `found 0 files`, and the result is a live site that 404s on every URL including `index.html`. If `firebase --version` isn't recent, deploy with `npx firebase-tools@latest deploy --only hosting` instead — it reads the same stored login, so no re-auth is needed.

**Always read the file count in the output**, and check the live site afterwards. `curl -s -o /dev/null -w "%{http_code}" https://rave-mom.web.app/index.html` should be `200`, and `/.git/config`, `/CLAUDE.md`, `/_specs/…` should each be `404`.

## Architecture

### Frontend/backend split
All game logic and UI live here; all persistence (users, auth tokens, scores) lives in the Rails API. The frontend talks to the backend over hardcoded URLs (e.g. `https://rave-mom-api.onrender.com/api/v1/users`, `/login`, `/scores`) — there's no env-based config, so backend URL changes require editing `js/login.js`, `js/leaderboard.js`, and `js/gamescene.js` directly (`js/gamescene.js` re-declares `scoresURL` inline in each of its two bomb handlers).

Auth state is kept client-side in `localStorage` (`token`, `user_id`, `username`). Which page you're on determines how that state is treated: `js/login.js` clears all of `localStorage` on every load, so a fresh visit to the login page always starts clean; the scripts on `index.html` and `leaderboard.html` only ever *read* it, and clear it only on logout before navigating back to `login.html`. Requests to protected endpoints send `Authorization: bearer <token>`.

**The password is never persisted.** It goes into the login request body and nowhere else — no `localStorage`, `sessionStorage`, or cookie. An earlier version stored it under a `password` key that nothing ever read; it was removed because a leaked password is unrevocable and widely reused, where a leaked token is neither. Don't reintroduce the write, and don't "secure" it by encrypting it client-side — any key the page can use, an attacker on that page can also recover.

`js/clear-stored-password.js` exists only to clean up users who logged in before that change and would otherwise keep the stale key indefinitely (it's cleared on logout or on a login-page visit, but a user who stays logged in makes neither trip). It's deferred on `index.html` and `leaderboard.html`, removes exactly that one key, and swallows storage exceptions so private-browsing or disabled-site-data can't break the session. **It is temporary** — once the existing user population has cycled through, delete the file and both script tags.

### Page split & session flow
- `login.html` — signup and login forms only. A successful login stores the session in `localStorage` and then does a real navigation (`window.location.href`) to `index.html`. Signup deliberately does *not* auto-navigate; it shows an inline message and requires a separate manual login.
- `index.html` — the game only. `js/session-guard.js` redirects back to `login.html` if there's no valid session.
- `leaderboard.html` — top-ten scores only, with a "Return to Game" button. Also guarded by `js/session-guard.js`. It deliberately does *not* load `js/login.js`, which would clear the session on load.

Navigating to the leaderboard unloads Phaser and discards an in-progress game, so the Leaderboard button is only offered after a game over — see the button visibility handoff below.

### Stylesheets
All stylesheets live in `css/`: one shared plus one per page, and each page loads exactly two. `css/shared.css` holds the Google Fonts `@import` (which must stay the first rule in the file or CSS ignores it), the `*` reset, `body/html`, button and form-field styling, and the `.panel` sizing shared by the dashboard, canvas, and leaderboard. `css/login.css`, `css/game.css`, and `css/leaderboard.css` hold only their own page's rules.

The `.panel` custom properties in `css/shared.css` are derived from the canvas's *outer* box (the 518x632 bitmap in `js/game.js` plus its border), so the dashboard and leaderboard match the canvas without the canvas itself being scaled — scaling it would blur the pixel art.

### Script load order (in `index.html`)
All scripts live in `js/`. Global scripts, no modules/bundler — load order matters and all state hangs off the global `gameState` object defined in `js/game.js`:
1. `js/session-guard.js` — the literal first tag in `<head>`, deliberately **not** deferred. Being a plain blocking script means it runs before the stylesheet, before the Phaser CDN request, and before any of `<body>` is parsed, so an invalid session redirects to `login.html` without ever loading or flashing the game.
2. Phaser 3 (CDN)

`js/clear-stored-password.js` sits right after the guard but is `defer`red, unlike it: nothing reads the key it deletes, so it has no ordering dependency and there's no reason to put a second blocking request on the critical path. If the guard redirects, the deferred script never runs — which is fine, because `js/login.js` clears all of storage on arrival anyway.
3. `js/board-data.js` — defines the `BOARD` global: every fixed coordinate the maze is made of. Must precede `js/gamescene.js`, which reads it.
4. `js/startmenu.js` — defines `StartMenu` Phaser scene (title screen, click-to-start)
5. `js/gamescene.js` — defines `GameScene` Phaser scene (all core gameplay)
6. `js/game.js` — creates `gameState` and the Phaser `Game` instance with `scene: [StartMenu, GameScene]`
7. `js/dashboard.js` — welcome message, logout, and navigation to the leaderboard. Declared in `<head>` but `defer`red, so it runs *after* the plain body scripts above.
8. `js/input-debug.js` — arrow-key diagnostics. Also `defer`red in `<head>`, and order-independent: it only defines `window.inputDebug` and reads `gameState` lazily, when one of its functions is called.

Note that steps 2–6 are plain body `<script>` tags: they execute synchronously during parsing, and therefore before any deferred `<head>` script.

`login.html` and `leaderboard.html` have no such subtlety — each loads a single deferred script (`js/login.js` / `js/leaderboard.js`), with `js/session-guard.js` first and blocking on the latter.

Navigation targets in these scripts (`window.location.href = "index.html"`, etc.) are page URLs, not script paths, so they stay unprefixed even though the scripts moved into `js/`.

### Game-over button visibility
The Leaderboard and Log Out buttons are hidden during play and revealed after a game over. The buttons live in `index.html`'s dashboard markup, but only `GameScene` knows when the game ended, so the handoff goes through a `game-over` class on `<body>`: `js/gamescene.js` adds it, `css/game.css` decides what it means. Neither script touches the other's scope.

Two details are load-bearing:
- The reveal hangs off `gameState.playerloses.once('animationrepeat', ...)`, **not** `animationcomplete`. The `playerloses` animation is created with `repeat: -1`, so it never completes and `animationcomplete` would never fire; `animationrepeat` fires when the first loop ends.
- `css/game.css` uses `visibility: hidden` rather than `display: none`, so the hidden buttons still reserve their space and the dashboard doesn't shift when they appear.

### Board data (`js/board-data.js`)
Every fixed coordinate lives in the `BOARD` global, separate from `gameState` because none of it changes during play. It is only ever read, never mutated, so one copy is shared across scene restarts.

**The board is a 4x4 maze, not a 7x7 grid** — a natural mistake to make from the row names. There are 16 intersections at x,y in `{37, 185, 333, 481}`, joined by corridors whose midpoints are `{111, 259, 407}`. A cell is legal when at least one coordinate is on an intersection line, giving **40 cells** of the 49 a full grid would have. The missing 9 — both coordinates a midpoint — are exactly `BOARD.blockLocations`.

- `blockLocations` — the 9 wall squares.
- `cells` — every legal cell, in one flat list. Both consumers want it flat: the nearest-cell search scans all 40, and rave girls are drawn from all 40.
- `explosionPositions` — 40 hand-authored blast patterns, `bomb1`...`bomb40`.

There used to be three encodings of those 40 cells — a flat list, the same cells keyed by row, and a third derived by flattening the rows. Nothing ever asked which *row* the player was in; the row map existed only to produce the third list, which was provably identical to the first. **Don't reintroduce a row structure** unless something genuinely needs rows.

The patterns and the cell list are hand-authored rather than generated, so resizing the maze means updating several structures consistently.

### Gameplay (`js/gamescene.js`)
- `getPlayerGridPosition` returns the **nearest** of the 40 cells by squared distance. It has to tolerate being between cells: movement is continuous at 192px/s, so the sprite advances 3.2px a frame and is rarely on a cell exactly. An earlier version classified by coordinate bands and could be 444px wrong.
- Two bomb sprites each play a random pattern. When the animation completes, the player's nearest cell being in that pattern's list is game over — score POSTed, sprite disabled, "click to play again". Otherwise another pattern is picked.
- Rave girls are placed by `drawRaveGirlPosition`, which filters occupied cells out *before* drawing rather than re-rolling. `cellsTouchingPlayer` excludes anything close enough to overlap the player, which is wider than just the player's own cell — bodies intersect within 69px and cells are 74px apart, so mid-corridor both neighbours are too close.
- Relocation happens at **six** sites: the three collect handlers, and the three `animationcomplete` handlers, which fire every ~4s because the rave girl animations use `repeat: 0` and are replayed.

### Assets
Sprites are authored in Aseprite (`sprite_sheets/*.aseprite files/`) and exported as PNG spritesheets (`sprite_sheets/png_sheets/`) loaded by `js/gamescene.js`/`js/startmenu.js` via `this.load.spritesheet(...)`.
