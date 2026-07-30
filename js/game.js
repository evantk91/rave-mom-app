const gameState = {
    score: 0
};

// Phaser owns the canvas's display size. FIT scales the 518x632 bitmap down to
// whatever box #canvas-container gives it, preserving the aspect ratio, and
// `max` stops it ever scaling *up* past native — upscaling would blur the pixel
// art, which is the thing css/shared.css's panel sizing was written to prevent.
// (The CSS backstops this: #canvas-container's max-width caps the parent at the
// bitmap's own width, so FIT can't exceed 1x even if `max` misbehaves.)
//
// This scales the *presentation* only. Every gameplay coordinate — the 7x7 grid,
// gameState.playerGridPositions, the explosion arrays, gameState.raveGirlLocations,
// the movement bounds in gamescene.js — stays in the 518x632 space.
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'canvas-container',
        width: 518,
        height: 632,
        max: { width: 518, height: 632 }
    },
    backgroundColor: 'OxFFFFFF',
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 0 }
        }
    },
    scene: [StartMenu, GameScene]
}

const game = new Phaser.Game(config);