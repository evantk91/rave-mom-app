// One-off cleanup for users who logged in before login.js stopped storing the
// password. Removing the write only helps new logins; anyone already carrying a
// `password` key keeps it until they next hit the login page or log out, which
// a user who simply stays logged in may never do. This runs on the pages a
// logged-in user actually lands on and clears the key out from under them.
//
// Deliberately narrow: it removes one key and touches nothing else, so the
// session (token, user_id, username) and any game in progress are unaffected.
//
// Temporary by design — once the existing user population has cycled through,
// this file and its two script tags can be deleted.
(function() {
    try {
        localStorage.removeItem("password")
    } catch (error) {
        // Storage can throw in private browsing, with site data disabled, or on
        // quota errors. This is opportunistic hygiene, not something worth
        // breaking the page over, so swallow it and let the session continue.
    }
})()
