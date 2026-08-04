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

// Name and score are separate elements so css/leaderboard.css can put them in
// two columns and line the scores up down the panel. As one interpolated
// string they were a single text run, and nothing could align the second half.
//
// They're built with textContent rather than innerHTML because a username is
// arbitrary text the account holder chose, and this string used to be parsed
// as markup on every visitor's leaderboard.
function appendScore(score) {
    let scoreItem = document.createElement('li')
    let username = document.createElement('span')
    let points = document.createElement('span')
    username.className = "score-username"
    points.className = "score-points"
    username.textContent = score.user.username
    // A name too long for the column is truncated to an ellipsis by
    // css/leaderboard.css, so carry the whole one in the tooltip.
    username.title = score.user.username
    points.textContent = score.score
    scoreItem.append(username, points)
    leaderboard.appendChild(scoreItem)
}

function clearLeaderboard(leaderboard) {
    while(leaderboard.firstChild) {
        leaderboard.removeChild(leaderboard.firstChild);
    }
}
