# Spec for separate-login-signup-page

branch: claude/feature/separate-login-signup-page

## Summary
Currently, the login form, signup form, game, and leaderboard all live together on `index.html`, with JavaScript toggling their visibility (`nav-card-container` vs. `game-container`) after a successful login. This spec covers splitting that single page into two: a new dedicated auth page containing the "New User" signup form and the "Current User Login" form, and the existing `index.html`, which will retain only the game and leaderboard. Successful login on the new auth page navigates the browser to the game page; successful signup creates a new user account without leaving the auth page.

## Functional Requirements
- A new HTML page is created to host the signup and login forms currently found in the `nav-card` section of `index.html`.
- The signup form on the new page continues to let a visitor create a new user account, and continues to show a confirmation or "user already exists" message in place, without navigating away from the auth page.
- The login form on the new page continues to authenticate an existing user against the backend, exactly as it does today.
- On successful login, the browser navigates to the main game page (`index.html`), which loads directly into the game/leaderboard view for the now-authenticated user (rather than the login/signup view).
- `index.html` no longer renders the login/signup nav card; it only renders the game dashboard, canvas, and leaderboard.
- The welcome message on the game page ("Welcome `<username>`") continues to display the logged-in user's name after arriving from the login page.
- Session data currently stored in `localStorage` (`token`, `user_id`, `username`, `password`) continues to be set on login and read on the game page so gameplay and leaderboard requests keep working unchanged.
- If a visitor lands on the game page (`index.html`) without a valid logged-in session, they are sent to the new auth page instead of seeing the game/leaderboard.
- Logging out from the game page returns the user to the new auth page (rather than re-showing an in-page login form on `index.html`).
- Existing styling/branding ("Welcome to Rave Mom" heading, form field styling) carries over to the new auth page so it doesn't look out of place compared to today's combined page.

## Possible Edge Cases
- User submits the login form with invalid credentials — the auth page should surface that failure and must not navigate to the game page.
- User signs up successfully, then immediately tries to log in with the same credentials on the same page load.
- User navigates directly to `index.html` via a bookmark or typed URL without ever visiting the auth page (no session present).
- User has a stale/expired token left in `localStorage` from a previous session and lands on the game page.
- User opens the game page in a second tab while already logged in in a first tab.
- Browser back/forward navigation between the auth page and the game page after login or logout.
- Signup form is submitted with a username that already exists — current "User Already Exists" messaging must still work on the new page.

## Acceptance Criteria
- Visiting the site's entry point shows the login/signup forms, not the game.
- Submitting the signup form creates a new user and shows an in-page success or error message, staying on the auth page.
- Submitting the login form with valid credentials navigates the browser to the game page and immediately shows the game/leaderboard UI with the correct welcome message, with no login/signup form visible.
- Submitting the login form with invalid credentials keeps the user on the auth page and does not grant access to the game page.
- Loading the game page directly without a valid session redirects to the auth page instead of showing the game.
- Logging out from the game page returns the visitor to the auth page.
- The leaderboard button/modal on the game page continues to function exactly as it does today.

## Open Questions
- Should the new auth page live at a specific filename/route (e.g. `login.html`), and does that need to be reflected anywhere else (Firebase hosting config, README, links)? login.html
- What should happen, precisely, if someone loads `index.html` with no valid session — an automatic redirect, or a message with a link back to the auth page? automatic redirect
- Is any visual/layout redesign of the login/signup forms desired for the new standalone page, or should it be a faithful copy of the current nav card? lets do a faithful copy will redesign later
- Should the signup form also auto-navigate to login/game after a successful signup, or continue requiring a separate manual login as it does today? Lets require a separate manual login
