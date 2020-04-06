const gameState = {};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './sprite_sheets/su3_Student_male_05.png', { frameWidth: 64, frameHeight: 64 })
        this.load.spritesheet('bomb', './sprite_sheets/bomb_sprite_sheet.png', { frameWidth: 74, frameHeight: 74 })

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
        gameState.bombs = this.physics.add.group();

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

        this.anims.create({
            key: 'bomb',
            frames: this.anims.generateFrameNumbers('bomb', {start: 0, end: 7}),
            repeat: -1,
            frameRate: 5
        })
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

        this.input.keyboard.once('keyup_SPACE', function() {
            let bombX = bombLocation(gameState.player)[0]
            let bombY = bombLocation(gameState.player)[1]
            
            console.log('bomb!!')
            gameState.bombs.create(bombX, bombY, 'bomb')
        })

        gameState.bombs.playAnimation('bomb', 0);
 
        function bombLocation(player) {
            let player_row = rowLocation(player);
            let column_idx

            if (player_row === 'row_1' || player_row === 'row_3' || player_row === 'row_5' || player_row === 'row_7' || player_row === 'row_9') {
                if(player.x <= 74) {
                    column_idx = 0;
                } else if(player.x > 74 && player.x <= 148) {
                    column_idx = 1;
                } else if(player.x > 148 && player.x <= 222) {
                    column_idx = 2;
                } else if(player.x > 222 && player.x <= 296) {
                    column_idx = 3;
                } else if(player.x > 296 && player.x <= 370) {
                    column_idx = 4;
                } else if(player.x > 370 && player.x <= 444) {
                    column_idx = 5;
                } else if(player.x > 444 && player.x <= 518) {
                    column_idx = 6;
                } else if(player.x > 518 && player.x <= 592) {
                    column_idx = 7;
                } else {
                    column_idx = 8;
                }
            } else {
                if(player.x <= 74) {
                    column_idx = 0;
                } else if(player.x > 148 && player.x <= 222) {
                    column_idx = 1;
                } else if(player.x > 296 && player.x <= 370) {
                    column_idx = 2;
                } else if(player.x > 444 && player.x <= 518) {
                    column_idx = 3;
                } else if(player.x > 592) {
                    column_idx = 4
                }
            }

            return gameState.bombLocations[player_row][column_idx]
        }

        function rowLocation(player) {
            if(player.y <= 74) {
                return 'row_1'
            } else if(player.y > 74 && player.y <= 148) {
                return 'row_2'
            } else if(player.y > 148 && player.y <= 222) {
                return 'row_3'
            } else if(player.y > 222 && player.y <= 296) {
                return 'row_4'
            } else if(player.y > 296 && player.y <= 370) {
                return 'row_5'
            } else if(player.y > 370 && player.y <= 444) {
                return 'row_6'
            } else if(player.y > 444 && player.y <= 518) {
                return 'row_7'
            } else if(player.y > 518 && player.y <= 592) {
                return 'row_8'
            } else {
                return 'row_9'
            }
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