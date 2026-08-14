# Migrate auth + scores from Rails/Render to Firebase Auth + Firestore

## Context

`rave-mom-app`'s auth and score persistence currently live in a separate Rails backend, `rave-mom-api`, hosted on Render's free tier. Render's free tier spins the instance down when idle, so the first request after a lull can take 20+ seconds — `js/login.js` has a whole prewarm/pending/"still waking the server" apparatus built specifically to paper over that. The site is already on Firebase Hosting for the frontend; moving auth and scores onto Firebase Auth + Firestore puts everything on one platform, eliminates the cold-start problem entirely (no more prewarm/waking machinery needed), and lets `rave-mom-api` be decommissioned.

Locked-in decisions (already made with the user, not open for revisiting):
- **Login switches from username to email** (Firebase Auth's native identifier). Signup still collects a username too, for leaderboard display — stored as the Firebase Auth user's `displayName`.
- **Both auth and scores** move to Firebase (not just one).
- Firebase project `rave-mom` exists (used for Hosting today) but **Firestore and the Auth email/password provider are not yet enabled** on it.
- Firebase **compat SDK** via CDN `<script>` tags (not the modular ES-module SDK) — matches this codebase's deliberate "global scripts, no bundler, load order matters" architecture (see `gameState` in `js/game.js`).
- No `users` Firestore collection — username is denormalized onto each score doc from `currentUser.displayName` at write time, avoiding a second collection/read.

`rave-mom-api` is a separate repo and is **not edited** here — it gets decommissioned only after this cutover is verified live.

## 1. Firebase project setup (manual, must happen before anything can be tested)

Console-only (no CLI/MCP path exists for this): **Console → `rave-mom` → Authentication → Sign-in method → enable Email/Password.**

Console or `gcloud` (pick one): **Firestore Database → Create database → Native mode**, any location. (`gcloud firestore databases create --database='(default)' --location=<LOCATION> --type=firestore-native --project=rave-mom` if scripting it; check `firebase firestore:databases:list` first to see if the installed CLI supports this too.)

CLI-doable, from this repo:
```
firebase apps:create WEB "Rave Mom Web" --project rave-mom
firebase apps:sdkconfig WEB <APP_ID_FROM_ABOVE> --project rave-mom
```
The second command prints the exact `apiKey`/`authDomain`/`projectId`/`storageBucket`/`messagingSenderId`/`appId` values for `js/firebase-init.js` below — no manual console copy-paste needed.

**Nothing below can be end-to-end tested until the Email/Password provider and Firestore database both exist.**

## 2. New `js/firebase-init.js`

Blocking (non-`defer`), loaded after the Firebase compat SDK `<script>` tags and before `js/session-guard.js` on every page:

```js
const firebaseConfig = {
    apiKey: "...",
    authDomain: "rave-mom.firebaseapp.com",
    projectId: "rave-mom",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};
firebase.initializeApp(firebaseConfig);
```
These values are public client identifiers (protected by Firestore rules, not secrecy) — same posture as the current hardcoded `API_BASE` in `js/api.js`, which this file replaces.

## 3. `login.html`

Add Firebase Auth compat CDN scripts + `js/firebase-init.js` (blocking, before `js/login.js`, no Firestore compat needed on this page) in place of the `js/api.js` tag.

- `#user-login` form: replace the `username` input with `type="email" name="email" autocomplete="email"`.
- `#new-user-signup` form: keep `username`, add an `email` input (`autocomplete="email"`), bump password `minlength` from `5` to `6` (Firebase Auth's server-side minimum — `5` currently passes HTML validation but would be rejected as `auth/weak-password`).
- Keep `#login-status`/`#signup-status` elements — they still carry the reduced-motion "logging in..." fallback text, just not the Render "waking" text.
- Extend the `-webkit-autofill` selector in `css/login.css` to include `input[type="email"]` alongside the existing `type="text"`/`type="password"` — easy to miss since autofill styling only shows up with a *saved* credential, not by typing.

## 4. Rewrite `js/login.js`

- Drop `WAKING_MESSAGE_MS`, the prewarm `fetch(API.scores).catch(()=>{})`, and the waking-timer half of `pendingFor` — all Render-specific. Keep `SHOW_DELAY_MS` and the rest of the pending/indicator machinery; real network latency for the Auth call still exists.
- Drop `localStorage.clear()`, `storeSession()`, `parseJSON()` — nothing reads `localStorage` anymore; Firebase Auth owns session persistence itself.
- Signup handler: `firebase.auth().createUserWithEmailAndPassword(email, password)` → `.updateProfile({displayName: username})` → `.signOut()` (Firebase auto-signs-in on account creation; this app deliberately does *not* auto-navigate after signup, so the auto-sign-in must be undone) → `showView("login")`.
- Login handler: `firebase.auth().signInWithEmailAndPassword(email, password)` → navigate to `index.html` on success.
- Replace the generic `"login failed"`/`"signup failed"` strings with a small `AUTH_ERROR_MESSAGES` map keyed by Firebase error codes (`auth/wrong-password`, `auth/user-not-found`, `auth/email-already-in-use`, `auth/weak-password`, `auth/network-request-failed`, etc.), falling back to `error.message` for anything unmapped.

## 5. Rewrite `js/session-guard.js`

The old version is a synchronous `localStorage` check; Firebase's `onAuthStateChanged` is inherently async (resolves from IndexedDB). Replacement, still the literal first blocking `<head>` script (now after the Firebase SDK tags + `firebase-init.js`, which it depends on):

```js
(function() {
    document.documentElement.style.visibility = "hidden"
    let unsubscribe
    window.authReady = new Promise(resolve => {
        unsubscribe = firebase.auth().onAuthStateChanged(user => {
            unsubscribe()   // one-time check, matching the old semantics — not a live monitor
            if(user === null) {
                window.location.replace("login.html")
                return
            }
            document.documentElement.style.visibility = ""
            resolve(user)
        })
    })
})()
```

Every script that needs a confirmed session waits on `window.authReady` instead of assuming the check already ran:
- `js/game.js`: wrap only the last line — `authReady.then(() => { const game = new Phaser.Game(config); })`. (Confirmed via grep: nothing outside `js/game.js` references the `game` variable, so this is safe.) `gameState`/`config` stay outside the `.then`.
- `js/dashboard.js` and `js/leaderboard.js`: same pattern (below).

**Add a safety-net timeout** (new, not in the old code, needed because the old sync check had zero external dependencies and this one now has three: CDN load → SDK init → IndexedDB resolution): if `authReady` hasn't settled within ~8s, reveal the page with a "couldn't reach the login service" message rather than leaving it permanently blank — guards against a blocked/failed Firebase CDN request (ad blockers occasionally hit `gstatic.com`).

## 6. Rewrite `js/leaderboard.js`

Add Firestore compat CDN script (this page needs it now) + `firebase-init.js`, drop `js/api.js`. Replace the `fetch(API.scores,...)` call with:
```js
authReady.then(() => {
    firebase.firestore().collection("scores").orderBy("score", "desc").limit(10).get()
        .then(snapshot => displayScores(snapshot.docs.map(doc => doc.data())))
        .catch(() => displayScores([]))
})
```
Drop `parseJSON` and the client-side `topTenScores` sort/slice (Firestore's query does both server-side now). Change `appendScore` from `score.user.username` to `score.username` (denormalized model — no more join). `markTruncatedNames`/`clearLeaderboard`/`appendScore`'s DOM shape and the font/resize re-run logic are otherwise unchanged.

## 7. Rewrite `js/dashboard.js`

`index.html`'s `<head>` gets the full Auth+Firestore compat trio + `firebase-init.js` + `session-guard.js` (dashboard.js and leaderboard.js both need Firestore since gamescene.js writes to it too).

```js
authReady.then(user => {
    welcomeMessage.textContent = `Welcome ${user.displayName}`
})

logOutButton.addEventListener("click", event => {
    firebase.auth().signOut().then(() => { window.location.href = "login.html" })
})
```
Drop `localStorage.clear()` from the logout handler — `signOut()` is what actually ends the session now.

## 8. `js/gamescene.js` — both score-write sites (bomb1 and bomb2 `animationcomplete` handlers)

Replace the `fetch(API.scores, {...})` POST in each with:
```js
const currentUser = firebase.auth().currentUser
if(currentUser) {
    firebase.firestore().collection("scores").add({
        uid: currentUser.uid,
        username: currentUser.displayName,
        score: gameState.score,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {})
}
```
Stays fire-and-forget with respect to game logic (matching the original — nothing in the game-over sequence was ever gated on the POST completing, and no "failed to save" UX exists or is being added). The bare `.catch(() => {})` is a small deliberate addition beyond parity, justified by `CLAUDE.md`'s own existing rule for the login prewarm fetch: a failure the player can't act on shouldn't produce console noise.

## 9. Delete `js/api.js` and `js/clear-stored-password.js`

Remove their `<script>` tags from all three HTML files. `clear-stored-password.js`'s job (scrubbing a stray `password` localStorage key from the pre-fix Rails era) is now moot twice over: nothing in the new code ever writes that key, and `session-guard.js` no longer reads `localStorage` at all.

## 10. New `firestore.rules` + `firestore.indexes.json`

`firestore.rules` — single `scores` collection, append-only, self-attributed:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.username == request.auth.token.name
                    && request.resource.data.score is int
                    && request.resource.data.score >= 0
                    && request.resource.data.createdAt == request.time
                    && request.resource.data.keys().hasOnly(['uid', 'username', 'score', 'createdAt']);
      allow update, delete: if false;
    }
  }
}
```
Checking `username == request.auth.token.name` (not just "any non-empty string") blocks a signed-in player from writing a truthful `uid` but a spoofed username onto the public leaderboard.

`firestore.indexes.json` — empty scaffold (`{"indexes": [], "fieldOverrides": []}`); the single `orderBy('score','desc')` query needs no composite index, Firestore's automatic single-field index covers it.

## 11. `firebase.json`

Add a `firestore` block pointing at the two new files, and add `firestore.rules`/`firestore.indexes.json` to the hosting `ignore` list explicitly — neither matches the existing dot-glob patterns, so without this the rules source ships as a public static file.

**File-count tripwire**: −2 (`api.js`, `clear-stored-password.js`) +1 (`firebase-init.js`) ⇒ 77 → 76 by arithmetic, but confirm against an actual `firebase deploy` output rather than trusting the math, per `CLAUDE.md`'s own warning about this ignore-list interacting non-obviously.

## 12. `CLAUDE.md` / `README.md` updates needed (rewrite, don't just patch)

Sections now false and needing a rewrite: Project overview (backend description), Running the project (drop the `rave-mom-api`/`bundle install`/`rails s` step), Architecture → Frontend/backend split (entire section), the password-never-persisted and `clear-stored-password.js` paragraphs (delete), Page split & session flow, Login page form toggle (username/password duplication claim), Login page pending state (drop Render-specific framing, keep the surviving pending-UI mechanics), Stylesheets (autofill note gains `type="email"`), Script load order in index.html (full rewrite), Gameplay section's "score POSTed" language. `README.md` has the same Rails/Ruby drift and should be updated in the same pass.

## Verification (manual — no test suite exists in this repo)

1. Confirm §1's console setup is done and `firebase-init.js` has real (non-placeholder) config; run `firebase deploy --only firestore`.
2. Sign up (email/username/password ≥6 chars) → confirm switch to login view with no error.
3. Confirm **not** auto-logged-in: navigating straight to `index.html` should redirect to `login.html`.
4. Log in with that email/password → lands on `index.html`, `#welcome-message` shows the signup username.
5. Play to a game over → confirm existing game-over UX (score text, animation, buttons) is unchanged.
6. Check Firebase Console → Firestore → `scores` collection for a new doc with correct `uid`/`username`/`score`/`createdAt`.
7. Leaderboard shows the new score, correctly sorted/truncated.
8. Log out → redirects to `login.html`.
9. Logged-out direct navigation to `index.html`/`leaderboard.html` redirects to `login.html`, no flash of game content.
10. Adversarial check: while signed in, from devtools console try writing a score doc with a spoofed `username` — confirm Firestore rejects it (`PERMISSION_DENIED`), validating the rule in §10.
11. `firebase deploy`, confirm reported file count, confirm `curl -s -o /dev/null -w "%{http_code}" https://rave-mom.web.app/firestore.rules` returns `404`.
12. Only after this has soaked in production: decommission `rave-mom-api` (separate repo, out of scope here).

## Known gaps flagged, not auto-fixed

- Blocking CDN dependency chain on every `index.html`/`leaderboard.html` load is a new failure mode the old sync `localStorage` check didn't have (§5's safety-timeout addresses it).
- Legacy `localStorage` keys (`token`/`user_id`/`username`/`password`) from the Rails era will linger inertly in returning users' browsers since nothing clears them anymore — optional low-priority cleanup, not part of this migration.
- SDK CDN version should be pinned to the same version across all HTML files at implementation time (plan uses `10.13.2` as a working example — check for current at execution time).
