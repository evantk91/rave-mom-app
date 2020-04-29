const userSignUp = document.querySelector("#new-user-signup")
const signUpMessage = document.querySelector("#sign-up-message")
const usersURL = "https://rave-mom-app.herokuapp.com/api/v1/users"

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

    fetch(usersURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })

    signUpMessage.textContent = `ya signed up, ${user.user.username}`
})

const userLogin = document.querySelector("#user-login")
const userLoginButton = document.querySelector("#user-login-submit")
const navCardContainer = document.querySelector("#nav-card-container")
const gameContainer = document.querySelector("#game-container")
const welcomeMessage = document.querySelector("#welcome-message")
const leaderboard = document.querySelector("#leaderboard")

const loginURL = "https://rave-mom-app.herokuapp.com/api/v1/login"

userLogin.addEventListener("submit", event => {
    event.preventDefault()

    const formData = new FormData(event.target)

    const user = {
        username: formData.get("username"),
        password: formData.get("password")
    }

    localStorage.setItem("username", user.username)
    localStorage.setItem("password", user.password)

    fetch(loginURL, {
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
    if(localStorage.getItem("token") !== "undefined") {
        gameContainer.style.display = "flex"
        navCardContainer.style.display = "none"
        welcomeMessage.textContent = `Welcome ${user.username}`
    }
}

const logOutButton = document.querySelector("#user-logout");
const dashboard = document.querySelector("#dashboard");
const canvasContainer = document.querySelector("#canvas-container");
const leaderboardButton = document.querySelector("#leaderboard-button");
const leaderboardContainer = document.querySelector("#leaderboard-container");
const leaderboardClose = document.querySelector("#leaderboard-close");

const scoresURL = "https://rave-mom-app.herokuapp.com/api/v1/scores"

logOutButton.addEventListener("click", event => {
    localStorage.removeItem("token");
    gameContainer.style.display = "none";
    navCardContainer.style.display = "flex"
    clearLeaderboard(leaderboard);
    leaderboardButton.style.display = "flex"
})

leaderboardButton.addEventListener("click", event => {
    clearLeaderboard(leaderboard);
    leaderboardContainer.style.display = "block"
    fetch(scoresURL, {
        headers: {
            "Authorization": `bearer ${localStorage.getItem("token")}`
        }
    })
    .then(parseJSON)
    .then(response => displayScores(response))
})

leaderboardClose.addEventListener("click", event => {
    leaderboardContainer.style.display = "none"
    leaderboardButton.style.display = "flex"
})

function displayScores(response) {
    let topScores = topTenScores(response)
    topScores.map(score => appendScore(score))
    leaderboardButton.style.display = "none"
}

function topTenScores(scores) {
    let sortedScores = scores.sort((a, b) => (b.score - a.score))
    let topScores = sortedScores.slice(0, 10)
    return topScores
}

function appendScore(score) {
    let scoreItem = document.createElement('li')
    scoreItem.innerHTML = `<h1>${score.user.username} ${score.score}</h1>`
    leaderboard.appendChild(scoreItem)
}

function clearLeaderboard(leaderboard) {
    while(leaderboard.firstChild) {
        leaderboard.removeChild(leaderboard.firstChild);
    }
}