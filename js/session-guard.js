// Runs before anything else on index.html and leaderboard.html: if there's no
// valid session, bounce to the login page before Phaser, the game scripts, or
// any page content ever load.
// Wrapped in an IIFE so these locals never collide with the globals the
// other scripts on this page share.
(function() {
    const token = localStorage.getItem("token")
    const userId = localStorage.getItem("user_id")

    const missing = value => value === null || value === "undefined"

    if(missing(token) || missing(userId)) {
        window.location.replace("login.html")
    }
})()
