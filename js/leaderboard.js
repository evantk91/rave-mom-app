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
    markTruncatedNames()
}

// css/leaderboard.css truncates a name too long for its column to an ellipsis.
// The characters are still in the DOM, just not on screen, so a tooltip is what
// gets them back — but only for the names that are actually cut off, or every
// short name would answer a hover with a tooltip repeating itself.
//
// `scrollWidth > clientWidth` is that test, and it's only answerable once the
// row has been laid out, which is why this can't live in appendScore.
//
// It's re-run rather than done once because the answer changes: Press Start 2P
// is wider than the fallback the first paint may use, so the real font clips
// names the fallback didn't, and the column's width moves with the viewport.
function markTruncatedNames() {
    leaderboard.querySelectorAll(".score-username").forEach(name => {
        if (name.scrollWidth > name.clientWidth) {
            name.title = name.textContent
        } else {
            name.removeAttribute("title")
        }
    })
}

// Both of these can fire before there are any rows to measure — the fetch is
// slow and the font may already be cached — and both are harmless then: the
// pass finds nothing, and the one at the end of displayScores covers it.
document.fonts.ready.then(markTruncatedNames)
window.addEventListener("resize", markTruncatedNames)

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
    points.textContent = score.score
    scoreItem.append(username, points)
    leaderboard.appendChild(scoreItem)
}

function clearLeaderboard(leaderboard) {
    while(leaderboard.firstChild) {
        leaderboard.removeChild(leaderboard.firstChild);
    }
}
