# Plan: Login page form toggle

Implements `_specs/login-form-toggle.md`. **Written before implementation** —
nothing here has been built or verified yet, so treat the design claims as
intent rather than as record. Correct it in place once it ships, the way
`_plans/touch-controls.md` was.

## Context

`login.html` shows both forms stacked at once — "New User:" above "Current User
Login:". The returning player, which is nearly every player, has to scroll past
a signup form they don't want, and on a phone the two forms push the card past
the viewport.

Underneath that is a worse problem the spec turned up: **a wrong password
produces nothing at all.** `js/login.js` chains
`fetch → parseJSON → storeToken → redirectToGame` with no failure branch. On a
rejected credential `response.token` is `undefined`, `localStorage` coerces it to
the string `"undefined"`, and `redirectToGame`'s `!== "undefined"` guard silently
declines to navigate. The player taps Login and the page just sits there. A
network error is worse still — no `.catch()`, so it is an unhandled rejection
with nothing on screen.

So this is two changes wearing one coat: restructure the page around a
single-form toggle, and give both forms a visible failure path.

## Findings that shape the design

Checked in the files rather than assumed. Each one changed the design.

| Finding | Consequence |
| --- | --- |
| `#new-user-signup` and `#user-login` are two **separate** `<form>` elements | The spec's "hidden form blocks validation" edge case does not apply — a form only validates its own controls. Keep them separate and it never arises. Merging them into one form is what would create it. |
| `js/gamescene.js:429` toggles a `game-over` class on `<body>`; `css/game.css:230` decides what it means | The house idiom for view state. `body.signup-view` follows it, and gives "the default view is markup + CSS, not JS" for free: no class **is** the login view. |
| `js/session-guard.js:10` treats the string `"undefined"` as a missing token | Confirms the current failure mode writes `"undefined"` into storage. The guard stays as defence for stale storage, but the new success-only write means nothing produces that value anymore. |
| `js/leaderboard.js:14` already ends its chain with `.catch(() => displayScores([]))` | There is an established `.catch()` idiom to copy for the failure path — not a new pattern. |
| `.form-field` is on the **submit buttons** as well as the four inputs (`login.html:24,33`) | Restyling `.form-field` wholesale turns the Login and Sign Up buttons gray. The new rules must be scoped by input type. |
| The `*` reset in `css/shared.css:16` sets `background-color: black` on everything | Inputs already need an explicit background; changing white to gray is a one-property edit, not a fight with the reset. |

## The part most likely to be got wrong

**Chrome overrides the field background on autofill.** `-webkit-autofill`
applies a UA background that beats an ordinary `background-color`, so a saved
login renders with Chrome's tint and near-black text instead of gray-and-white —
on a login form, the single most likely way a real player sees these fields. The
fix is the inset-shadow trick plus an explicit fill colour:

```css
input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 1000px #3d3d3d inset;
    -webkit-text-fill-color: white;
}
```

Verify with a genuinely saved credential, not by typing — autofill styling does
not engage on typed input, so this passes a manual test that never triggers it.

## Approach

### 1. `login.html` — restructure

One `.nav-bar-member` holding both forms, the "Welcome to Rave Mom" heading kept
above them. Per form:

- The `.form-title` heading (`New User:` / `Current User Login:`) is **deleted**.
- Each input gets a `<label for>` reading `username` / `password`, and its
  `placeholder` is dropped — the label replaces it.
- Every `id` is prefixed per form (`login-username`, `signup-password`, …) so the
  two forms' labels bind to the right controls. **`name="username"` and
  `name="password"` stay exactly as they are** — `js/login.js` reads them through
  `FormData`.
- Password fields are wrapped in a `position: relative` container holding the
  reveal button.
- `autocomplete`: `username` / `current-password` on login, `username` /
  `new-password` on signup.
- A message element below each submit button: `#login-error` and `#signup-error`,
  both `role="alert"` and empty. (`#sign-up-message` is deleted outright, which
  also disposes of its `<h3>`-opened-`</h2>`-closed markup bug.)
- A toggle control below each message: "Don't have an account? Sign up" and
  "Already have an account? Log in". A real `<button type="button">`, not a link
  — it has no href and must not navigate.

The reveal button:

```html
<button type="button" class="password-toggle" aria-controls="login-password" aria-pressed="false" aria-label="show password">
    <img class="eye-open" src="./assets/icons/eye.png" alt="">
    <img class="eye-shut" src="./assets/icons/eye-crossed.png" alt="">
</button>
```

Both icons ship in the markup so CSS picks one, rather than swapping `src` at
click time — that preloads the second image and avoids a blank frame on first
reveal. `alt=""` because the button's `aria-label` already names it; captioned
icons inside a labelled button read twice.

`type="button"` is load-bearing on all three buttons: a bare `<button>` inside a
form defaults to `type="submit"`.

### 2. `css/login.css` — view toggle, field styling, reveal button

- `#new-user-signup { display: none }` by default; `body.signup-view` flips which
  form displays. `display` rather than `visibility` — the hidden form's fields
  must leave the tab order, which `visibility: hidden` also does but `display`
  states more plainly, and there is no layout-stability reason to reserve the
  space the way `css/game.css` does for its buttons.
- Fields, scoped past the submit buttons:

```css
input[type="text"].form-field,
input[type="password"].form-field { background-color: #3d3d3d; color: white; }
```

- Focus glow on the same selectors, `:focus` not `:focus-visible`, so it engages
  on tap as well as tab:
  `box-shadow: 0 0 0 2px greenyellow, 0 0 8px greenyellow; outline: none`.
  Replacing the outline is only acceptable because the glow is the stronger
  indicator — do not drop it and leave nothing.
- `.password-toggle` absolutely positioned at the right edge of its wrapper, with
  a ≥44px touch target; the field gets matching `padding-right` so text never
  runs under it.
- Icons sized explicitly (~20px — the sources are 512x512) and inverted **on the
  `<img>` only**, so black line art reads white on the dark field:
  `.password-toggle img { filter: invert(1) }`.
- `.eye-shut` hidden by default; shown, with `.eye-open` hidden, when the button
  is `[aria-pressed="true"]`. Masked shows the open eye ("tap to show"); revealed
  shows the crossed eye ("tap to hide").
- New label / message / toggle-prompt rules in `'Press Start 2P'` white, with the
  message given a `min-height` of one line so appearing text does not shove the
  toggle prompt down under a thumb that is already moving toward it.
- **Delete the now-dead `.form-title` rules**, including their entry in the
  `max-width: 560px` block, and add the new text elements to that block's
  step-down.
- Chrome autofill override per the section above.

### 3. `js/login.js` — toggle, reveal, failure paths

Keep the file's existing flat, function-per-step shape.

- **Toggle:** both prompt buttons toggle `signup-view` on `<body>`, then focus the
  newly shown form's first field. Nothing is cleared — typed values persist, per
  spec. Re-mask both passwords on every toggle: the value survives, the reveal
  does not.
- **Reveal:** one handler for both buttons — flip the input's `type` between
  `password` and `text`, flip `aria-pressed`, and update `aria-label` to the
  action it will now perform.
- **Login submit:** move the `username` write out of the pre-fetch position into
  the success branch, so a failed login cannot leave a username in storage with
  no token. Then:

```js
.then(parseJSON)
.then(response => {
    if (response.token === undefined) return showError(loginError, "login failed")
    storeSession(response, user.username)
    window.location.href = "index.html"
})
.catch(() => showError(loginError, "login failed"))
```

  `redirectToGame`'s `!== "undefined"` guard goes away with it — it existed only
  to paper over the missing failure branch, and the branch now exists. The
  identical check in `js/session-guard.js` **stays**, since it defends against
  storage written by older builds.
- **Signup submit:** on success, clear the error and switch to the login view —
  that switch is the confirmation, so there is no success message. On
  `response.error`, or on a rejected fetch, show "signup failed" and stay put.
- Clear the relevant message at the top of each submit handler, so a retry never
  shows a stale failure beside a request in flight.
- `localStorage.clear()` on load stays exactly where it is.

### 4. `CLAUDE.md`

- Deploy tripwire **75 → 77** for the two eye PNGs, already committed in
  `afa1816`.
- A short subsection under the page-split notes: the `signup-view` body class,
  why the two forms stay separate elements, and that the password reveal is a
  render toggle that never persists the value — the existing "password is never
  persisted" section is emphatic, and a reader meeting a `type="text"` password
  field deserves to find that stated.

## File changes

| File | Change |
| --- | --- |
| `login.html` | restructure both forms — labels, ids, reveal buttons, message slots, toggle prompts |
| `css/login.css` | view toggle, gray fields + green glow, reveal button, autofill override, delete `.form-title` |
| `js/login.js` | toggle + reveal handlers, both failure paths, success-only username write |
| `CLAUDE.md` | tripwire 75 → 77, login page toggle model |

No new files, no changes to `css/shared.css`, and no change to `js/api.js`,
`js/session-guard.js`, or any game script.

## Verification

Serve with `lite-server` from the repo root. The backend is on Render
(`js/api.js:15`), so the credential paths work without running Rails locally —
and stopping at a nonexistent host is how to exercise the network-failure branch.

**Failure paths, which is where the actual bugs are:**
- Wrong password → "login failed", still on the page, console clean.
- Point `API_BASE` at an unreachable host, submit → same message, **no unhandled
  rejection**. Revert the edit after.
- After a failed login, `localStorage` holds no `username` — and no key at all
  set to the string `"undefined"`.
- Submit again after a failure → previous message clears.
- Duplicate username → "signup failed", stays on signup.
- New username → switches to login view, no message anywhere.

**Toggle and reveal:**
- Load → login form only; Tab from the top never reaches a signup field.
- Type in both forms, toggle back and forth → values still there, passwords
  re-masked, icons back to the open eye.
- Reload after toggling to signup → back to login.
- Reveal with a screen reader on → the button announces its action and pressed
  state, not just "button".

**Styling:**
- Both eye icons clearly visible on the gray field, both states.
- Focus glow on tab *and* on tap; Login and Sign Up buttons still white.
- **Autofill:** save a credential, reload, let Chrome fill it — field must stay
  gray with white text. This is the check most likely to be skipped and most
  likely to fail.
- 390px viewport: card fits or scrolls, nothing overflows, no input under 16px.

**Password never persisted:** log in with the password revealed, play, log out —
then confirm no `localStorage`, `sessionStorage`, or cookie key holds it.

**Deploy:** `firebase --version` current first — an old CLI reports
`found 0 files` and publishes an empty site behind a green tick. Output must read
**77 files**, `/index.html` and `/login.html` 200, and `/CLAUDE.md`,
`/.git/config`, `/_specs/…`, `/_plans/…` all 404.
