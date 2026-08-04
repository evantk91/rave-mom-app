const userLogin = document.querySelector("#user-login")
const userSignUp = document.querySelector("#new-user-signup")

const loginError = document.querySelector("#login-error")
const signUpError = document.querySelector("#signup-error")

const showSignUpButton = document.querySelector("#show-signup")
const showLoginButton = document.querySelector("#show-login")

const passwordToggles = document.querySelectorAll(".password-toggle")

localStorage.clear()

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

userSignUp.addEventListener("submit", event => {
    event.preventDefault()
    signUpError.textContent = ""

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
        // Success has no message of its own: landing on the login form says it,
        // and puts the player on the next thing they have to do rather than on
        // a sentence about what they just did. Signup still never navigates
        // into the game — that stays a separate, deliberate login.
        if(response.error === undefined) return showView("login")

        failSignUp()
    })
    .catch(failSignUp)
})

userLogin.addEventListener("submit", event => {
    event.preventDefault()
    loginError.textContent = ""

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
        if(response.token === undefined) return failLogin()

        storeSession(response, user.username)
        window.location.href = "index.html"
    })
    .catch(failLogin)
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
