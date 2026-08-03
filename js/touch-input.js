// Hold-to-move touch controls: touch the board and the player moves toward that
// point, lift and it stops. The direction is resolved to a single axis, so touch
// can't produce the diagonal movement the keyboard no longer produces either.
//
// This exposes four objects shaped like Phaser Keys rather than driving the
// player itself. gamescene.js's update() reads exactly two fields off each entry
// in its direction list — isDown, and timeDown — so anything with those two
// fields can join that list. Touch therefore shares the keyboard's dispatch
// instead of running a second one alongside it, and the existing "most recently
// engaged wins" rule arbitrates between the two for free.
//
// There is no on-screen d-pad. The phone layout has no room for one: css/game.css
// notes the column already lands 14px over a 640px-tall screen, and a usable pad
// wants around 130px that doesn't exist. Controls living on the board cost no
// layout at all.
//
// Loaded before gamescene.js in index.html, and reads BOARD for the play field.
const TOUCH = (function() {
    // Both tunables live here, together, because they're the two values anyone
    // adjusting the feel will reach for.

    // Half a cell. A touch within this of the player on both axes moves nothing.
    // The same rule is what brings the player to rest when it *reaches* a held
    // finger, which makes one touch a "go here and stop" gesture rather than
    // "move until released" — the one decision in the spec that changes how the
    // game plays.
    const DEAD_ZONE = 37;

    // How much further the perpendicular offset has to reach before the axis
    // flips. Without it a finger sitting near the 45-degree line makes the
    // direction alternate frame to frame. Pure feel — expect to tune on a real
    // device rather than reason it out here.
    const HYSTERESIS = 12;

    // Derived from BOARD rather than written out, so it can't drift the way a
    // fourth hand-typed copy of the board's coordinates would. The cells span
    // 37..481 and each is DEAD_ZONE from its edge, giving the 0..518 play field
    // — the square above the score and game-over text, which is canvas but not
    // board and so doesn't move the player.
    const xs = BOARD.cells.map(cell => cell[0]);
    const ys = BOARD.cells.map(cell => cell[1]);
    const FIELD = {
        left: Math.min.apply(null, xs) - DEAD_ZONE,
        right: Math.max.apply(null, xs) + DEAD_ZONE,
        top: Math.min.apply(null, ys) - DEAD_ZONE,
        bottom: Math.max.apply(null, ys) + DEAD_ZONE
    };

    const directions = {
        up: { isDown: false, timeDown: 0 },
        down: { isDown: false, timeDown: 0 },
        left: { isDown: false, timeDown: 0 },
        right: { isDown: false, timeDown: 0 }
    };

    let wasDown = false;
    let startedOnField = false;
    let axis = null;

    const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

    const onField = (x, y) =>
        x >= FIELD.left && x <= FIELD.right && y >= FIELD.top && y <= FIELD.bottom;

    function clearDirections() {
        directions.up.isDown = false;
        directions.down.isDown = false;
        directions.left.isDown = false;
        directions.right.isDown = false;
    }

    function engage(name) {
        Object.keys(directions).forEach(key => {
            if(key !== name) {
                directions[key].isDown = false;
                return;
            }

            // Stamp only on the transition to down, exactly as Phaser's
            // Key.onDown does inside its `if (!this.isDown)` guard. Re-stamping
            // every frame would hand touch the newest timeDown permanently, so
            // it would outrank a held key forever and "most recently engaged
            // wins" would quietly stop meaning anything — no error, nothing in
            // the console, just a keyboard that no longer takes over.
            //
            // performance.now() is the right clock: Phaser stamps Keys with
            // event.timeStamp, which is a DOMHighResTimeStamp on the same time
            // origin, so the two are directly comparable.
            if(!directions[key].isDown) {
                directions[key].isDown = true;
                directions[key].timeDown = performance.now();
            }
        });
    }

    // Called once a frame from GameScene.update(), outside the player.enable
    // guard so that lifting a finger during a game over still clears state.
    function update(pointer, player) {
        if(!pointer || !pointer.isDown) {
            reset();
            return;
        }

        // Latch on the rising edge whether this touch began on the play field.
        // One that began below it — on the score or game-over text — never moves
        // the player for its whole life, however far it's then dragged.
        if(!wasDown) {
            wasDown = true;
            startedOnField = onField(pointer.x, pointer.y);
        }

        if(!startedOnField) {
            clearDirections();
            return;
        }

        // A finger that wanders off the edge keeps steering, rather than
        // stopping the player dead on a slight overshoot.
        const x = clamp(pointer.x, FIELD.left, FIELD.right);
        const y = clamp(pointer.y, FIELD.top, FIELD.bottom);
        const dx = x - player.x;
        const dy = y - player.y;

        if(Math.abs(dx) <= DEAD_ZONE && Math.abs(dy) <= DEAD_ZONE) {
            clearDirections();

            // Forgetting the axis matters: dragging a finger straight across the
            // player passes through the dead zone, and clearing here is what
            // makes that read as a clean stop and reverse instead of the old
            // axis clinging on through the crossing.
            axis = null;
            return;
        }

        axis = chooseAxis(dx, dy);
        engage(axis === 'x' ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }

    // Keeps the axis already in effect unless the other one is clearly winning.
    // With none in effect the larger offset takes it, and an exact tie resolves
    // to horizontal — arbitrary, but it has to be decided the same way every
    // frame or the player would judder on a perfect diagonal.
    function chooseAxis(dx, dy) {
        const across = Math.abs(dx);
        const down = Math.abs(dy);

        if(axis === 'x') return down > across + HYSTERESIS ? 'y' : 'x';
        if(axis === 'y') return across > down + HYSTERESIS ? 'x' : 'y';
        return across >= down ? 'x' : 'y';
    }

    // Also called from create(), so a touch held through a restart can't carry
    // into the new game.
    function reset() {
        clearDirections();
        wasDown = false;
        startedOnField = false;
        axis = null;
    }

    return {
        up: directions.up,
        down: directions.down,
        left: directions.left,
        right: directions.right,
        update: update,
        reset: reset
    };
})();
