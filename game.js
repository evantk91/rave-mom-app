const gameState = {};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './su3_Student_male_05.png', { frameWidth: 64, frameHeight: 64 })

        this.load.image('bg', './free-to-use-sounds-Qgq7j_QCYtw-unsplash.jpg')
        this.load.image('block', './Level-barriers.png')

        gameState.bombLocations = {
            row_1: [
                [37, 37], [111, 37], [185, 37], [259, 37], [333, 37], [407, 37], [481, 37], [555, 37], [629, 37]
            ],
            row_2: [
                [37, 111], [185, 111], [333, 111], [481, 114], [629, 114]
            ],
            row_3: [
                [37, 185], [111, 185], [185, 185], [259, 185], [333, 185], [407, 185], [481, 185], [555, 37], [629, 185]
            ],
            row_4: [
                [37, 259], [185, 259], [333, 259], [481, 259], [629, 259]
            ],
            row_5: [
                [37, 333], [111, 333], [185, 333], [259, 333], [333, 333], [407, 333], [481, 333], [555, 333], [629, 333]
            ],
            row_6: [
                [37, 407], [185, 407], [333, 407], [481, 407], [629, 407]
            ],
            row_7: [
                [37, 481], [111, 481], [185, 481], [259, 481], [333, 481], [407, 481], [481, 481], [555, 481], [629, 481]
            ],
            row_8: [
                [37, 555], [185, 555], [333, 555], [481, 555], [629, 555]
            ],
            row_9: [
                [37, 629], [111, 629], [185, 629], [259, 629], [333, 629], [407, 629], [481, 629], [555, 629], [629, 629]
            ]
        }
    }
    
    create() {
        this.add.image(320, 320, 'bg')

        gameState.player = this.physics.add.sprite(37, 37, 'player', 0);

        gameState.cursors = this.input.keyboard.createCursorKeys();

        const blocks = this.physics.add.staticGroup();

        blocks.create(111, 111, 'block'); blocks.create(111, 259, 'block'); blocks.create(111, 407, 'block'); blocks.create(111, 555, 'block');
        blocks.create(259, 111, 'block'); blocks.create(259, 259, 'block'); blocks.create(259, 407, 'block'); blocks.create(259, 555, 'block');
        blocks.create(407, 111, 'block'); blocks.create(407, 259, 'block'); blocks.create(407, 407, 'block'); blocks.create(407, 555, 'block');
        blocks.create(555, 111, 'block'); blocks.create(555, 259, 'block'); blocks.create(555, 407, 'block'); blocks.create(555, 555, 'block');

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
        if(gameState.cursors.down.isDown && gameState.player.y <= 629) {
            gameState.player.setVelocityY(128);
            gameState.player.anims.play('walk-down', false);
        } else if(gameState.cursors.up.isDown && gameState.player.y >= 37) {
            gameState.player.setVelocityY(-128);
            gameState.player.anims.play('walk-up', false);
        } else if(gameState.cursors.right.isDown && gameState.player.x <= 629) { 
            gameState.player.setVelocityX(128);
            gameState.player.anims.play('walk-right', false);
        } else if(gameState.cursors.left.isDown && gameState.player.x >= 37) {
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
    width: 666,
    height: 666,
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