# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Rave Mom is a single-player survival game built with Phaser 3 and vanilla JavaScript. The player navigates a 7x7 grid, collecting "rave girls" for points while avoiding bomb/laser explosions. This repo is the **frontend only** — it pairs with a separate Rails backend, `rave-mom-api` (https://github.com/evantk91/rave-mom-api), which handles auth and score persistence.

Live site: https://rave-mom.firebaseapp.com/

## Running the project

There is no build step, bundler, or package manager (no `package.json`). This is plain static HTML/CSS/JS loaded via `<script>` tags in `index.html`, with Phaser 3 pulled from a CDN.

To run locally:
1. Also clone and run the backend, `rave-mom-api` — `bundle install` then `rails s`.
2. Serve this repo's static files with `lite-server` or equivalent (any static file server works, since there's no build process).

There are no lint or test commands configured in this repo.

## Deployment

Hosted on Firebase Hosting (`firebase.json`, `.firebaserc`, project `rave-mom`). The public root is `.` (the whole repo, minus dotfiles), so deploys are `firebase deploy` from the repo root.

## Architecture

### Frontend/backend split
All game logic and UI live here; all persistence (users, auth tokens, scores) lives in the Rails API. The frontend talks to the backend over hardcoded Heroku URLs (e.g. `https://rave-mom-app.herokuapp.com/api/v1/users`, `/login`, `/scores`) — there's no env-based config, so backend URL changes require editing `app.js` and `gamescene.js` directly.

Auth state is kept client-side in `localStorage` (`token`, `user_id`, `username`, `password`), cleared on page load and on logout. Requests to protected endpoints send `Authorization: bearer <token>`.

### Script load order (in `index.html`)
Global scripts, no modules/bundler — load order matters and all state hangs off the global `gameState` object defined in `game.js`:
1. `app.js` — auth (signup/login forms), leaderboard fetch/render, show/hide game vs. login nav card
2. Phaser 3 (CDN)
3. `startmenu.js` — defines `StartMenu` Phaser scene (title screen, click-to-start)
4. `gamescene.js` — defines `GameScene` Phaser scene (all core gameplay)
5. `game.js` — creates `gameState` and the Phaser `Game` instance with `scene: [StartMenu, GameScene]`

### Game grid & bomb system (`gamescene.js`)
This is the most complex part of the codebase and the most likely place for future changes:
- The play field is a 7x7 grid of 74px cells. `gameState.playerGridPositions` maps row/col to pixel coordinates; `getPlayerRow`/`getPlayerCol`/`getPlayerGridPosition` convert a sprite's pixel position back to a grid cell.
- Two bomb sprites (`bomb1`, `bomb2`) each cycle through one of 40 hardcoded explosion patterns (`gameState.explosionPositions.bomb1`...`bomb40`), each a literal list of `[x, y]` danger tiles for that animation.
- When a bomb's animation completes, if the player's current grid cell is in that pattern's danger list, it's game over: score is POSTed to the backend, player sprite is disabled, and a "click to play again" prompt appears. Otherwise a new random bomb pattern is picked and played.
- "Rave girl" sprites (`ravegirl1`-`3`) spawn at random grid positions (`gameState.raveGirlLocations`, 40 positions) with collision checks to avoid overlapping each other or the player's start position. Colliding with the player scores a point, plays a heart animation, and relocates that rave girl.
- Because explosion patterns and spawn locations are hand-authored coordinate arrays rather than derived from the grid programmatically, adding new bomb patterns or resizing the grid requires updating multiple parallel data structures consistently.

### Assets
Sprites are authored in Aseprite (`sprite_sheets/*.aseprite files/`) and exported as PNG spritesheets (`sprite_sheets/png_sheets/`) loaded by `gamescene.js`/`startmenu.js` via `this.load.spritesheet(...)`.
