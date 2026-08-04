# Spec for login-pending-state

branch: claude/feature/login-pending-state

## Summary

The backend runs on Render's free tier, which spins the instance down when idle.
The first request after that wakes it, and waking takes a long time — a wrong
password submitted against a cold instance took **over 20 seconds** to come back
during the login-form-toggle work, and Render's own documentation puts cold
starts near a minute in the worst case.

For that whole window the login page does nothing. The button stays lit, the
message slot stays empty, and there is no way to tell a request in flight from a
click that didn't register. The likely player response is to click again, or to
decide the game is broken and leave — and the second click is the more damaging
one, since it fires a second request against an instance that is already
struggling to wake.

This adds a pending state: on submit, the submit button gives way to a linear
indeterminate progress indicator, and no further submission is accepted until the
request settles. Past about ten seconds a message explains that the server is
still waking, so a long wait reads as expected rather than as a hang. It's the
follow-on that `_specs/login-form-toggle.md` deliberately left out of scope once
failure messages existed — the messages fixed "nothing happened when it failed",
and this fixes "nothing happens while it works".

Both forms get it. Signup POSTs to the same cold instance and has exactly the
same problem.

Alongside it, the page **starts waking the backend as soon as it loads**, rather
than waiting for the player to submit. Render begins spinning an instance up when
the first request arrives, and a player spends several seconds typing a username
and password before they submit — time the instance could already be using to
wake. So this change works both ends of the problem: the prewarm shortens the
wait, and the pending state explains whatever wait is left.

## Functional Requirements

### Entering the pending state

- On submit, the form enters a pending state before the request goes out.
- **The submit button is hidden and a linear indeterminate progress indicator
  takes its place**, in the same spot, for as long as the request is in flight.
  The button is not relabelled and not greyed — it is replaced.
- **The indicator waits a short beat before appearing.** Against a warm instance
  the whole request can settle in under 200ms, and a bar that appears and
  vanishes inside a couple of frames reads as a glitch rather than as progress.
  If the request settles within that beat, the indicator never appears at all and
  the button never moves. A delay before showing is preferred over a minimum
  display time because it can only ever shorten the interruption, never extend a
  wait that has already finished.
- The submit guard does **not** wait for that beat. It engages the instant the
  request is sent, so a fast double-press is blocked even during the window where
  nothing has visibly changed yet.
- Hiding the button is what stops a second click. A control that isn't there
  can't be pressed twice, and Enter in a field must be blocked on the same state,
  since a hidden submit button does not stop a form from submitting.
- An **indeterminate** indicator is the right kind precisely because the duration
  is unknowable from the client: a warm instance answers in well under a second
  and a cold one can take the better part of a minute. Nothing on the page can
  tell which is happening, so nothing should imply a percentage or an ETA.
- Any failure message left over from a previous attempt clears as it enters —
  `js/login.js` already clears it at the top of each submit handler, and that
  behavior stays.
- Native validation runs first. A form that fails `required` or `minlength` never
  fires its submit handler, so an empty form must not enter the pending state or
  leave a stuck button behind.

### Leaving the pending state

**The indicator's lifetime is the request's lifetime.** It starts when the
request is sent and stops when that request settles — not on a timer, and not
after a fixed number of seconds. A fixed duration would be wrong in both
directions: it would keep animating long after a fast response had already come
back, and it would stop while a slow cold start was still genuinely in progress,
which is the exact moment the player most needs to see it. (A fixed-duration
*give-up* is a different mechanism — see the timeout question in Open Questions.)

- **On failure** — a rejected credential, a duplicate username, or a request that
  never completed — the indicator stops, the button comes back, and the existing
  failure message appears. The player must be able to retry without reloading.
- **On successful login** the page navigates to `index.html`. The indicator keeps
  running through that, because the work genuinely isn't finished — stopping it
  would flash the button back for a frame on a page that's leaving.
- **On successful signup** the view switches to the login form. The signup form's
  indicator must stop and its button return as part of that, or switching back
  later finds a form with no submit button and a bar still animating on it.
- Both forms track their own state. A login in flight must not disable the signup
  button, or vice versa.

### The waking message

- If a request is still in flight after roughly **10 seconds**, a message appears
  saying the server is still waking up. The indicator alone confirms something is
  happening; past ten seconds the player needs to know *why* it is taking this
  long, and that the wait is expected rather than a hang.
- It is a **status, not an error** — the wording should read as an explanation,
  and it must not be written into the existing `role="alert"` elements, which are
  assertive and reserved for failures. A screen reader interrupting with an alert
  to say things are fine is the wrong signal.
- It clears when the request settles, in every outcome — success, failure, or a
  view switch. A failure message replacing it must not leave both on screen.
- It can share the reserved message line with the failure message rather than
  claiming a second one, because the two are mutually exclusive: the failure slot
  is cleared on submit and only refills once the request has settled, by which
  time this message is gone.
- Both the delay before showing the indicator and this threshold are **timing
  values that belong together in one named place**, the way `DEAD_ZONE` and
  `HYSTERESIS` sit at the top of `js/touch-input.js`. They are the two numbers
  anyone tuning this will want to find.

### Restoring from the back/forward cache

- Both forms are reset to their normal, usable state whenever the page is shown,
  including when it is restored from the browser's back/forward cache — buttons
  back, indicators stopped, waking message cleared, **and both pending timers
  cancelled**. The `pageshow` event is what covers the restore case; an ordinary
  load has nothing pending, so resetting unconditionally on every show is a no-op
  there and needs no special-casing.
- This is not optional polish. Without it, a successful login followed by the
  back button lands the player on a login page with no submit button, a bar
  animating forever, and no way to recover but a manual reload.

### While pending

- The view toggle ("Don't have an account? Sign up") stays usable. A player who
  gets bored waiting is allowed to go look at the other form.
- Consequently the response can arrive while its form is hidden. Whatever it does
  — release the button, show a message, switch views — must not yank the player
  out of the form they're now looking at, and must leave both forms in a
  coherent state.
- The password reveal stays usable; it's a rendering toggle with no bearing on
  the request.
- The fields themselves may stay editable. Nothing depends on them after the
  request body is built, and freezing them adds a state to unwind for no gain.

### Warming the backend on page load

- When `login.html` loads, the page fires one request at the backend for the sole
  purpose of starting the instance waking. It is sent as early as the page script
  runs, so the wake overlaps with the player typing.
- **It is a GET to `API.scores` with no `Authorization` header**, which answers
  401. That is a fine outcome — the point is that the request reached Render, not
  what came back.
- This **needs a comment saying so.** `js/leaderboard.js` already GETs the same
  URL, with a token, as a real scores fetch. Without a note, the next reader finds
  a second, tokenless call to the scores endpoint whose result is thrown away and
  reasonably concludes it is broken.
- **The response is ignored entirely** — status code, body, and all. What matters
  is only that a request reached Render's router, which is what triggers the spin
  up. A 401, a 404, a 405, or a CORS rejection all wake the instance just as well
  as a 200, so none of them is a failure for this purpose.
- **It must be a safe request with no side effects.** A GET, not a POST — it must
  not create a user, a score, or a session. It sends no credentials.
- It is completely silent. It never shows a message, never touches either
  button's state, never counts as the pending state, and never writes anything to
  storage.
- **Its failure must be swallowed**, including the CORS case. An uncaught
  rejection here would put an error in the console on every single visit to the
  login page, on a request whose failure is genuinely of no consequence.
- A real submit that happens while the prewarm is still in flight proceeds
  normally. The two are independent; the prewarm is never awaited and never
  blocks or delays a submit.
- Only `login.html` does this. `index.html` and `leaderboard.html` already hold a
  session and talk to the API on their own.

### Accessibility

- The indicator is exposed to assistive technology as an indeterminate progress
  indicator — announced as in-progress, with **no percentage or value**, since
  there is none to report. A bar that is only a moving graphic tells a screen
  reader user nothing.
- The waking message is a polite status, announced without interrupting. It is
  separate from the `role="alert"` failure elements even if it shares their space
  on screen.
- **It must respect `prefers-reduced-motion`.** A continuously looping animation
  is precisely what that setting exists to suppress, and it can cause real
  discomfort. Under it the pending state still has to be conveyed — a static
  indicator, or text — rather than simply disappearing and leaving those players
  back where this spec started, with a page that looks like it did nothing.
- **Disabling the button while it holds focus drops focus to the document body**
  in most browsers, which strands a keyboard user mid-form and sends them back to
  the top on the next Tab. Whatever mechanism is used has to keep the player
  somewhere sensible.
- The existing message elements are `role="alert"`, which is assertive and
  correct for a failure. A progress announcement is a *status*, not an alert, and
  should not interrupt with the same urgency — it needs its own treatment rather
  than being written into the alert element.

### Visual

- The indicator occupies **exactly the space the button vacates**, so swapping one
  for the other shifts nothing. The button is `.form-field`: full width, 8px
  corners, and a known height. Reserving that box is what keeps the failure
  message and the "Don't have an account?" prompt below it from jumping.
- It is built in CSS — an animated bar, no image, no library, nothing to load.
  This matters more than usual here: an indicator that had to be fetched from the
  network would be racing the very request whose slowness it exists to explain.
- It should read as part of the game's look rather than a stock component
  dropped in — greenyellow on the card's black is the palette already in use, and
  the pixel aesthetic argues for hard edges over a soft gradient sweep.
- It stays distinguishable from the grey text fields above it, which are `#3d3d3d`
  with a `#5a5a5a` border.

### Constraints carried over

- No build step, no bundler, no new dependencies. Plain HTML/CSS/JS in the
  existing files.
- The password still goes into the request body and nowhere else. This change
  touches button state only and must not introduce any new persistence.
- `js/login.js` still clears all of `localStorage` on load.
- `.form-field` keeps a font size no smaller than 16px, and the rules for the two
  submit buttons must stay scoped so they don't leak onto the text inputs — see
  the input-type scoping already in `css/login.css`.

## Possible Edge Cases

- **The back button restores a stuck pending button.** After a successful login
  the page navigates to `index.html`; pressing Back can restore `login.html` from
  the browser's back/forward cache with its DOM exactly as it left — button
  disabled, still reading as in-flight, and unusable. A bfcache restore does not
  re-run the script, so `localStorage.clear()` at the top of `js/login.js` does
  not fire either. This is the most likely way a real player meets a permanently
  dead login button. Handled by the `pageshow` reset above; the reason it needs
  its own mechanism is precisely that no code at the top level of the file runs
  again.
- **A "backend is booted" flag in storage does not address this**, and is worth
  recording as considered and rejected so it isn't re-proposed. The stuck button
  is restored DOM state, not a wrong belief about the backend — knowing the
  instance was warm would not re-enable it. It would also be wiped by the
  `localStorage.clear()` on every login-page load, go stale silently once Render
  idles the instance out (~15 minutes), and cache a server-side global fact in
  one player's browser where it says nothing about whether the instance is awake
  right now. It fails in the worst direction too: wrongly believing the backend
  is warm would suppress reassurance exactly when the wait is longest.
- **A response arriving after the player switched forms.** Covered above, but
  worth restating as the case most likely to produce a visible glitch: focus
  moving, or a message appearing on a form nobody is looking at.
- **Two requests in flight across the two forms.** Submit login, toggle to
  signup, submit signup — both are pending at once. Neither may release or
  message the other's form.
- **The waking message can appear on a hidden form.** The player submits, waits,
  toggles to the other form, and ten seconds later the message lands on a form
  nobody is looking at — while the form they *are* looking at says nothing about
  the request still running.
- **Double submit in the same tick.** Two Enter presses in quick succession, or a
  double-click, can both dispatch before a disable applied inside the handler
  takes effect. The guard needs to hold for the very first repeat, not just the
  second.
- **Enter inside a text field** submits the form the same as clicking, so it has
  to go through the identical path.
- **A cold start is long enough to look broken anyway.** Twenty-plus seconds of a
  button reading "logging in…" may still read as hung. Whether to say something
  more after a threshold is an open question below, but the plain pending state
  is the floor.
- **Autofill plus immediate submit.** A password manager can fill and submit
  faster than a person, which is the tightest timing the guard will see.
- **A hidden submit button does not stop the form submitting.** Pressing Enter in
  a text field still fires submit even with no visible button, so the guard has to
  live in the submit handler and not rely on the button being gone.
- **Hiding the button drops focus.** `display: none` on the focused element sends
  focus to the document body — and the player has very likely just pressed Enter
  from the password field or clicked the button itself, so this is the common
  path, not the rare one. Note `css/game.css` already prefers `visibility` over
  `display` for a related reason; the same choice matters here for a different
  one.
- **A leaked timer fires onto an idle form.** There are now two timers per form —
  the show delay and the 10-second threshold — and four in total. Every one of
  them has to be cancelled when its request settles, when the view switches on a
  successful signup, and on `pageshow`. A surviving timer paints an indicator or
  a "still waking" message onto a form that has nothing in flight, and the
  threshold one does it ten seconds after the fact, long after any obvious cause.
- **A second submit must not stack timers.** Submitting, failing, and submitting
  again inside ten seconds must not leave the first attempt's threshold timer
  running to fire during the second.
- **A hung request pends forever, by decision.** With no timeout, a connection
  that stalls without erroring leaves the indicator running indefinitely. This is
  accepted: on a backend that legitimately takes 50+ seconds to wake, a timeout
  risks calling failure on a login that was about to succeed. The waking message
  is what makes the state legible in the meantime, and a reload is the escape
  hatch. Worth knowing it is a decision and not an oversight.
- **`prefers-reduced-motion` must not silently remove the feedback.** Suppressing
  the animation and leaving nothing behind returns those players to exactly the
  problem this spec exists to fix.
- **The prewarm makes the login page talk to the backend unprompted.** Anyone
  watching the network panel will see a request they didn't ask for, and it now
  happens on a page a logged-out stranger can load. It must stay a plain,
  credential-free GET so that is all it ever is.
- **A CORS-blocked prewarm still works but looks broken.** The browser sends the
  request — so the instance wakes — then blocks the *response* and rejects the
  promise. The wake succeeds and the console reports a failure, which is exactly
  backwards from how it reads. Worth knowing before someone "fixes" it.
- **The prewarm keeps a free-tier instance awake more of the time.** Every visit
  to the login page now counts as traffic. That is the point, but it does consume
  more of the free tier's budget than before, and a bot crawling the login page
  would wake the backend repeatedly.
- **The prewarm cannot fully close the gap.** A player who autofills and submits
  instantly gives it no head start at all, and a cold start can outlast the
  typing regardless. The pending state still has to carry that case — the prewarm
  shortens the wait, it does not remove it.
- **A prewarm still in flight at submit time** must not be mistaken for the
  submit's own request when checking that no duplicate login was sent.

## Acceptance Criteria

- Submitting the login form immediately hides the button and shows an animating
  indicator in its place, before any response arrives.
- The indicator runs for as long as the request does — confirmed by watching a
  genuine cold start run past 30 seconds with it still animating, and a warm
  request stop it promptly. It is never on a fixed timer.
- A request that settles inside the show delay never displays the indicator at
  all, and the button never moves.
- A request still running at ~10 seconds shows the waking message; one that
  settles before then never does.
- The waking message clears on success, on failure, and on a signup view switch —
  never left on screen beside a failure message.
- Submitting, failing, and resubmitting inside ten seconds does not fire the first
  attempt's threshold timer during the second attempt.
- After any completed attempt, waiting 15 seconds on an idle form produces no
  stray indicator and no stray message.
- Pressing Enter in a field while pending sends no second request — verifiable as
  a single login entry in the network panel, not counting the page-load prewarm.
- On a failed login the indicator stops, the button returns, and "login failed"
  appears. A second attempt works without reloading.
- On a successful login the page reaches `index.html` with the button never
  having reappeared.
- On a failed signup the indicator stops, the button returns, and "signup failed"
  appears.
- On a successful signup the view switches to login **and** the signup button is
  back to normal — confirmed by toggling back to it.
- With the backend unreachable, both buttons recover rather than sticking.
- Submitting an empty form triggers native validation and leaves the button
  untouched and usable.
- A login and a signup can be pending simultaneously without affecting each
  other's button.
- Pressing Back after a successful login lands on a login form with its button
  present and usable, no indicator running, no waking message, and no timer left
  armed.
- The prewarm is a GET to `API.scores` sent with no `Authorization` header, and
  its 401 is ignored.
- The pending state is announced to assistive technology as indeterminate
  progress, with no percentage, and a keyboard user Tabbing after submit is
  somewhere sensible rather than back at the top of the document.
- With `prefers-reduced-motion: reduce` set, the animation stops but the pending
  state is still conveyed — the page must not look idle.
- Nothing resizes or shifts when the button is swapped for the indicator, at both
  desktop and 390px. The failure message and the switch prompt below stay put.
- The indicator needs no network request of its own — verifiable by watching the
  network panel show nothing but the login POST.
- Loading `login.html` fires exactly one prewarm request, visible in the network
  panel before the player types anything.
- The prewarm leaves no trace in the UI: no message, no button state, nothing
  written to storage.
- With the backend unreachable, or with CORS rejecting the prewarm response, the
  console stays clean — no unhandled rejection from the prewarm on any page load.
- The prewarm is a GET and creates nothing. Confirm no user, score, or session is
  created by simply loading the login page.
- A submit fired while the prewarm is still in flight completes normally.
- No JavaScript errors on load, on submit, on failure, or on toggling views
  mid-request.

## Open Questions

Resolved during review: the pending state is a **linear indeterminate progress
indicator shown in place of the hidden submit button**, tied to the request's
lifetime rather than a fixed duration. This supersedes the earlier decision to
grey the button out — the two are alternatives, not layers, and the indicator is
the stronger of them because it says "something is happening" where a grey button
only says "you can't press this." The **backend prewarm on page load is also in
scope for this change**, not deferred to its own spec.

Also resolved: a **waking message after ~10 seconds** is in scope; a **short
delay before the indicator appears** is in scope; **signup gets the full
treatment** alongside login; the prewarm is a **tokenless GET to `API.scores`**;
and there is **no request timeout** — a hung request pends indefinitely, which is
a deliberate trade against calling failure on a slow login that was about to
succeed.

Deferred to its own change:

- **Distinguishing an unreachable backend from a wrong password.** Both say
  "login failed" today, deliberately. The waking message makes the gap more
  visible rather than less — a player can now watch it say the server is waking
  and then be told the login failed, with no way to tell whether their password
  was wrong or the backend never came up. Worth revisiting, but it is a change to
  what the failure messages mean and belongs on its own.

Still open:

- **The two timing values.** ~10 seconds for the waking message and a short beat
  before the indicator are both starting points, not measured. The threshold in
  particular wants checking against a real cold start: too early and it fires on
  ordinary waits, too late and the player has already given up.
- **The waking message's wording.** "still waking the server…" is the working
  text. Press Start 2P is wide and this is the longest string on the card, so it
  may need shortening — especially at the 560px breakpoint where the type steps
  down.
