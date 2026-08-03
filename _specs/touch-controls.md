# Spec for touch-controls

branch: claude/feature/touch-controls

## Summary

The game is only playable with arrow keys, so on a phone it loads, renders, and cannot be played at all.

This adds hold-to-move touch controls on the board itself. Touch the board and the player moves toward that point; lift and the player stops. Direction is resolved to a single axis — whichever of the horizontal or vertical offset from the player to the touch point is larger — so a touch never produces diagonal movement, matching what the keyboard already does.

A dead zone one cell wide sits around the player, so the player also stops on arrival at the touch point rather than only on release. The result reads as "go where I'm pointing, and stop there", with holding and dragging as the way to keep going.

There is no on-screen d-pad or any other new UI. That is a deliberate constraint rather than a simplification: the phone layout has no room for one. `css/game.css`'s phone tier already notes the column "lands 14px over a 640px-tall screen" and required trimmed padding to fit at all, and a usable d-pad needs roughly 130px of vertical space that does not exist. Controls that live on the board need no layout budget, so the space problem never arises.

Three properties of the current game make this a small change rather than a rewrite:

- Direction selection is already data-driven. `update()` builds a list of direction descriptors, filters it to the ones currently held, and picks the one whose input was engaged most recently. Each descriptor's input object is only ever read for two fields: whether it is down, and when it went down. Touch can supply an object of that shape and join the same list, so keyboard and touch share one dispatch rather than running parallel ones — and "most recent wins" then arbitrates between them for free.
- Movement is already single-axis. Earlier work removed diagonal drift and made exactly one direction active at a time, which is the same semantics dominant-axis touch produces.
- The maze is enforced by physics. The player collides with the nine block bodies, and corridors are only about 10px wider than the player, so the player is very nearly axis-locked by geometry. Touch controls only have to choose a direction; they do not have to keep the player in the maze or align them to corridors.

Out of scope: changing the movement model to grid-locked or step-based movement, any on-screen control UI, multi-touch gestures, and gamepad support.

## Decisions

1. **Dead zone is one cell, 74x74, centred on the player.** A touch whose offset from the player is within 37px on *both* axes produces no movement. Cells are 74px apart, so the centre of any adjacent cell sits well outside it.

2. **The dead zone means the player stops on arrival, not only on release.** This follows unavoidably from a dead zone that travels with the player: as the player closes on a held touch point, it enters the zone and movement ceases. It is a real change in feel from "hold to move indefinitely" and is treated here as intended — it makes a single touch a move-to-here gesture, and holding while dragging the finger ahead of the player is how continuous movement is expressed.

3. **The current direction wins near the diagonal.** Once a direction is in effect for a held touch, it is kept until the perpendicular offset exceeds the current one by a clear margin. Exact ties keep the current direction. This prevents the axis flapping when a finger sits near the 45-degree line.

4. **A tap is just a very short hold.** There is no separate tap gesture and no tap-to-destination behaviour. A brief touch outside the dead zone produces a correspondingly brief movement.

5. **Only the board is a movement surface.** The canvas is taller than the play field and carries the score and game-over text beneath it. Touches there do not move the player. This does not narrow tap-to-start or tap-to-restart, which continue to accept a tap anywhere on the canvas.

6. **Touch and keyboard arbitrate by most recently engaged**, with no precedence for either, which is the rule the keyboard already uses between its own directions.

## Functional Requirements

- Touching the board begins movement, and the player continues moving for as long as the touch is held and the touch point is outside the dead zone.
- Lifting the touch stops the player immediately, exactly as releasing an arrow key does.
- A touch point within 37px of the player on both axes is inside the dead zone and produces no movement, whether it began there or the player arrived there.
- Outside the dead zone, direction is the dominant axis of the offset from the player to the touch point: the larger of the horizontal and vertical distance decides the axis, its sign decides the direction. Movement is never diagonal.
- While a touch is held and the finger moves, direction re-resolves continuously from the finger's current position, so the player can be steered around a corner without lifting.
- Once a direction is established for a held touch, it is retained until the perpendicular offset exceeds it by a clear margin; exact ties retain the current direction.
- Touches below the board — on the score or game-over text — do not move the player.
- A held touch that drifts outside the board is treated as pointing at the nearest point on the board's edge, so a finger that wanders slightly off does not stop the player dead.
- Touch and keyboard feed the same direction dispatch, and whichever was engaged most recently wins, with no special-casing of either.
- Touch input drives the same walk animations and the same movement speed as the keyboard.
- Touch coordinates are interpreted in the game's own 518x632 coordinate space, not in screen pixels, so the controls stay correct at every scale the board is displayed at.
- The existing tap-to-start and tap-to-restart interactions continue to work anywhere on the canvas, and starting or restarting a game does not leave the player moving.
- Keyboard play on desktop is unchanged in feel and behaviour.

## Possible Edge Cases

- A touch lands exactly on the player, or the horizontal and vertical offsets are exactly equal. Both fall inside the dead zone or under the tie rule, and must resolve deterministically rather than alternating between frames.
- The player enters the dead zone while the touch is still held, then the finger moves again — movement must resume from the new offset without requiring a lift.
- The finger is dragged across the player, so the required direction reverses. The dead zone is crossed in the process, which should read as a clean stop and reverse rather than a stutter.
- A second finger touches while the first is held, or the first is lifted while a second is still down.
- A touch is held while the player is stopped against a block or a board edge, so the chosen direction produces no movement. This must not fall through to a different direction.
- The touch drifts outside the canvas entirely, or the browser cancels it — a system gesture, a notification, an incoming call.
- A touch is still held when the player dies, when the game is restarted, or when the page is backgrounded.
- A tap that restarts a finished game must not also move the player in the new game, given that a tap is a short hold.
- Both a key and a touch are engaged at once, including a touch beginning while a key is held and vice versa.
- Browser default behaviours on the canvas — scrolling, pull-to-refresh, double-tap zoom, long-press selection, and the synthetic mouse events browsers emit after a touch — interfering with play or causing one input to count twice.
- The player is nearly, but not exactly, centred in a corridor, given the roughly 10px of lateral slack.

## Acceptance Criteria

- On a phone, a game can be played start to finish — moving, collecting rave girls, scoring, dying, and restarting — using touch alone.
- Holding a touch outside the dead zone moves the player continuously; lifting stops it with the same frame behaviour as releasing a key.
- A touch inside the dead zone never moves the player, and a player arriving at a held touch point comes to rest rather than passing through or oscillating.
- No touch input, at any position or duration, produces diagonal movement or a speed higher than the keyboard's.
- Dragging a held touch around a corner steers the player around that corner without lifting.
- A finger held near the 45-degree line does not cause the direction to alternate between frames.
- Touches on the score and game-over text do not move the player, while a tap anywhere on the canvas still starts and restarts a game.
- With a key held and a touch started, the touch takes over; with a touch held and a key pressed, the key takes over; releasing the newer input returns control to the older one if it is still engaged.
- A touch held against a wall or board edge leaves the player stationary rather than moving in another direction.
- Ending a game or restarting with a touch still held does not leave the player moving.
- The phone layout is unchanged: no new elements, and the column still fits a 640px-tall screen.
- Desktop keyboard play is unchanged.
- The board is not scrolled, zoomed, or text-selected by playing with touch, and a single touch is never counted as two inputs.

## Open Questions

- The hysteresis margin in Decision 3 has no value yet. It is a feel parameter rather than a correctness one, so the intent is to pick a starting value during implementation and tune it on a real device — but it should be named and adjustable in one place rather than buried.
- Decision 2 changes the gesture from "hold to move" to "move to here and stop". It follows from the dead zone size and is written as intended, but it is the one decision here that alters how the game feels to play, so it is worth confirming on a device before the rest is polished.
