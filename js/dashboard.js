const welcomeMessage = document.querySelector("#welcome-message")
const logOutButton = document.querySelector("#user-logout");
const leaderboardButton = document.querySelector("#leaderboard-button");

welcomeMessage.textContent = `Welcome ${localStorage.getItem("username")}`

logOutButton.addEventListener("click", event => {
    localStorage.clear();
    window.location.href = "login.html"
})

leaderboardButton.addEventListener("click", event => {
    window.location.href = "leaderboard.html"
})
