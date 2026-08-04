// The two timing values, together, because they're the pair anyone tuning this
// will reach for — the same reason js/touch-input.js keeps its own at the top.
//
// The delay exists because a warm instance can answer in under 200ms, and an
// indicator that appears and vanishes inside a couple of frames reads as a
// glitch rather than as progress. Delaying the *appearance* is safer than
// holding it on screen for a minimum: it can only ever shorten the
// interruption, never extend a wait that has already finished.
const SHOW_DELAY_MS = 250
const WAKING_MESSAGE_MS = 10000

// Read live rather than cached: the setting can be changed while the page is
// open, and `matches` is re-evaluated on every read.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

const userLogin = document.querySelector("#user-login")
const userSignUp = document.querySelector("#new-user-signup")

const loginError = document.querySelector("#login-error")
const signUpError = document.querySelector("#signup-error")

const showSignUpButton = document.querySelector("#show-signup")
const showLoginButton = document.querySelector("#show-login")

const passwordToggles = document.querySelectorAll(".password-toggle")

localStorage.clear()

// Starts Render waking while the player is still typing. The free tier spins the
// instance down when idle and the first request back is what wakes it, so firing
// one now can turn a 20-second submit into a short one.
//
// This is deliberately a tokenless GET to the scores endpoint, and the 401 it
// answers with is the expected result — the response is thrown away entirely.
// All that matters is that a request reached Render's router, which is what
// triggers the spin-up; a 401, a 404, or even a CORS rejection wakes it just as
// well as a 200 would. js/leaderboard.js fetches this same URL *with* a token
// as a real scores request, so this is not that.
//
// The catch is load-bearing: without it, every visit to this page can log an
// unhandled rejection for a request whose failure means nothing.
fetch(API.scores).catch(() => {})

// Which form is showing is a `signup-view` class on <body>: this file adds and
// removes it, css/login.css decides what it means. Neither side reaches into
// the other, the same way js/gamescene.js and css/game.css split `game-over`.
showSignUpButton.addEventListener("click", () => showView("signup"))
showLoginButton.addEventListener("click", () => showView("login"))

function showView(view) {
    document.body.classList.toggle("signup-view", view === "signup")

    // Typed values survive a toggle; a revealed password doesn't. The value is
    // the player's work, the reveal is a momentary choice that shouldn't
    // outlive the form it was made on.
    passwordToggles.forEach(maskPassword)

    // Without this the keyboard user is left on a control that just vanished,
    // and lands back at the top of the document on the next Tab.
    const form = view === "signup" ? userSignUp : userLogin
    form.querySelector("input").focus()
}

passwordToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
        passwordField(toggle).type === "password"
            ? revealPassword(toggle)
            : maskPassword(toggle)
    })
})

function passwordField(toggle) {
    return document.getElementById(toggle.getAttribute("aria-controls"))
}

// Switching `type` changes how the field draws and nothing else — the value is
// read from the form at submit time exactly as a masked one is, and is still
// never written anywhere. See the note on storeSession below.
function revealPassword(toggle) {
    passwordField(toggle).type = "text"
    toggle.setAttribute("aria-pressed", "true")
    toggle.setAttribute("aria-label", "hide password")
}

function maskPassword(toggle) {
    passwordField(toggle).type = "password"
    toggle.setAttribute("aria-pressed", "false")
    toggle.setAttribute("aria-label", "show password")
}

// One controller per form, so a login in flight can't touch the signup form's
// button and vice versa. Each closes over its own two timer handles.
//
// Every one of those timers has to be cleared on the way out. A survivor paints
// an indicator or a "still waking" line onto a form with nothing in flight, and
// the threshold one does it ten seconds late — long enough after the attempt
// that armed it to look like it came from nowhere.
function pendingFor(form, indicator, status) {
    let showTimer = null
    let wakingTimer = null

    return {
        active: false,

        start() {
            this.active = true

            showTimer = setTimeout(() => {
                form.classList.add("pending")
                indicator.hidden = false

                // With motion suppressed the bar is static, so it shows *that*
                // something is pending but no longer reads as ongoing work.
                // Text takes over that job. The indicator's own label is reused
                // rather than a second string, so the two can't drift apart.
                if(reducedMotion.matches) {
                    status.textContent = `${indicator.getAttribute("aria-label")}...`
                }

                // The CSS hides the submit button on this same class, and
                // `visibility: hidden` drops focus exactly as `display: none`
                // does. The player has usually just pressed Enter from the
                // password field or clicked the button itself, so left alone
                // focus lands on <body> and the next Tab restarts at the top of
                // the page. The indicator is the element describing the state,
                // so it is where focus belongs.
                indicator.focus()
            }, SHOW_DELAY_MS)

            // Past this point the indicator alone stops being enough: it says
            // something is happening but not why it's taking so long, and a
            // silent 30-second wait reads as a hang no matter what is animating.
            wakingTimer = setTimeout(() => {
                status.textContent = "still waking the server..."
            }, WAKING_MESSAGE_MS)
        },

        // Safe to call when nothing is pending — `pageshow` calls it on every
        // page view, and clearTimeout(null) is a no-op.
        stop() {
            this.active = false
            clearTimeout(showTimer)
            clearTimeout(wakingTimer)
            showTimer = null
            wakingTimer = null
            form.classList.remove("pending")
            indicator.hidden = true
            status.textContent = ""
        }
    }
}

const loginPending = pendingFor(
    userLogin,
    document.querySelector("#login-progress"),
    document.querySelector("#login-status")
)

const signUpPending = pendingFor(
    userSignUp,
    document.querySelector("#signup-progress"),
    document.querySelector("#signup-status")
)

// The back/forward cache restores this page with its DOM exactly as it was left,
// so after a successful login it would come back with no submit button and a bar
// still running. Nothing at the top level of this file re-runs on that restore —
// which is also why the localStorage.clear() above doesn't fire — so the reset
// needs its own hook. An ordinary load has nothing pending, making this a no-op
// there and not worth branching on `event.persisted`.
window.addEventListener("pageshow", () => {
    loginPending.stop()
    signUpPending.stop()
})

userSignUp.addEventListener("submit", event => {
    event.preventDefault()

    // A hidden submit button does not stop a form submitting — Enter in a text
    // field still fires this — so the guard lives here rather than relying on
    // the button being gone. It engages now, not after SHOW_DELAY_MS, so a fast
    // double-press is blocked during the window where nothing has visibly
    // changed yet.
    if(signUpPending.active) return

    signUpError.textContent = ""
    signUpPending.start()

    const formData = new FormData(event.target)

    const user = { user:
        {
            username: formData.get("username"),
            password: formData.get("password")
        }
    }

    fetch(API.users, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
    .then(parseJSON)
    .then(response => {
        // Released on both branches. On success the view switches away from this
        // form, and leaving it pending would mean toggling back later finds a
        // form with no submit button and a bar still animating on it.
        signUpPending.stop()

        // Success has no message of its own: landing on the login form says it,
        // and puts the player on the next thing they have to do rather than on
        // a sentence about what they just did. Signup still never navigates
        // into the game — that stays a separate, deliberate login.
        if(response.error === undefined) return showView("login")

        failSignUp()
    })
    .catch(() => {
        signUpPending.stop()
        failSignUp()
    })
})

userLogin.addEventListener("submit", event => {
    event.preventDefault()

    if(loginPending.active) return

    loginError.textContent = ""
    loginPending.start()

    const formData = new FormData(event.target)

    const user = {
        username: formData.get("username"),
        password: formData.get("password")
    }

    fetch(API.login, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
    .then(parseJSON)
    .then(response => {
        // A rejected credential answers without a token. Storing it anyway is
        // what used to put the string "undefined" into localStorage and then
        // quietly decline to navigate, leaving the player looking at a page
        // that had told them nothing at all.
        if(response.token === undefined) {
            loginPending.stop()
            return failLogin()
        }

        // Deliberately still pending on the way out. The work isn't finished
        // until the next page loads, and releasing here would flash the button
        // back for a frame on a page that's already leaving.
        storeSession(response, user.username)
        window.location.href = "index.html"
    })
    .catch(() => {
        loginPending.stop()
        failLogin()
    })
})

function parseJSON(response) {
    return response.json()
}

// Written here, on success, rather than before the request: a failed login used
// to leave the username behind with no token beside it.
//
// The password is in the request body and goes nowhere else — no localStorage,
// sessionStorage, or cookie, whether or not it was revealed on screen. A leaked
// token can be revoked; a password, reused across sites, cannot.
function storeSession(response, username) {
    localStorage.setItem("token", response.token)
    localStorage.setItem("user_id", response.user_id)
    localStorage.setItem("username", username)
}

// Both failures cover a rejected credential and a request that never completed
// — a wrong password and an unreachable backend read the same to the player,
// and both used to produce nothing at all. Neither says which half was wrong.
function failLogin() {
    loginError.textContent = "login failed"
}

function failSignUp() {
    signUpError.textContent = "signup failed"
}
