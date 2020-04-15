const gameState = {
    score: 0
};

const config = {
    type: Phaser.AUTO,
    width: 518,
    height: 632,
    parent: 'game-container',
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