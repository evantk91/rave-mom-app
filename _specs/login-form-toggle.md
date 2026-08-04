# Spec for login-form-toggle

branch: claude/feature/login-form-toggle

## Summary

`login.html` currently stacks both forms on the page at once: a "New User:" signup
form and a "Current User Login:" form, one above the other. A returning player —
the overwhelmingly common case — has to read past a signup form they don't want
before reaching the one they do, and on a phone the two stacked forms push the
card taller than the viewport.

This feature replaces the stacked layout with a single form area that shows one
form at a time. Login is the default view. It has a labelled username field, a
labelled password field with an eye-icon show/hide toggle, a Login button, and
beneath that the prompt "Don't have an account? Sign up" whose "Sign up" control
swaps the view to the signup form. The signup form gets the mirrored control to
swap back. Fields are restyled — gray background, white text — and take a green
glow while focused, so it's obvious which one the player is filling in.

Two feedback changes come with it. A failed login, which today does nothing
visible at all, now says "login failed". And the signup form's inline
"Ya, Signed Up!" message is retired in favour of the view simply switching to
the login form on success.

Otherwise this is a presentation and interaction change. The two `fetch` calls,
the request bodies, the `localStorage` writes, and the post-login navigation to
`index.html` all keep their current behavior.

## Functional Requirements

### Form toggle

- The login page shows exactly one of the two forms at a time.
- Login is the default view on every page load. Arriving at `login.html` — for
  the first time, after a logout, or after a session-guard redirect — always
  lands on login. The choice is not remembered between visits.
- The login form shows a prompt below its submit button reading
  "Don't have an account? Sign up", where "Sign up" is the interactive control.
  Activating it hides the login form and shows the signup form.
- The signup form shows the mirrored prompt below its submit button — "Already
  have an account? Log in" — that returns to the login form.
- Both toggle controls are reachable by keyboard and operable with Enter/Space,
  and expose an accessible name that says what they do. They must not submit
  either form.
- The default view is established by markup and CSS, not by JavaScript running on
  load. If the page script fails, the login form must still be visible and
  submittable; the toggle is the part that degrades.
- Only the fields of the currently visible form participate in validation,
  submission, and tab order. The hidden form's fields must not be focusable and
  must not block submission of the visible one via native `required` /
  `minlength` constraints.
- **Typed values persist across toggles.** Switching to the other form and back
  leaves whatever the player had typed still in the fields. Nothing is cleared on
  toggle.

### Labels

- The "New User:" and "Current User Login:" headings are **removed**. With one
  form showing at a time they no longer earn their space, and the toggle prompt
  already says which form you're on.
- Each username and password field gets a visible `<label>` reading "username"
  and "password", properly associated with its input.
- The labels replace the current `placeholder` attributes as the field's name.
  Placeholders are not a substitute for a label and disappear the moment the
  player types.
- The `.form-title` rules in `css/login.css`, including their mobile-breakpoint
  step-down, become dead once the headings are gone and should be removed rather
  than left behind.

### Login form

- Contents, in order: username label + field, password label + field with its
  show/hide toggle, the Login button, the failure message slot, then the signup
  prompt.
- The password show/hide toggle switches the field between masked and plain text
  using the icons already added at `assets/icons/eye.png` and
  `assets/icons/eye-crossed.png`.
- The icon reflects state, and the control carries a text accessible name
  (`aria-label` or visually-hidden text) saying what activating it will do — an
  icon alone has no accessible name. Its pressed state is exposed to assistive
  technology.
- The toggle only changes how the field renders. The password value is read from
  the form at submit time exactly as it is today and is never written to
  `localStorage`, `sessionStorage`, or a cookie.
- The password starts masked on every page load and reverts to masked whenever
  the form is toggled away and back — the *value* persists per the toggle rule
  above, the *reveal* does not.
- Fields carry appropriate `autocomplete` values (`username`,
  `current-password`) so password managers fill the right boxes.
- A successful login is unchanged: POST to `API.login`, store `token` /
  `user_id` / `username`, then navigate to `index.html`.

### Login failure feedback

Today a wrong password produces nothing — no message, no navigation, the page
just sits there. This change fixes that.

- A failed login shows the message **"login failed"** on the login form, below
  the Login button.
- "Failed" covers both a rejected credential (the API responds without a token)
  and a request that never completes (network error, backend down). The current
  chain has no `.catch()`, so a rejected `fetch` currently produces an unhandled
  promise rejection and no user-visible result; both paths must land on the
  message.
- The message clears when the player resubmits, so a retry doesn't show a stale
  failure next to a request in flight.
- The message is announced to assistive technology when it appears — it is new
  content on a page that did not reload.
- `js/login.js` writes `username` to `localStorage` *before* the fetch. On a
  failed login that write stands even though no session exists. Either move the
  write to the success path or clear it on failure; leaving a username behind
  with no token is the kind of half-state that produces confusing bugs later.
- The message never reveals which half of the credential was wrong.

### Signup form

- Keeps its current fields, its `minlength` password constraint, and its POST to
  `API.users`.
- Signup still does **not** auto-navigate to the game — that constraint stands.
- **The inline `#sign-up-message` element is removed.** On success the page
  toggles back to the login form, and that switch is the confirmation; a message
  saying the same thing is redundant.
- **A failed signup still needs to say so.** With the message element gone, a
  duplicate username would otherwise produce a completely silent dead button —
  worse than the current behavior. The signup form therefore reuses the same
  message treatment introduced for login failure, showing **"signup failed"**
  below the Sign Up button, and the view stays on signup so the player can change
  the username in place. (See Open Questions — this is the one place the spec
  adds back something the "remove the signup message" decision took away, and
  it's easy to cut if that's not wanted.)
- The signup password field gets the same eye-icon toggle as login. Its
  `autocomplete` value is `new-password`.

### Field styling and focus highlight

- Username and password fields get a **gray background with white text**,
  replacing the current white background.
- Focused fields take a **green glow** matching the card's greenyellow border.
  The glow is driven by focus, so it appears for keyboard tabbing as well as
  tapping, and it must not leave the field with no visible focus indicator.
- The eye icons are black line art and are **inverted in CSS** so they render
  white against the gray field. No new asset, and one rule covers both icons and
  both states.
- `.form-field` is currently on the submit buttons too, not just the inputs. The
  gray/white treatment must be scoped so the Login and Sign Up buttons keep their
  existing white-button look.
- `.form-field` lives in `css/shared.css` but is only used by `login.html`.
  Whether the new rules go there or in `css/login.css` is an implementation call;
  keep the 16px minimum font size wherever they land.
- The failure messages need enough contrast to read on the card's black
  background and should be visually distinct from the toggle prompt sitting right
  below them.

### Constraints carried over

- `js/login.js` still clears all of `localStorage` on load, so a visit to the
  login page always starts from a clean session.
- `.form-field` keeps a font size no smaller than 16px. Below that, iOS Safari
  zooms the page when an input is focused, which rescales the layout mid-login.
- The page keeps loading `js/api.js` before `js/login.js`, both deferred.
- No build step, no bundler, no new dependencies. Plain HTML/CSS/JS in the
  existing files.
- The two eye PNGs are new files that will ship. Firebase Hosting's public root
  is the whole repo, so they deploy automatically — but the expected file count
  documented in `CLAUDE.md` goes from **75 to 77** and must be updated with them,
  or the tripwire stops meaning anything.

## Possible Edge Cases

- **Icon size.** The source PNGs are 512x512 and will be rendered at roughly
  20-24px. They need explicit sizing, and the toggle needs a touch target big
  enough to hit on a phone even if the icon itself is small.
- **Inversion scope.** `filter: invert(1)` must apply only to the icon, not to a
  parent that also contains the field or its text.
- **Placeholder contrast.** If placeholders are kept alongside the new labels,
  the default placeholder gray on the new gray field may be unreadable. Dropping
  them, as specified above, avoids the problem.
- **Password left revealed.** Submitting, or toggling to the other form, should
  not leave a plaintext password sitting on screen for the next person at the
  machine.
- **Failure message on the wrong form.** Each message belongs to its own form and
  must not be visible on the other. Toggling forms after a failure should not
  carry the message across.
- **Distinguishing failure from a slow request.** A player who taps Login and
  sees nothing for a second has no way to tell a pending request from a broken
  one. Clearing the old message on submit is the minimum; a pending state is not
  required by this spec but is the obvious next step.
- **Backend down.** With the API unreachable, both forms must fail visibly rather
  than hanging silently — this is the most likely way a real player meets the
  failure path, since the backend runs separately from the hosted frontend.
- **Duplicate field identity.** Both forms have a username and a password field.
  Every `id` used for a `<label for>`, an `aria-controls`, or a toggle hookup has
  to be unique across the two, even though the `name` attributes stay the same —
  the existing `FormData` reads depend on those names.
- **Native validation on the hidden form.** The signup password's `minlength="5"`
  and the `required` attributes will silently block submission of the visible
  form if the hidden form is still a live part of the same submission, and the
  browser cannot focus a hidden field to report the error — the failure looks
  like a dead Login button with no message.
- **Icon path base.** Per `CLAUDE.md`, a `url(...)` in `css/login.css` resolves
  against the stylesheet (`../assets/icons/…`) while an `<img src>` in
  `login.html` resolves against the document (`./assets/icons/…`). Same file, two
  different prefixes depending on where it's referenced.
- **Removing `#sign-up-message` cleans up a markup bug.** It is currently opened
  as `<h3>` and closed as `</h2>`. Deleting the element takes the bug with it —
  don't reproduce the mismatch in whatever replaces it.
- **Password managers.** Some fill both a login and a signup form when both are
  in the DOM. Autocomplete hints and the hidden form's state should keep the
  visible form's fields the ones that get filled.
- **Enter key.** Pressing Enter in a field submits its own form, not the other
  one, and does not trigger a toggle control or the eye toggle that happens to be
  focusable nearby.
- **Small viewports.** The single-form card is shorter than today's stacked
  layout, but the card must still scroll rather than clip at 560px and below,
  where `css/login.css` steps the type down. The new labels and message slot add
  height back.
- **Message slot reflow.** A message appearing below the button will push the
  toggle prompt down unless its space is reserved, moving a control the player
  may be about to tap.
- **Toggle control styling.** The prompt sits below a full-width white button; a
  link-styled control needs enough contrast on black not to read as body text.
- **Screen readers.** Swapping forms is a view change with no page load. The
  newly shown form's first field should be a sensible focus target so a keyboard
  user isn't dropped at the top of the document.

## Acceptance Criteria

- Loading `login.html` shows the login form only. The signup form is not visible
  and its fields are not reachable by Tab.
- The login form shows, in order: a labelled username field, a labelled password
  field with an eye toggle, the Login button, and the text "Don't have an
  account? Sign up".
- The "New User:" and "Current User Login:" headings are gone, and every username
  and password field has a visible associated label.
- Activating "Sign up" shows the signup form and hides the login form; "Already
  have an account? Log in" returns to login. Both work by mouse, by touch, and by
  keyboard.
- Text typed into a field is still there after toggling to the other form and
  back.
- Reloading the page after toggling to signup returns to the login form.
- The eye toggle reveals and re-masks the password, the icon swaps between
  `eye.png` and `eye-crossed.png`, the control has a text accessible name, and
  the field is masked again on load and after toggling forms.
- Both eye icons render white against the gray field and are clearly visible in
  both states.
- After a full login-and-logout round trip with the password revealed at least
  once, no key holding the password exists in `localStorage`, `sessionStorage`,
  or cookies.
- Username and password fields render gray with white text and take a green glow
  on focus that clears on blur, for both tab and tap. The Login and Sign Up
  buttons still look like the white buttons they are today.
- Logging in with valid credentials stores `token`, `user_id`, and `username` and
  navigates to `index.html` — unchanged from today.
- Logging in with a wrong password shows "login failed" and stays on the page.
- Logging in with the backend unreachable shows the same message, with no
  unhandled promise rejection in the console.
- After a failed login, `localStorage` holds no `username` without a matching
  `token`.
- Resubmitting after a failure clears the previous message.
- Signing up with a new username switches to the login form, with no leftover
  signup message anywhere on the page.
- Signing up with an existing username shows "signup failed" and stays on the
  signup form.
- Toggling forms after either failure does not show that message on the other
  form.
- `#sign-up-message` no longer exists in the markup.
- Neither the Login nor the Sign Up button is blocked by validation belonging to
  the form that isn't showing.
- At 390px wide, the card fits or scrolls, no field or label overflows it, and no
  input is smaller than 16px.
- No JavaScript errors in the console on load, on toggle, or on submit.
- `CLAUDE.md`'s expected deploy file count reads 77.

## Open Questions

All spec-review questions are resolved. For the record: the reciprocal wording is
"Already have an account? Log in"; the affordance is the `eye.png` /
`eye-crossed.png` pair, inverted in CSS; the form headings are dropped in favour
of field labels; a successful signup toggles back to login; typed values persist
across toggles; fields are gray with white text and a green focus glow; the
inline signup message is removed; and a failed login now says "login failed".

The one item raised for confirmation has been confirmed:

- **Signup failure feedback stays.** "Remove the signup message" was about the
  success case, which the auto-toggle now covers. The failure case keeps a
  "signup failed" message using the same treatment as the login one, so a
  duplicate username never produces a silent dead button.
