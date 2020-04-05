const gameState = {};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './su3_Student_male_05.png', { frameWidth: 64, frameHeight: 64 })
        this.load.image('bg', './free-to-use-sounds-Qgq7j_QCYtw-unsplash.jpg')
        this.load.image('block', './Level-barriers.png')
    }
    
    create() {
        this.add.image(320, 320, 'bg')

        gameState.player = this.physics.add.sprite(32, 32, 'player', 0);

        gameState.cursors = this.input.keyboard.createCursorKeys();

        const blocks = this.physics.add.staticGroup();

        blocks.create(101, 101, 'block'); blocks.create(101, 239, 'block'); blocks.create(101, 377, 'block'); blocks.create(101, 515, 'block'); blocks.create(101, 653, 'block');
        blocks.create(239, 101, 'block'); blocks.create(239, 239, 'block'); blocks.create(239, 377, 'block'); blocks.create(239, 515, 'block'); blocks.create(239, 653, 'block');
        blocks.create(377, 101, 'block'); blocks.create(377, 239, 'block'); blocks.create(377, 377, 'block'); blocks.create(377, 515, 'block'); blocks.create(377, 653, 'block');
        blocks.create(515, 101, 'block'); blocks.create(515, 239, 'block'); blocks.create(515, 377, 'block'); blocks.create(515, 515, 'block'); blocks.create(515, 653, 'block');
        blocks.create(653, 101, 'block'); blocks.create(653, 239, 'block'); blocks.create(653, 377, 'block'); blocks.create(653, 515, 'block'); blocks.create(653, 653, 'block');

        this.physics.add.collider(gameState.player, blocks)
    
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', {start: 0, end: 2}),
            repeat: -1, 
            frameRate: 5,
        });

        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', {start: 3, end: 5}),
            repeat: -1, 
            frameRate: 5,
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', {start: 6, end: 8}),
            repeat: -1, 
            frameRate: 5,
        });

        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', {start: 9, end: 11}),
            repeat: -1, 
            frameRate: 5,
        });
        
    }
    
    update() {
        if(gameState.cursors.down.isDown && gameState.player.y <= 727) {
            gameState.player.setVelocityY(128);
            gameState.player.anims.play('walk-down', false);
        } else if(gameState.cursors.up.isDown && gameState.player.y >= 32) {
            gameState.player.setVelocityY(-128);
            gameState.player.anims.play('walk-up', false);
        } else if(gameState.cursors.right.isDown && gameState.player.x <= 727) { 
            gameState.player.setVelocityX(128);
            gameState.player.anims.play('walk-right', false);
        } else if(gameState.cursors.left.isDown && gameState.player.x >= 32) {
            gameState.player.setVelocityX(-128);
            gameState.player.anims.play('walk-left', false);
        } else {
            gameState.player.setVelocityX(0);
            gameState.player.setVelocityY(0);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 759,
    height: 759,
    backgroundColor: 0xFFFFFF,
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 0 }
        }
    },
    scene: [GameScene]
}

const game = new Phaser.Game(config);