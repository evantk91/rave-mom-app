const leaderboard = document.querySelector("#leaderboard")
const returnToGameButton = document.querySelector("#return-to-game")

returnToGameButton.addEventListener("click", event => {
    window.location.href = "index.html"
})

fetch(API.scores, {
    headers: {
        "Authorization": `bearer ${localStorage.getItem("token")}`
    }
})
.then(parseJSON)
.then(displayScores)
.catch(() => displayScores([]))

function parseJSON(response) {
    return response.json()
}

function displayScores(response) {
    // An expired token or a backend error responds with an object, not an
    // array, and sorting that would throw. Fall back to an empty list.
    const scores = Array.isArray(response) ? response : []
    clearLeaderboard(leaderboard)
    topTenScores(scores).map(score => appendScore(score))
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
