const gameState = {};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './sprite_sheets/png_sheets/su3_Student_male_05.png', { frameWidth: 64, frameHeight: 64 })

        this.load.image('bg', './free-to-use-sounds-Qgq7j_QCYtw-unsplash.jpg')
        this.load.image('block', './Level-barriers.png')

        for(var i = 1; i <= 40; i++) {
            this.load.spritesheet(`bomb${i}`, `./sprite_sheets/png_sheets/bomb${i}.png`, {frameWidth: 518, frameHeight: 518})
        }

        gameState.blockLocations = [
            [111, 111], [111, 259], [111, 407],
            [259, 111], [259, 259], [259, 407],
            [407, 111], [407, 259], [407, 407],
        ]
    }
    
    create() {
        this.add.image(0, 0, 'bg')
        
        // this.physics.world.setBounds()

        gameState.player = this.physics.add.sprite(37, 37, 'player', 0);
        gameState.bomb = this.physics.add.sprite(259, 259, 'bomb1', 0);

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

        for(var i = 1; i <= 40; i++) {
            this.anims.create({
                key: `bomb${i}`,
                frames: this.anims.generateFrameNumbers(`bomb${i}`, {start: 0, end: 5}),
                repeat: -1,
                frameRate: 3
            })
        }

        gameState.bomb.anims.play('bomb40')

        //gameState.explosion.anims.play('explosion', false)

        // this.input.keyboard.on('keyup_SPACE', function() {
        //     let [bombX, bombY] = bombLocation(gameState.player)
            
        //     gameState.bomb1.x = bombX;
        //     gameState.bomb1.y = bombY;

        //     gameState.bomb1.anims.play('bomb', false);
        //     gameState.bomb1.on('animationcomplete', function() {
        //         gameState.bomb1.x = 481;
        //         gameState.bomb1.y = 629;

        //         gameState.explosion.x = bombX;
        //         gameState.explosion.y = bombY;

        //         gameState.explosion.anims.play('explosion', false);
        //         gameState.explosion.on('animationcomplete', function() {
        //             gameState.explosion.x = 333;
        //             gameState.explosion.y = 629;
        //         })
        //     }, this)
        // })

        

        // gameState.explosion = this.physics.add.sprite(bomb[0], bomb[1], explosionType(bomb), 0)
        // gameState.explosion.anims.play(explosionType(bomb), true); 
        // console.log(explosionType(bomb))

        // function explosionType(location) {
        //     if(isArrayInArray(gameState.middleBombLocations, location)) {
        //         return 'middle_explosion'
        //     } else if(isArrayInArray(gameState.leftEdgeBombLocations, location)) {
        //         return 'left_edge_explosion'
        //     } else if(isArrayInArray(gameState.topEdgeBombLocations, location)) {
        //         return 'top_edge_explosion'
        //     } else if(isArrayInArray(gameState.rightEdgeBombLocations, location)) {
        //         return 'right_edge_explosion'
        //     } else if(isArrayInArray(gameState.bottomEdgeBombLocations, location)) {
        //         return 'bottom_edge_explosion'
        //     } else if(isArrayInArray(gameState.inbetweenVerticalBombLocations, location)) {
        //         return 'inbetween_vertical_explosion'
        //     } else {
        //         return 'inbetween_horizontal_explosion'
        //     }
        // }

        // function isArrayInArray(arr, item) {
        //     var itemString = JSON.stringify(item);
        //     var contains = arr.some(function(ele) {
        //         return JSON.stringify(ele) === itemString;
        //     });
        //     return contains;
        // }
    }
    
    update() {
        if(gameState.cursors.down.isDown && gameState.player.y <= 481) {
            gameState.player.setVelocityY(128);
            gameState.player.anims.play('walk-down', true);
        } else if(gameState.cursors.up.isDown && gameState.player.y >= 37) {
            gameState.player.setVelocityY(-128);
            gameState.player.anims.play('walk-up', true);
        } else if(gameState.cursors.right.isDown && gameState.player.x <= 481) { 
            gameState.player.setVelocityX(128);
            gameState.player.anims.play('walk-right', true);
        } else if(gameState.cursors.left.isDown && gameState.player.x >= 37) {
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
    width: 518,
    height: 592,
    backgroundColor: 000000,
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 0 }
        }
    },
    scene: [GameScene]
}

const game = new Phaser.Game(config);