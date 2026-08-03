// Diagnostics for the arrow-key controls. Inert until you switch it on —
// nothing here listens or logs unless you call one of these from the DevTools
// console (or load the page with ?debug=input, which starts both):
//
//   inputDebug.dom()    every arrow keydown/keyup the browser delivers
//   inputDebug.game()   what Phaser's Key objects and the player sprite did
//   inputDebug.off()    stop both
//
// The two exist separately because they answer different questions, and the
// answer decides whether there's a bug to fix at all. `dom()` listens on
// window and sees the raw events. If you hold two arrows, press a third, and
// `dom()` never logs it, the keyboard dropped that press before any of our
// code ran — arrow clusters on laptop and membrane keyboards frequently can't
// report three at once — and nothing in gamescene.js can recover a keypress
// the browser was never told about. If `dom()` logs the third key but `game()`
// shows it never took over, then it's ours.
//
// `game()` reports the sprite's *measured* velocity rather than recomputing
// which direction ought to have won. Re-deriving that rule here would leave a
// second copy of it free to drift out of step with update()'s — and a drifted
// copy would happily agree with itself while the game did something else.
(function() {
    const isArrow = key => typeof key === "string" && key.indexOf("Arrow") === 0;
    const shortName = key => key.slice(5);

    let domListeners = null;
    let gameFrame = null;

    function startDom() {
        if(domListeners) return;

        const held = new Set();
        const list = () => [...held].map(shortName).join("+") || "(none)";

        // e.repeat filters the OS's auto-repeat keydowns. They aren't new
        // presses, and Phaser ignores them for timeDown too, so logging them
        // would bury the transitions that actually matter under a stream of
        // duplicates.
        const onDown = event => {
            if(!isArrow(event.key) || event.repeat) return;
            held.add(event.key);
            console.log("[dom] DOWN", shortName(event.key).padEnd(6), "held:", list());
        };

        const onUp = event => {
            if(!isArrow(event.key)) return;
            held.delete(event.key);
            console.log("[dom] UP  ", shortName(event.key).padEnd(6), "held:", list());
        };

        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup", onUp);
        domListeners = { onDown, onUp };

        console.log("[dom] on — logs raw browser key events. inputDebug.off() to stop.");
    }

    function startGame() {
        if(gameFrame !== null) return;

        // Logs on change rather than on a timer: holding a key steady produces
        // one line, so what's left in the console is the transitions.
        let previous = null;

        const tick = () => {
            gameFrame = requestAnimationFrame(tick);

            // create() hasn't necessarily run — the game sits on the start menu
            // until you click, and GameScene builds cursors and the player only
            // after its preload finishes.
            //
            // The guard has to be typeof, not `window.gameState`. js/game.js
            // declares gameState as a top-level const in a classic script, so
            // it lands in the global lexical environment rather than on the
            // global object: every later script can see the name, but
            // window.gameState is undefined. Testing that property meant this
            // logger bailed on every frame and printed nothing from the day it
            // landed, while still reporting itself as on.
            if(typeof gameState === "undefined") return;

            const cursors = gameState.cursors;
            const player = gameState.player;
            if(!cursors || !player || !player.body) return;

            const names = ["up", "down", "left", "right"];
            const held = names.filter(name => cursors[name].isDown);
            const stamps = held.map(name => `${name}@${cursors[name].timeDown | 0}`).join(" ");
            const velocity = `(${Math.round(player.body.velocity.x)},${Math.round(player.body.velocity.y)})`;
            const anim = player.anims.currentAnim ? player.anims.currentAnim.key : "(none)";

            const line = `${(held.join("+") || "(none)").padEnd(20)} ${stamps.padEnd(48)} vel=${velocity.padEnd(12)} anim=${anim}`;
            if(line === previous) return;
            previous = line;

            console.log("[game]", line);
        };

        tick();
        console.log("[game] on — logs held keys, timeDown stamps, and measured velocity on change.");
    }

    function off() {
        if(domListeners) {
            window.removeEventListener("keydown", domListeners.onDown);
            window.removeEventListener("keyup", domListeners.onUp);
            domListeners = null;
        }

        if(gameFrame !== null) {
            cancelAnimationFrame(gameFrame);
            gameFrame = null;
        }

        console.log("[inputDebug] off");
    }

    window.inputDebug = { dom: startDom, game: startGame, off: off };

    if(new URLSearchParams(window.location.search).get("debug") === "input") {
        startDom();
        startGame();
    }
})();
