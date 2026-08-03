// Every backend URL the frontend knows about. The host was written out five
// times across three files, so changing backends meant finding all five and
// getting all five right — and js/gamescene.js held two of them, in separate
// bomb handlers that are easy to update one of and miss the other.
//
// Each path is built from API_BASE rather than repeated in full, so the host
// appears exactly once in the codebase.
//
// This is still hardcoded, not configuration: there's no build step to
// substitute an environment value, and a fetch from the browser needs a URL it
// can reach, so a local backend means editing this line. That's the whole cost
// now, and it's one line rather than five.
//
// Loaded on all three pages, ahead of anything that fetches.
const API_BASE = "https://rave-mom-api.onrender.com/api/v1";

const API = {
    users: `${API_BASE}/users`,     // POST — signup
    login: `${API_BASE}/login`,     // POST — returns the session token
    scores: `${API_BASE}/scores`    // GET the top ten, POST a finished game
};
