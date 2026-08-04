# Plan: Login pending state

Implements `_specs/login-pending-state.md`. **Written before implementation** —
nothing here has been built or verified yet. Correct it in place once it ships,
the way `_plans/touch-controls.md` was.

## Context

The backend is on Render's free tier and spins down when idle. Waking it takes
long enough to look broken: a login submitted against a cold instance took over
20 seconds during the previous change. For that whole window the page shows
nothing at all, so a request in flight is indistinguishable from a click that
didn't register — and the natural response, clicking again, fires a second
request at an instance already struggling to wake.

This works both ends of it. A prewarm request on page load starts the instance
waking while the player is still typing, so the wait is shorter. An indeterminate
progress indicator replaces the submit button while a request is in flight, so
whatever wait is left is legible. Past ten seconds a message says the server is
still waking, so a long wait reads as expected rather than as a hang.

`_specs/login-form-toggle.md` deliberately left this out of scope once failure
messages existed. Those fixed "nothing happened when it failed"; this fixes
"nothing happens while it works".

## Findings that shape the design

| Finding | Consequence |
| --- | --- |
| `visibility: hidden` keeps an element's box; `display: none` collapses it | The button can be hidden with its space preserved exactly, so the slot needs no hardcoded height and nothing below can shift. `css/game.css:229` already chose `visibility` for the same class of reason. |
| **Both** `visibility: hidden` and `display: none` drop focus and leave the tab order | Hiding the button strands a keyboard user regardless of which is used, so focus has to be moved deliberately. This is the common path, not the rare one — the player usually just pressed Enter from the password field. |
| A hidden submit button does not stop a form submitting | Enter in a text field still fires `submit`. The duplicate guard has to live in the handler and cannot rely on the button being gone. |
| `.form-message` carries `min-height: 16px` itself (`css/login.css:224`) | A second message element with the same class would reserve a second line. The `min-height` moves to a wrapper the two share. |
| `js/leaderboard.js:8` already GETs `API.scores` **with** a token | The prewarm is a second, tokenless GET to the same URL whose result is discarded. Without a comment it reads as broken code. |
| `js/touch-input.js` puts its two feel tunables together at the top | Precedent for where `SHOW_DELAY_MS` and `WAKING_MESSAGE_MS` belong. |

## The part most likely to be got wrong

**Timer leaks.** There are two timers per form and four in total — the delay
before showing the indicator, and the ten-second waking threshold. Each has to be
cleared when its request settles, when a successful signup switches the view, and
on `pageshow`.

The failure is quiet and delayed. A surviving threshold timer paints "still
waking the server" onto a form with nothing in flight, ten seconds after the
attempt that armed it — long enough after the cause that it looks like a ghost.
The stacking case is worse: submit, fail, resubmit inside ten seconds, and the
first attempt's timer fires during the second.

Every timer handle lives on its form's pending controller, and `stop()` clears
both unconditionally. `stop()` must be safe to call when nothing is pending,
because `pageshow` calls it on every page view.

## Approach

### 1. `login.html` — a submit slot and a shared message slot

Per form, wrap the submit button so the indicator can sit over it:

```html
<div class="submit-slot">
    <input type="submit" value="Login" id="user-login-submit" class="form-field">
    <div class="progress" id="login-progress" role="progressbar" tabindex="-1"
         aria-label="logging in" hidden>
        <div class="progress-bar"></div>
    </div>
</div>
```

- `role="progressbar"` with **no `aria-valuenow`** is what marks it indeterminate.
- `tabindex="-1"` makes it a programmatic focus target — see focus handling below.
- `hidden` as the resting state, so a script that never runs leaves a plain button.

Then replace the single message paragraph with a slot holding both:

```html
<div class="form-message-slot">
    <p id="login-error" class="form-message" role="alert"></p>
    <p id="login-status" class="form-message form-status" role="status"></p>
</div>
```

`role="alert"` stays assertive for failures; `role="status"` is polite, which is
right for "things are fine, just slow". They never hold text at the same time, so
they share one reserved line.

Same three additions on the signup form, with `signup-` ids.

### 2. `css/login.css` — the indicator

- `.submit-slot { position: relative }`. The button keeps its normal flow;
  `.progress` is absolutely positioned to fill the slot.
- `form.pending .form-field[type="submit"] { visibility: hidden }` — box
  preserved, so the slot's height is still the button's height and nothing below
  moves. No magic number.
- `form.pending .progress` becomes visible (drop `hidden` via the attribute or a
  class — `[hidden]` needs `display` care since the element is flex).
- Track and bar: track in `#3d3d3d` with the `#5a5a5a` border and 8px radius the
  fields already use, bar in greenyellow.
- The animation translates the bar across the track on a loop, using
  **`steps()`** rather than linear easing — chunky discrete movement reads as
  deliberate against Press Start 2P and the pixel art, where a smooth
  Material-style sweep would look borrowed.
- Move `min-height: 16px` from `.form-message` to `.form-message-slot`.
- `.form-status` in white rather than the failure red — it is not an error.
- `@media (prefers-reduced-motion: reduce)`: no animation. The bar holds a
  **partial** static width, never full, so it can't read as "complete", and the
  waking message is surfaced immediately instead of at ten seconds so text
  carries the meaning the motion would have.

### 3. `js/login.js` — the pending controller

Two tunables at the top of the file, together:

```js
const SHOW_DELAY_MS = 250       // below this, the indicator would only flicker
const WAKING_MESSAGE_MS = 10000 // past this, a wait needs explaining
```

A factory per form keeps the two independent, which the spec requires, without
duplicating the logic:

```js
const loginPending = pendingFor(userLogin, loginProgress, loginStatus)
const signUpPending = pendingFor(userSignUp, signUpProgress, signUpStatus)
```

`pendingFor` closes over its form's elements and its two timer handles and
returns `{ start, stop, active }`:

- `start()` — sets `active`, arms both timers. The show timer adds the `pending`
  class, unhides the indicator, and **moves focus to it**. The threshold timer
  writes the waking message.
- `stop()` — clears both timers unconditionally, clears `active`, removes the
  class, re-hides the indicator, empties the status. Safe to call when idle.

**Focus.** When the indicator appears, focus moves to it — it is the element
describing the state, and Tab from there continues to the switch prompt below.
Without this the player lands on the document body and Tab restarts at the top.

**Guards.** Each submit handler, after `preventDefault()`, returns early if its
controller is already `active`. `start()` is called immediately — not after the
show delay — so a fast double-press is blocked during the window where nothing
has visibly changed.

**Wiring.**
- Login: `stop()` on both failure branches; **not** on success, since the page is
  navigating and releasing would flash the button back.
- Signup: `stop()` on failure, and on success as part of switching to the login
  view — otherwise toggling back later finds a form with no button and a bar
  still running.
- `window.addEventListener("pageshow", …)` calls `stop()` on both. This is the
  bfcache fix: the restored DOM keeps whatever state it had, and nothing at the
  top level of the file re-runs, so `localStorage.clear()` doesn't fire either.

**Prewarm**, near the top, commented so it isn't mistaken for a scores fetch:

```js
fetch(API.scores).catch(() => {})
```

Tokenless, so it answers 401 — which is fine, because the response is ignored
entirely. All that matters is that a request reached Render, which is what starts
the spin-up. The `.catch` swallows the CORS and offline cases; without it every
login page load can log an error for a request whose failure means nothing.

### 4. `CLAUDE.md`

- **The deploy tripwire stays at 77.** No new files — everything lands in the
  four that exist. Worth stating so nobody bumps it by reflex.
- A short subsection under the login page notes: the `pending` class, the two
  tunables and where they live, why the button is hidden with `visibility`, and
  that the prewarm's 401 is expected.

## File changes

| File | Change |
| --- | --- |
| `login.html` | submit slot + indicator + status element, both forms |
| `css/login.css` | indicator and keyframes, `pending` rules, message slot, reduced-motion |
| `js/login.js` | tunables, `pendingFor`, guards, `pageshow`, prewarm |
| `CLAUDE.md` | pending model; tripwire explicitly unchanged |

## Verification

Serve with `lite-server` or `python3 -m http.server` from the repo root.

**The timing paths, which is where the bugs are.** Temporarily drop
`WAKING_MESSAGE_MS` to ~1000 to exercise the threshold quickly, then restore it
and confirm once against a **real** cold start — let Render idle ~15 minutes, then
submit and watch the indicator run past 30 seconds with the message appearing on
schedule.

- A warm request settles inside the show delay: indicator never appears, button
  never moves.
- A slow request: indicator appears, then the message at the threshold.
- **Timer leak** — complete an attempt, then sit on the idle form for 15 seconds.
  Nothing may appear.
- **Stacking** — submit, fail, resubmit within ten seconds. The first attempt's
  timer must not fire during the second.

**The rest:**
- Double-press and Enter-spam during pending → exactly one POST in the network
  panel, not counting the prewarm.
- Failure → indicator stops, button returns, message shows, retry works without
  reloading.
- Successful login → reaches `index.html` with the button never reappearing.
- Successful signup → switches to login, and toggling back shows a normal signup
  button with no bar.
- **bfcache** — log in successfully, press Back. The login form must have its
  button, no bar, no message, no armed timer.
- Empty form → native validation, no pending state entered.
- Both forms pending at once → neither affects the other.
- Prewarm on load → one GET to `/scores`, no `Authorization` header, 401, no
  console error. Confirm nothing is created by loading the page.
- `prefers-reduced-motion` via DevTools rendering emulation → no animation, state
  still legible, bar not reading as complete.
- Screen reader → progress announced without a percentage; the waking message
  announced politely, not as an alert.
- 390px (DevTools device mode — Chrome won't resize a window below 500px):
  nothing shifts when the button is swapped, and the message wording fits.

**Deploy.** `firebase --version` current first — an old CLI reports
`found 0 files` and publishes an empty site behind a green tick. Output must
still read **77 files**, `/login.html` 200, and `/CLAUDE.md`, `/.git/config`,
`/_specs/…`, `/_plans/…` all 404.
