
const gameState = {};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './su3_Student_male_05.png', { frameWidth: 32, frameHeight: 32 })
    }
    
    create() {
        gameState.player = this.add.sprite(16, 16, 'player')
    }
    
    update() {
        
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 500,
    backgroundColor: 0xFFFFFF,
    scene: [GameScene]
}

const game = new Phaser.Game(config);