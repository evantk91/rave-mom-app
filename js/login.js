const userSignUp = document.querySelector("#new-user-signup")
const signUpMessage = document.querySelector("#sign-up-message")

localStorage.clear()

userSignUp.addEventListener("submit", event => {
    event.preventDefault()

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
    .then(displaySignUpMessage)
})

function displaySignUpMessage(response) {
    if(response.error === undefined) {
        signUpMessage.textContent = "Ya, Signed Up!"
    } else {
        signUpMessage.textContent = "User Already Exists"
    }
}

const userLogin = document.querySelector("#user-login")

userLogin.addEventListener("submit", event => {
    event.preventDefault()

    const formData = new FormData(event.target)

    const user = {
        username: formData.get("username"),
        password: formData.get("password")
    }

    // Only the username is persisted. The password goes in the request body
    // below and is never stored: nothing reads it back, and a stored password
    // is a far worse thing to leak than a revocable token.
    localStorage.setItem("username", user.username)

    fetch(API.login, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
    .then(parseJSON)
    .then(storeToken)
    .then(redirectToGame)
})

function parseJSON(response) {
    return response.json()
}

function storeToken(response) {
    localStorage.setItem("token", response.token)
    localStorage.setItem("user_id", response.user_id)
}

function redirectToGame() {
    if(localStorage.getItem("token") !== "undefined") {
        window.location.href = "index.html"
    }
}
