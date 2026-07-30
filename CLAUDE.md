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

A correct deploy reports **70 files**. If that number jumps, something that shouldn't be public probably is; the fastest check is the ignore list above.

## Architecture

### Frontend/backend split
All game logic and UI live here; all persistence (users, auth tokens, scores) lives in the Rails API. The frontend talks to the backend over hardcoded URLs (e.g. `https://rave-mom-api.onrender.com/api/v1/users`, `/login`, `/scores`) — there's no env-based config, so backend URL changes require editing `js/login.js`, `js/leaderboard.js`, and `js/gamescene.js` directly (`js/gamescene.js` re-declares `scoresURL` inline in each of its two bomb handlers).

Auth state is kept client-side in `localStorage` (`token`, `user_id`, `username`, `password`). Which page you're on determines how that state is treated: `js/login.js` clears all of `localStorage` on every load, so a fresh visit to the login page always starts clean; the scripts on `index.html` and `leaderboard.html` only ever *read* it, and clear it only on logout before navigating back to `login.html`. Requests to protected endpoints send `Authorization: bearer <token>`.

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
3. `js/startmenu.js` — defines `StartMenu` Phaser scene (title screen, click-to-start)
4. `js/gamescene.js` — defines `GameScene` Phaser scene (all core gameplay)
5. `js/game.js` — creates `gameState` and the Phaser `Game` instance with `scene: [StartMenu, GameScene]`
6. `js/dashboard.js` — welcome message, logout, and navigation to the leaderboard. Declared in `<head>` but `defer`red, so it runs *after* the plain body scripts above.

Note that steps 2–5 are plain body `<script>` tags: they execute synchronously during parsing, and therefore before any deferred `<head>` script.

`login.html` and `leaderboard.html` have no such subtlety — each loads a single deferred script (`js/login.js` / `js/leaderboard.js`), with `js/session-guard.js` first and blocking on the latter.

Navigation targets in these scripts (`window.location.href = "index.html"`, etc.) are page URLs, not script paths, so they stay unprefixed even though the scripts moved into `js/`.

### Game-over button visibility
The Leaderboard and Log Out buttons are hidden during play and revealed after a game over. The buttons live in `index.html`'s dashboard markup, but only `GameScene` knows when the game ended, so the handoff goes through a `game-over` class on `<body>`: `js/gamescene.js` adds it, `css/game.css` decides what it means. Neither script touches the other's scope.

Two details are load-bearing:
- The reveal hangs off `gameState.playerloses.once('animationrepeat', ...)`, **not** `animationcomplete`. The `playerloses` animation is created with `repeat: -1`, so it never completes and `animationcomplete` would never fire; `animationrepeat` fires when the first loop ends.
- `css/game.css` uses `visibility: hidden` rather than `display: none`, so the hidden buttons still reserve their space and the dashboard doesn't shift when they appear.

### Game grid & bomb system (`js/gamescene.js`)
This is the most complex part of the codebase and the most likely place for future changes:
- The play field is a 7x7 grid of 74px cells. `gameState.playerGridPositions` maps row/col to pixel coordinates; `getPlayerRow`/`getPlayerCol`/`getPlayerGridPosition` convert a sprite's pixel position back to a grid cell.
- Two bomb sprites (`bomb1`, `bomb2`) each cycle through one of 40 hardcoded explosion patterns (`gameState.explosionPositions.bomb1`...`bomb40`), each a literal list of `[x, y]` danger tiles for that animation.
- When a bomb's animation completes, if the player's current grid cell is in that pattern's danger list, it's game over: score is POSTed to the backend, player sprite is disabled, and a "click to play again" prompt appears. Otherwise a new random bomb pattern is picked and played.
- "Rave girl" sprites (`ravegirl1`-`3`) spawn at random grid positions (`gameState.raveGirlLocations`, 40 positions) with collision checks to avoid overlapping each other or the player's start position. Colliding with the player scores a point, plays a heart animation, and relocates that rave girl.
- Because explosion patterns and spawn locations are hand-authored coordinate arrays rather than derived from the grid programmatically, adding new bomb patterns or resizing the grid requires updating multiple parallel data structures consistently.

### Assets
Sprites are authored in Aseprite (`sprite_sheets/*.aseprite files/`) and exported as PNG spritesheets (`sprite_sheets/png_sheets/`) loaded by `js/gamescene.js`/`js/startmenu.js` via `this.load.spritesheet(...)`.
