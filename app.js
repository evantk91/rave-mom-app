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
const navCardContainer = document.querySelector("#nav-card-container")
const gameContainer = document.querySelector("#game-container")
const welcomeMessage = document.querySelector("#welcome-message")

userLogin.addEventListener("submit", event => {
    event.preventDefault()

    const formData = new FormData(event.target)

    const user = {
        username: formData.get("username"),
        password: formData.get("password")
    }

    localStorage.setItem("username", user.username)

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

const logOutButton = document.querySelector("#user-logout");
const rulesButton = document.querySelector("#rules-button");
const rulesContainer = document.querySelector("#rules-container");
const closeButton = document.querySelector("#close-rules-button");
const dashboard = document.querySelector("#dashboard");
const canvasContainer = document.querySelector("#canvas-container");

logOutButton.addEventListener("click", event => {
    localStorage.removeItem("token");
    gameContainer.style.display = "none";
    navCardContainer.style.display = "flex"
})

rulesButton.addEventListener("click", event => {
    rulesContainer.style.display = "block";
    dashboard.style.display = "none";
    canvasContainer.style.display = "none";
})

closeButton.addEventListener("click", event => {
    rulesContainer.style.display = "none";
    dashboard.style.display = "flex";
    canvasContainer.style.display = "block";
})

function parseJSON(response) {
    return response.json()
}

function storeToken(response) {
    localStorage.setItem("token", response.token)
    localStorage.setItem("user_id", response.user_id)
}

function displayGame(user) {
    if(localStorage.getItem("token") !== "undefined") {
        gameContainer.style.display = "flex"
        navCardContainer.style.display = "none"
        welcomeMessage.textContent = `Welcome ${user.username}`
    }
}