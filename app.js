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
const leaderboard = document.querySelector("#leaderboard")

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

function parseJSON(response) {
    return response.json()
}

function storeToken(response) {
    localStorage.setItem("token", response.token)
    localStorage.setItem("user_id", response.user_id)
    let topScores = topTenScores(response.scores)
    listScores(topScores)
}

function topTenScores(scores) {
    let sortedScores = scores.sort((a, b) => (a.score < b.score) ? 1 : -1)
    let topScores = sortedScores.slice(0, 10)
    return topScores
}

function listScores(scores) {
    scores.map(score => {
        let scoreItem = document.createElement('li')
        scoreItem.innerHTML = `<h1>${score.user_id} ${score.score}</h1>`
        leaderboard.appendChild(scoreItem)
    })
}

function displayGame(user) {
    if(localStorage.getItem("token") !== "undefined") {
        gameContainer.style.display = "flex"
        navCardContainer.style.display = "none"
        welcomeMessage.textContent = `Welcome ${user.username}`
    }
}

const logOutButton = document.querySelector("#user-logout");
const dashboard = document.querySelector("#dashboard");
const canvasContainer = document.querySelector("#canvas-container");

logOutButton.addEventListener("click", event => {
    localStorage.removeItem("token");
    gameContainer.style.display = "none";
    navCardContainer.style.display = "flex"
})

