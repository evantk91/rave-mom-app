# Plan: Split login/signup forms into a separate `login.html` page

## Context

`index.html` currently combines the login/signup nav card and the game/leaderboard on one page, toggled by JS (`app.js`) after a successful in-page login. Per `_specs/separate-login-signup-page.md`, we're splitting this into two pages: a new `login.html` for signup/login, and a trimmed `index.html` for just the game and leaderboard. Login now performs a real page navigation to `index.html`; landing on `index.html` without a valid session redirects back to `login.html`. This is a UX/architecture cleanup with no backend changes.

Key decisions already locked in (from the spec's answered open questions):
- New page is named `login.html`.
- Missing session on `index.html` → automatic redirect to `login.html`.
- Login/signup forms are a **faithful copy** — no redesign.
- Signup does **not** auto-navigate — stays on `login.html`, shows the existing inline message, requires a separate manual login.
- Logout navigates back to `login.html`.

## Critical existing behavior to preserve

- `app.js` currently declares `leaderboard` (the `<ul>` element) and `scoresURL` as bare top-level `const`s. `gamescene.js` reads both of these directly via shared global scope (no imports/modules) inside its restart-click handler (gamescene.js:412-414) and its two game-over score-POST handlers. **These bindings must keep existing at the top level of whatever script `index.html` loads**, unmodified position/behavior — `gamescene.js` itself is not touched.
- `game.css` defines `#game-container` twice (game.css:65-69 and again at 76-85); the second wins the cascade and sets `display: none` — today that's revealed by `app.js`'s in-page JS toggle after login. Once the login form leaves `index.html`, nothing will ever run that toggle again, so this CSS must change or the game will never be visible.
- `index.html`'s Phaser/game scripts (Phaser CDN, `startmenu.js`, `gamescene.js`, `game.js`) are plain body `<script>` tags (no `defer`), so they execute synchronously during parsing — **before** any deferred `<head>` script runs. A session-guard script must therefore be a plain, non-deferred, first-in-`<head>` script to actually block those requests/execution in the invalid-session case.
- `localStorage.clear()` currently runs unconditionally on page load (app.js:5). This must only happen on `login.html`'s script — if it also ran on `index.html`, it would immediately erase the token that a successful login just set before `index.html` could even read it.

## File changes

**New `login.html`** — faithful copy of `index.html`'s `<head>` (same `game.css` link, favicon, title) plus the entire `<nav id="nav-card-container">` block (current index.html:12-35) unchanged. No Phaser scripts, no `#game-container` section. Loads a new `login.js`, deferred.

**New `login.js`** (replaces the auth half of `app.js`) — ports unchanged: `usersURL`, signup handler + `displaySignUpMessage` (current app.js:1-36), `loginURL`, `parseJSON`, `storeToken` (app.js:45,72-79). Change only the login handler's final step: replace `displayGame(user)` (app.js:81-87, which toggled `#game-container`/`#nav-card-container` visibility in place) with a new `redirectToGame` that keeps the same `localStorage.getItem("token") !== "undefined"` guard but does `window.location.href = "index.html"` instead of any DOM toggling. Do **not** port anything from app.js:89 onward (logout/leaderboard code) — `login.html` has none of those DOM elements, and a `null.addEventListener` there would throw and abort the whole script, breaking signup/login too.

**New `session-guard.js`** — plain script (no `defer`/`async`), placed as the literal first tag in `index.html`'s `<head>`, before `game.css` and before `dashboard.js`. Wrapped in a block/IIFE so its locals don't leak into the shared global scope. Logic: read `token` and `user_id` from `localStorage`; if either is missing or equals the string `"undefined"`, `window.location.replace("login.html")` (using `replace`, not `href`, so an invalid load never enters browser history). Because this runs before parsing continues, it blocks Phaser/game.css/etc. from ever loading in the invalid case — zero flash, zero wasted work.

**New `dashboard.js`** (replaces the non-auth remainder of `app.js`, deferred, same `<head>` slot `app.js` occupied today) —
- Preserve verbatim, top-level: `const leaderboard = document.querySelector("#leaderboard")` and `const scoresURL = "https://rave-mom-api.onrender.com/api/v1/scores"` (must stay at these exact names/scope for `gamescene.js` to keep working).
- New: read `#welcome-message` and set its text from `localStorage.getItem("username")` (replaces the old in-memory-`user`-object approach, since that object can't survive a page navigation — `username` is already written to localStorage during login, before this feature, so it's already available).
- Logout handler: simplify to `localStorage.clear(); window.location.href = "login.html";` — drop the old in-place visibility-toggle/leaderboard-reset logic (app.js:98-104), since the whole page is navigating away.
- Port unchanged: leaderboard button/close handlers, `displayScores`, `topTenScores`, `appendScore`, `clearLeaderboard` (app.js:106-145).
- Drop `navCardContainer`/`gameContainer` element references — no longer needed once CSS defaults to visible.

**Delete `app.js`** — fully superseded.

**`game.css`** — one-line fix: change `display: none;` at line 77 to `display: flex;`, so `#game-container` is visible by default once `session-guard.js` has already confirmed a valid session gates the whole page. No other CSS changes; the stylesheet stays shared/unchanged across both pages (nav-card/form styles are simply unused-but-harmless on `index.html`, and vice versa).

**`firebase.json`** — no change needed; no rewrites exist, so `login.html` is served automatically at `/login.html`.

**`CLAUDE.md`** — update to match the new architecture:
- Script load order section: describe `session-guard.js` → `game.css` → `dashboard.js` (deferred) → body scripts (Phaser/startmenu/gamescene/game.js, unchanged order) for `index.html`; and `login.js` (deferred) for `login.html`. Keep the defer-vs-body-script ordering note since it's genuinely load-bearing and non-obvious.
- Update the "backend URL changes require editing `app.js` and `gamescene.js`" line to reference `login.js`, `dashboard.js`, and `gamescene.js` instead.
- Update the "Auth state ... cleared on page load and on logout" line to be page-specific: `login.js` clears all of `localStorage` on every load; `index.html`'s scripts only ever read it (via `session-guard.js` and `dashboard.js`), and clear + navigate on logout.

## What must NOT change

- `gamescene.js` — zero edits. Its `localStorage` reads and its restart-handler's `leaderboard`/`scoresURL` global lookups keep working unmodified because `dashboard.js` preserves those exact top-level bindings.
- `game.js` — zero edits. Still unconditionally constructs `new Phaser.Game(config)` at parse time; visibility is now purely CSS-driven.
- `startmenu.js` — not touched.
- Backend URLs (`usersURL`, `loginURL`, `scoresURL`) — copied verbatim into their new homes.

## Verification (manual, static server, no build step)

Serve the repo root (e.g. `python3 -m http.server 8000`) and walk through:
1. Clear `localStorage`, visit `/` (→ `index.html`) → confirm immediate redirect to `/login.html` with no game flash.
2. Sign up with a fresh username → inline "Ya, Signed Up!" message, stays on `login.html`. Sign up again with same username → "User Already Exists".
3. Log in → confirm navigation to `index.html`, game/leaderboard visible immediately, `#welcome-message` shows the right username, and `token`/`user_id`/`username`/`password` are populated in `localStorage`.
4. With a valid session, load `/index.html` directly (bookmark simulation) → loads straight into the game, no redirect.
5. Delete `token` from `localStorage` while on `index.html`, reload → redirected to `login.html`.
6. Click "Leaderboard" → confirms GET to `scoresURL` with the auth header, renders top-10; "Close" hides it.
7. Play to game-over → confirm POST to `scoresURL` with correct `user_id`/score/auth header (unchanged `gamescene.js` behavior).
8. Click to restart after game-over → leaderboard re-fetches/re-renders without console errors (highest-risk regression point — the `leaderboard`/`scoresURL` global-scope handoff between `dashboard.js` and `gamescene.js`).
9. Click "Log Out" from `index.html` → `localStorage` cleared, back on `login.html`.
10. Watch the console throughout for `SyntaxError` (global redeclaration) or `TypeError: Cannot read properties of null` (a sign some code ended up on the wrong page).
