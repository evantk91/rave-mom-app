# Spec for separate-leaderboard-page

branch: claude/feature/separate-leaderboard-page

## Summary
The game page is crowded. `#game-container` lays its children out in a row, so opening the leaderboard adds a third 30%-wide column inline beside the dashboard and the canvas, squeezing the game rather than overlaying it. This spec covers moving the leaderboard onto its own page, so the game page holds only the dashboard and the canvas, and the Leaderboard button navigates to the leaderboard instead of expanding a panel in place.

Because navigating away unloads Phaser and discards an in-progress game, the Leaderboard button is only offered after a game over — it is hidden on the start menu and during active play, and appears once the knocked-out animation has finished. The Log Out button follows the same rule, so the dashboard shows no buttons at all while a game is live. The dashboard column is also squared up to match the game canvas in both width and height, and the leaderboard's panel on its new page adopts those same dimensions, so every panel across the site is one consistent size. How any of this behaves as the window is resized is deliberately out of scope and will be handled in a later spec.

Doing this also resolves duplication that exists today: leaderboard fetch-and-render logic lives both at the top level of `dashboard.js` and again as near-identical private copies inside `gamescene.js`'s `create()`, and `gamescene.js` reaches across global scope for `dashboard.js`'s `leaderboard` and `scoresURL` bindings in order to refresh the panel on click-to-play-again. With the panel gone from the game page, that in-game leaderboard code is removed rather than shared.

Alongside the page split, the single `game.css` stylesheet — which currently serves both `login.html` and `index.html`, holding auth rules and game rules together — is split into a shared `shared.css` plus one stylesheet per page, so each page loads the shared base styles plus only its own rules. Beyond the button visibility rules and the dashboard size match, no redesign of the dashboard's welcome message, rules, or button styling is in scope.

## Functional Requirements
- A new `leaderboard.html` page is created, showing the same top-ten scores the current panel shows, fetched from the same backend endpoint with the same authorization header.
- The leaderboard stays a plain top-ten list as it is today; showing the signed-in player's own score or rank is explicitly deferred to a later change.
- The leaderboard's container on its own page uses the same dimensions as the game canvas, matching the dashboard, so all three panels across the site are the same size rather than the leaderboard being a narrow side column or a full-bleed page.
- The leaderboard panel is centered on its page, rather than sitting in the left-hand position the dashboard occupies on the game page.
- Because the dashboard, the canvas, and the leaderboard now share one set of dimensions, that sizing is expressed once in the shared stylesheet rather than repeated per page.
- If the score list is taller than the shared panel height, the list scrolls within the panel; the panel itself does not grow beyond the shared dimensions.
- The Leaderboard button on the game page navigates to the leaderboard page instead of revealing an inline panel.
- The Leaderboard button is hidden when the game page first loads and stays hidden through the start menu and active gameplay.
- The Leaderboard button becomes visible once the player's knocked-out animation has finished playing, not at the instant of death.
- The Leaderboard button is hidden again when the player restarts, so it is never available during a live game.
- The Log Out button follows the same visibility rules as the Leaderboard button: hidden on load, through the start menu, and during active play, shown once the knocked-out animation finishes, and hidden again on restart.
- While a game is live the dashboard therefore shows no buttons at all, leaving only the welcome message and the rules.
- Both buttons reserve their space in the dashboard while hidden, so the surrounding content stays put rather than re-centering when they appear and disappear.
- The existing game-over prompt text is left as it is; the buttons appearing is the only new signal.
- Because both buttons live in the dashboard markup while the game-over state is owned by the game scene, showing and hiding them requires a defined hand-off between the scene and the page chrome, rather than the scene reaching into another script's globals as it does today.
- The dashboard column's height matches the height of the game canvas, with their tops and bottoms aligned, rather than the two columns running to unrelated heights as they do today.
- The dashboard column's width matches the width of the game canvas, replacing its current percentage-based width, so the two columns are equally sized.
- The dashboard's dimensions stay fixed to the canvas regardless of how many buttons are currently visible, so the column does not grow, shrink, or shift the canvas when the buttons appear on game over and disappear on restart.
- Responsive and resize behavior is explicitly out of scope for this spec: the dashboard and canvas need to match at the normal desktop viewport the game is played at, and how the pairing degrades on smaller or resized windows is deferred to a later spec.
- The panel's existing Close button becomes a "Return to Game" button that navigates back to the game page; that button is the leaderboard page's only control, with no welcome message or Log Out button on the page.
- The inline leaderboard markup is removed from the game page, so the game page renders only the dashboard column and the canvas, and the canvas is no longer competing with a third column for width.
- The leaderboard fetch, sort, top-ten trim, list render, and list clear logic lives in exactly one place, used by the leaderboard page.
- The duplicated leaderboard helper functions inside `gamescene.js`'s `create()` are removed, along with the click-to-play-again leaderboard refresh, since there is no longer a leaderboard on the game page to refresh.
- `gamescene.js` no longer depends on `dashboard.js` declaring top-level `leaderboard` and `scoresURL` bindings with those exact names.
- `dashboard.js` retains its welcome message and logout responsibilities, with its leaderboard fetch/render/close responsibilities removed.
- Restarting after a game over continues to work: score resets, the scene restarts, and the player can play again.
- Score submission on game over continues to POST to the backend exactly as it does today.
- The leaderboard page is session-protected the same way the game page is: visiting it without a valid session redirects to the auth page, without a flash of leaderboard content.
- The leaderboard page does not clear `localStorage` on load — that behavior belongs only to the auth page.
- If the scores request fails, returns unauthorized, or returns nothing, the page renders an empty list rather than an error state; dedicated error and empty-state messaging is deferred to a later change. It must not throw an unhandled error or leave the page broken.
- Today's `game.css` is split into `shared.css`, holding rules common to all pages (page/body basics, background, the shared panel dimensions, button styling, form fields, the pixel typography), plus one stylesheet per page.
- The page stylesheets are `login.css` for `login.html`, `game.css` for the game page, and `leaderboard.css` for `leaderboard.html`. `game.css` keeps its name but narrows to game-page rules only, and is deliberately named for the page's role rather than its `index.html` filename.
- Each page loads only the shared stylesheet plus its own page stylesheet; no page pulls in rules for a page it isn't.
- Both existing pages render visually the same as they do today after the stylesheet split, apart from the game page no longer having a leaderboard column.
- Logging out continues to return the user to the auth page.

## Possible Edge Cases
- A player who dies, views the leaderboard, and returns to the game lands on the start menu rather than the game-over prompt, and their score display resets.
- The player dies, the button appears, and they click to play again instead of viewing the leaderboard — the button must disappear rather than linger into the new game.
- The player dies and the button appears, then the page sits idle before they click anything.
- Clicking the Leaderboard button must not also register as the click-to-play-again input; the button sits in the DOM outside the canvas, so this depends on the game's pointer handling staying scoped to the canvas.
- Repeated death-and-restart cycles in a single page load, with both buttons toggling visibility each time.
- With both buttons hidden during play, there is no way to log out mid-game — the player has to finish a game first. This is the intended consequence of the rule, but it means a player who wants to leave must either die or reload the page.
- Any styling that assumes the buttons are always present in the dashboard column, given they now start hidden while still occupying their space.
- The knocked-out animation may already have a completion handler in the game-over path; hooking button reveal to it must not disturb the existing restart wiring or fire twice across repeated deaths.
- The game canvas is a fixed 518x632 with padding and a border, while the dashboard sits in a full-height flex row with its own margins and border, so matching the two has to account for each one's padding and borders rather than just the canvas's configured pixel size.
- The rules text is currently sized for a percentage-width column; at a fixed width matched to the canvas it may wrap differently or run taller than it does today.
- Sizing the dashboard to the canvas at the normal desktop viewport may look wrong at other window sizes — accepted for this spec, and deferred to the follow-up spec on resize behavior.
- The leaderboard page loaded directly by URL, bookmark, or a second tab without a valid session.
- A stale or expired token in `localStorage` when the leaderboard page fetches scores — the session guard only checks that a token exists, so an expired one still reaches the fetch and comes back unauthorized. Empty list is the accepted outcome for now, but it must not throw.
- The scores request failing or the backend being cold/slow (the API is hosted on a free tier that sleeps) — the page shows an empty list, which is indistinguishable from there being no scores. Accepted for this pass.
- Zero scores returned, or fewer than ten scores — the page should still render sensibly.
- Splitting one stylesheet into several can change cascade or specificity outcomes if the link order across the new files doesn't preserve the original rule order.
- Rules that currently only apply because both pages loaded the same file may be dropped from a page that still needs them, or duplicated into both shared and page stylesheets.
- The leaderboard's existing styling assumes a narrow 30% column and a hidden-by-default container; it needs to become visible by default and sized to the shared panel dimensions.
- Ten score entries in the pixel typeface, plus the title and the Return to Game button, may not fit inside a container fixed to the canvas's height — the list scrolls inside the panel when that happens, so the scroll region must be the list itself and not swallow the title or the button.
- Scores with long usernames or large values may wrap or overflow horizontally now that the container is a fixed width rather than a percentage.
- Browser back/forward navigation between the game page and the leaderboard page.
- Returning visitors may have the old stylesheet cached.
- Removing the leaderboard refresh from `gamescene.js` must not disturb the surrounding game-over and restart handling in the same block.

## Acceptance Criteria
- The game page never renders a leaderboard column; with the leaderboard gone, the dashboard and canvas are the only two columns, and the canvas is no longer squeezed.
- Neither the Leaderboard nor the Log Out button is visible on page load, on the start menu, or at any point during a live game — the dashboard shows only the welcome message and rules while playing.
- Both buttons appear once the knocked-out animation has finished, and both disappear again once the player clicks to play again, across repeated death-and-restart cycles.
- The dashboard's content does not shift position when the buttons appear or disappear, because their space is reserved while hidden.
- The dashboard column and the game canvas are the same width and the same height, and are aligned top and bottom.
- The leaderboard panel is centered on `leaderboard.html`, is the same size as the dashboard and the canvas, and a full top-ten list is legible within it — scrolling inside the panel if the list runs long, with the title and Return to Game button staying visible.
- The dashboard's dimensions and the canvas's position do not shift when the buttons appear or disappear.
- These layout criteria are judged at a normal desktop viewport; behavior at other window sizes is not in scope.
- Clicking Leaderboard after a game over navigates to the leaderboard page and shows the same top-ten scores the panel showed before this change.
- The Return to Game button navigates back to the game page, and no welcome message or Log Out button appears on the leaderboard page.
- With the backend unreachable or the token expired, the leaderboard page renders an empty list and throws no unhandled console errors.
- Loading the leaderboard page without a valid session redirects to the auth page with no flash of content.
- Full flow works end to end against the backend with no console errors: signup, login, redirect to the game, welcome message, gameplay, rave-girl scoring, laser death, score submission, the Leaderboard button appearing, navigating to the leaderboard and back, restart via click-to-play-again, and logout to the auth page.
- Searching the codebase for the leaderboard fetch/sort/render logic finds it in exactly one file, and `gamescene.js` contains no leaderboard code.
- No page loads CSS rules belonging to a different page, the stylesheets are `shared.css`, `login.css`, `game.css`, and `leaderboard.css`, and `game.css` no longer contains auth or leaderboard rules; the auth page and game page look the same as they do on `master` today, aside from the removed leaderboard column and the dashboard's new dimensions.
- Sprites, background images, and the favicon load correctly on all three pages.
- A `firebase deploy` from the repo root publishes all three pages and the deployed site behaves the same as the local one.
- `README.md` and `CLAUDE.md` describe the three-page structure, the stylesheet split, and the script load order accurately.

## Open Questions
- What should the leaderboard page be named, and does anything outside the app need to know about it (hosting config, README, links)? leaderboard.html
- Should the buttons appear instantly on death or after the knocked-out animation finishes, and should their appearance be called out in the game-over prompt text?  after knockout animation finishes
- Should the hidden buttons reserve their space in the dashboard while invisible, or collapse so the dashboard's other content re-centers during play? reserve their space
- With logout unavailable mid-game, is dying or reloading an acceptable way to leave, or should logout stay reachable some other way? We can address on future spec
- Should the leaderboard page show the signed-in player's own score or rank alongside the top ten, or stay a plain top-ten list as today? stay in current list, we can add user's top score later
- Should the leaderboard page carry the welcome message and logout button too, or only a link back to the game? Lets change the "close" button to a "return to game" button 
- What should the leaderboard page show when the scores request fails, returns unauthorized, or returns an empty list? lets just do empty list for now
- How should the stylesheets be named and organized — keep `game.css` for the game page and add siblings, or rename all of them under a consistent scheme? `shared.css` for common rules, then `login.css`, `game.css`, and `leaderboard.css` per page — `game.css` keeps its name even though its page is `index.html`
- Should the leaderboard's panel sit centered on its page, or in the same position the dashboard occupies on the game page? centered on its page
- If a full top-ten list overruns the shared panel height, should the list scroll inside the panel, or should spacing and type size be tightened to fit? lets implement a scroll in the panel
- Page stylesheets are named after their HTML page, but the shared stylesheet has no page to name it after — what should it be called? shared.css
