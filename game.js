const gameState = {};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './sprite_sheets/su3_Student_male_05.png', { frameWidth: 64, frameHeight: 64 })
        this.load.spritesheet('bomb1', './sprite_sheets/bomb_sprite_sheet.png', { frameWidth: 74, frameHeight: 74 })
        this.load.spritesheet('explosion', './sprite_sheets/middle_explosion_sprite-Sheet.png', { frameWidth: 1258, frameHeight: 1258 })

        this.load.image('bg', './free-to-use-sounds-Qgq7j_QCYtw-unsplash.jpg')
        this.load.image('block', './Level-barriers.png')

        gameState.blockLocations = [
            [703, 703], [703, 851], [703, 999], [703, 1147],
            [851, 703], [851, 851], [851, 999], [851, 1147],
            [999, 703], [999, 851], [999, 999], [999, 1147],
            [1147, 703], [1147, 851], [1147, 999], [1147, 1147]
        ]

        gameState.bombLocations = {
            row_1: [
                [629, 629], [703, 629], [777, 629], [851, 629], [925, 629], [999, 629], [1073, 629], [1147, 629], [1221, 629]
            ],
            row_2: [
                [629, 703], [777, 703], [925, 703], [1073, 703], [1221, 703]
            ],
            row_3: [
                [629, 777], [703, 777], [777, 777], [851, 777], [925, 777], [999, 777], [1073, 777], [1147, 777], [1221, 777]
            ],
            row_4: [
                [629, 851], [777, 851], [925, 851], [1073, 851], [1221, 851]
            ],
            row_5: [
                [629, 925], [703, 925], [777, 925], [851, 925], [925, 925], [999, 925], [1073, 925], [1147, 925], [1221, 925]
            ],
            row_6: [
                [629, 999], [777, 999], [925, 999], [1073, 999], [1221, 999]
            ],
            row_7: [
                [629, 1073], [703, 1073], [777, 1073], [851, 1073], [925, 1073], [999, 1073], [1073, 1073], [1147, 1073], [1221, 1073]
            ],
            row_8: [
                [629, 1147], [777, 1147], [925, 1147], [1147, 1147], [1221, 1147]
            ],
            row_9: [
                [629, 1221], [703, 1221], [777, 1221], [851, 1221], [925, 1221], [999, 1221], [1073, 1221], [1147, 1221], [1221, 1221]
            ]
        }
    }
    
    create() {
        this.add.image(925, 925, 'bg')

        gameState.player = this.physics.add.sprite(629, 629, 'player', 0);
        gameState.bomb1 = this.physics.add.sprite(481, 629, 'bomb1', 0);
        gameState.explosion = this.physics.add.sprite(629, 629, 'explosion', 0);



        gameState.cursors = this.input.keyboard.createCursorKeys();

        const blocks = this.physics.add.staticGroup();

        for (let i = 0; i < gameState.blockLocations.length; i++) {
            blocks.create(gameState.blockLocations[i][0], gameState.blockLocations[i][1], 'block');
        }

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
            frames: this.anims.generateFrameNumbers('bomb1', {start: 0, end: 7}),
            repeat: -1,
            frameRate: 5
        })

        this.anims.create({
            key: 'explosion',
            frames: this.anims.generateFrameNumbers('explosion', {start: 0, end: 2}),
            repeat: -1,
            frameRate: 3
        })

        gameState.explosion.anims.play('explosion', false)

        this.input.keyboard.on('keyup_SPACE', function() {
            let bombX = bombLocation(gameState.player)[0]
            let bombY = bombLocation(gameState.player)[1]
            
            console.log('bomb!!')
            gameState.bomb1.x = bombX;
            gameState.bomb1.y = bombY;
            gameState.bomb1.anims.play('bomb', false);
        })

        function bombLocation(player) {
            let player_row = rowLocation(player);
            let column_idx

            if (player_row === 'row_1' || player_row === 'row_3' || player_row === 'row_5' || player_row === 'row_7' || player_row === 'row_9') {
                if(player.x <= 666) {
                    column_idx = 0;
                } else if(player.x > 666 && player.x <= 740) {
                    column_idx = 1;
                } else if(player.x > 740 && player.x <= 814) {
                    column_idx = 2;
                } else if(player.x > 814 && player.x <= 888) {
                    column_idx = 3;
                } else if(player.x > 888 && player.x <= 962) {
                    column_idx = 4;
                } else if(player.x > 962 && player.x <= 1036) {
                    column_idx = 5;
                } else if(player.x > 1036 && player.x <= 1110) {
                    column_idx = 6;
                } else if(player.x > 1110 && player.x <= 1184) {
                    column_idx = 7;
                } else {
                    column_idx = 8;
                }
            } else {
                if(player.x <= 666) {
                    column_idx = 0;
                } else if(player.x > 740 && player.x <= 814) {
                    column_idx = 1;
                } else if(player.x > 888 && player.x <= 962) {
                    column_idx = 2;
                } else if(player.x > 1036 && player.x <= 1110) {
                    column_idx = 3;
                } else if(player.x > 1184) {
                    column_idx = 4
                }
            }

            return gameState.bombLocations[player_row][column_idx]
        }

        function rowLocation(player) {
            if(player.y <= 666) {
                return 'row_1'
            } else if(player.y > 666 && player.y <= 740) {
                return 'row_2'
            } else if(player.y > 740 && player.y <= 814) {
                return 'row_3'
            } else if(player.y > 814 && player.y <= 888) {
                return 'row_4'
            } else if(player.y > 888 && player.y <= 962) {
                return 'row_5'
            } else if(player.y > 962 && player.y <= 1036) {
                return 'row_6'
            } else if(player.y > 1036 && player.y <= 1110) {
                return 'row_7'
            } else if(player.y > 1110 && player.y <= 1184) {
                return 'row_8'
            } else {
                return 'row_9'
            }
        }
    }
    
    update() {
        if(gameState.cursors.down.isDown && gameState.player.y <= 1221) {
            gameState.player.setVelocityY(128);
            gameState.player.anims.play('walk-down', true);
        } else if(gameState.cursors.up.isDown && gameState.player.y >= 629) {
            gameState.player.setVelocityY(-128);
            gameState.player.anims.play('walk-up', true);
        } else if(gameState.cursors.right.isDown && gameState.player.x <= 1221) { 
            gameState.player.setVelocityX(128);
            gameState.player.anims.play('walk-right', true);
        } else if(gameState.cursors.left.isDown && gameState.player.x >= 629) {
            gameState.player.setVelocityX(-128);
            gameState.player.anims.play('walk-left', true);
        } else {
            gameState.player.setVelocityX(0);
            gameState.player.setVelocityY(0);
            gameState.player.anims.pause();
        }        
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1850,
    height: 1850,
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