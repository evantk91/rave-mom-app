const userSignUp = document.querySelector("#new-user-signup")
const usersURL = "http://localhost:3000/api/v1/users"

localStorage.clear()

userSignUp.addEventListener("submit", event => {
    event.preventDefault()

    const formData = new FormData(event.target)

    const user = {
        username: formData.get("username"),
        password: formData.get("password")
    }

    fetch(usersURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
})

const userLogin = document.querySelector("#user-login")
const userLoginButton = document.querySelector("#user-login-submit")
const gameContainer = document.querySelector("#game-container")
const gameCanvas = document.getElementsByTagName("CANVAS")

userLogin.addEventListener("submit", event => {
    event.preventDefault()

    const formData = new FormData(event.target)

    const user = {
        username: formData.get("username"),
        password: formData.get("password")
    }

    fetch("http://localhost:3000/api/v1/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
    .then(parseJSON)
    .then(storeToken)
    .then(() => displayGame(user)) 

})

function parseJSON(response) {
    return response.json()
}

function storeToken(response) {
    localStorage.setItem("token", response.token)
    localStorage.setItem("user_id", response.user_id)
}

function displayGame(user) {
    if(localStorage.getItem("token")) {
        gameCanvas.style.display = "block"
        navCardContainer.style.display = "none"
    }
}