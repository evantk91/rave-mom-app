const welcomeMessage = document.querySelector("#welcome-message")
const logOutButton = document.querySelector("#user-logout");
const leaderboardButton = document.querySelector("#leaderboard-button");
const leaderboardContainer = document.querySelector("#leaderboard-container");
const leaderboardClose = document.querySelector("#leaderboard-close");
const leaderboard = document.querySelector("#leaderboard")

const scoresURL = "https://rave-mom-api.onrender.com/api/v1/scores"

welcomeMessage.textContent = `Welcome ${localStorage.getItem("username")}`

logOutButton.addEventListener("click", event => {
    localStorage.clear();
    window.location.href = "login.html"
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
    leaderboardButton.style.display = "block"
})

function parseJSON(response) {
    return response.json()
}

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
