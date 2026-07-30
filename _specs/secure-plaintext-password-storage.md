# Spec for secure-plaintext-password-storage

branch: claude/feature/secure-plaintext-password-storage

## Summary

On submitting the login form, `login.js` writes the user's raw password into `localStorage` under the key `password`, alongside `username`, `token`, and `user_id`. It sits there in plaintext, readable by any script running on the origin.

The important finding from investigating this: **nothing ever reads that key.** There is no `getItem("password")` anywhere in the codebase. The value is written once at login and never consulted again — not by `session-guard.js`, not by `dashboard.js`, not by `gamescene.js`. Authentication against the backend uses the bearer `token` exclusively.

So this is not a case of needing to protect a credential the app depends on. It is a stray write with no consumer, and the secure form of it is simply not to store it. Encrypting or obfuscating it client-side would be strictly worse: it would add machinery to guard a value nothing needs, and any client-side key is recoverable by the same attacker the scheme is meant to stop.

The risk this closes is real but bounded. A token is revocable and scoped to this app; a password is neither, and users reuse passwords across sites. Any XSS on the game page, a malicious extension, or someone on a shared machine opening devtools currently walks away with the actual credential rather than a session artifact.

There is also a residue problem. Users who logged in before this change already have the key sitting in their browser. Removing the write stops new ones but does not clean up existing ones. `login.js` calls `localStorage.clear()` on every load of the login page and `dashboard.js` clears on logout, so most users are cleaned up the next time they pass through either path — but a user who stays logged in and never revisits the login page keeps their stored password indefinitely. The fix needs to handle that population explicitly rather than relying on them happening to log out.

## Functional Requirements

- The login flow must not write the user's password to `localStorage`, `sessionStorage`, cookies, IndexedDB, or any other client-side persistence.
- The password must still be sent to the login endpoint in the request body exactly as it is today. Only the local persistence is removed; the wire format and the backend contract are unchanged.
- Any pre-existing `password` key must be actively removed from a returning user's storage, without requiring them to log out or visit the login page.
- Removal of the stale key must not disturb `token`, `user_id`, or `username`, and must not log the user out or interrupt a game in progress.
- The session must continue to work exactly as it does now: `session-guard.js` gates on `token` and `user_id`, the welcome message reads `username`, and authenticated requests send `Authorization: bearer <token>`.
- The signup flow must remain free of any password persistence. It does not store one today and must not begin to.
- No new dependency, build step, or bundler may be introduced. The project is plain static scripts loaded via tags and must stay that way.

## Possible Edge Cases

- A user is mid-game with a live session when the new code ships. The cleanup must run without resetting their score or disrupting the Phaser scene.
- A user has `password` stored but no valid `token` — for example a login attempt that failed after the password write but before the token write. The guard should still redirect them to the login page, and the stale password should not survive that redirect.
- `login.js` clears all of storage on load, so the login page itself needs no cleanup logic. Adding it there would be redundant; the cleanup has to live on the path a logged-in user actually takes.
- Storage may be unavailable or throw — private browsing modes, disabled site data, quota errors. A failed cleanup must not throw an uncaught error that blocks the session guard or prevents the game from loading.
- Multiple tabs open on the same origin. Cleanup in one tab must not put another tab into an inconsistent state.
- A user with no `password` key at all, which is the steady state after this ships. The cleanup must be a no-op and must not create the key or error on its absence.

## Acceptance Criteria

- After a successful login, `localStorage` contains `token`, `user_id`, and `username`, and does not contain `password`.
- After a failed login, `localStorage` does not contain `password`.
- A browser seeded with a `password` key plus a valid session has that key removed on the next visit to the game page, while the session survives and the game loads normally.
- A full grep of the source for `password` shows no writes to client-side storage.
- The login request body still carries the password and the backend still authenticates successfully.
- Session guard, welcome message, leaderboard, score submission, restart, and logout all behave as they do today.
- The live site serves no page that writes a password to storage after deploy.

## Open Questions

- Where should the cleanup for returning users live? `session-guard.js` runs first on every game-page load and already touches storage, which makes it the natural host — but it is deliberately minimal and blocking, and its current job is purely to decide whether to redirect. Widening its responsibility to include storage hygiene may be the right call or may be worth keeping separate.
- How long should the cleanup code stay in the codebase? It is only needed until the existing user population has cycled through. Worth deciding now whether it is permanent or gets a removal date, so it does not linger as unexplained code.
- Should this change be paired with advising affected users to rotate their password? Anyone whose machine was already compromised has had the credential exposed, and removing it now does not undo that. This is a product/comms decision, not a code one.
- The backend also accepts these credentials. Worth confirming separately whether `rave-mom-api` logs request bodies on the login route, since that would be the same exposure in a different place and outside this repo's control.
- Should `username` persistence be revisited at the same time? It is not a credential and the welcome message depends on it, so it is likely fine, but it is the only other user-identifying value being stored.
