const gameState = {
    score: 0
};

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './sprite_sheets/png_sheets/raver_player1.png', { frameWidth: 64, frameHeight: 64 })
        this.load.spritesheet('ravegirl', './sprite_sheets/png_sheets/rave_girl.png', {frameWidth: 74, frameHeight: 74})

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

        gameState.raveGirlLocations = [
            [37, 37], [111, 37], [185, 37], [259, 37], [333, 37], [407, 37], [481, 37],
            [37, 111], [185, 111], [333, 111], [481, 111],
            [37, 185], [111, 185], [185, 185], [259, 185], [333, 185], [407, 185], [481, 185],
            [37, 259], [185, 259], [333, 259], [481, 259],
            [37, 333], [111, 333], [185, 333], [259, 333], [333, 333], [407, 333], [481, 333],
            [37, 407], [185, 407], [333, 407], [481, 407],
            [37, 481], [111, 481], [185, 481], [259, 481], [333, 481], [407, 481], [481, 481]
        ]
    }
    
    create() {
        this.add.image(0, 0, 'bg')

        gameState.player = this.physics.add.sprite(37, 37, 'player', 0);
        gameState.scoreText = this.add.text(200, 530, 'SCORE: 0', {fontSize: '30px', fill: '#FFFFFF'});

        let randIdx = Math.floor(Math.random() * 40);
        let [ravegirlstartX, ravegirlstartY] = gameState.raveGirlLocations[randIdx]
        gameState.ravegirl1 = this.physics.add.sprite(ravegirlstartX, ravegirlstartY, 'ravegirl', 0)

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

        this.anims.create({
            key: 'ravegirl',
            frames: this.anims.generateFrameNumbers('ravegirl', {start: 0, end: 11}),
            repeat: 0,
            frameRate: 2
        })

        gameState.ravegirl1.anims.play('ravegirl', true)

        gameState.ravegirl1.on('animationcomplete', function() {
            let randIdx = Math.floor(Math.random() * 40);
            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[randIdx];

            gameState.ravegirl1.x = raveGirlX;
            gameState.ravegirl1.y = raveGirlY;
            gameState.ravegirl1.setVelocityX(0); gameState.ravegirl1.setVelocityY(0)
            gameState.ravegirl1.anims.play('ravegirl', true)
        })


        this.physics.add.collider(gameState.ravegirl1, gameState.player, function() {
            let randIdx = Math.floor(Math.random() * 40);
            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[randIdx];

            gameState.ravegirl1.x = raveGirlX; gameState.ravegirl1.y = raveGirlY;
            gameState.ravegirl1.setVelocityX(0); gameState.ravegirl1.setVelocityY(0);
            gameState.ravegirl1.anims.stop(null, true);

            gameState.score += 1;
            gameState.scoreText.setText(`SCORE: ${gameState.score}`);

            console.log(gameState.ravegirl1.x);
            console.log(gameState.ravegirl1.y);
        })


        // function raveGirlGen() {
        //     [raveGirlX, raveGirlY] = gameState.raveGirlLocations(Math.floor(Math.random() * 40))
        //     raveGirls.create(raveGirlX, raveGirlY, 'rave-girl')
        // }
        
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
    backgroundColor: 'OxFFFFFF',
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 0 }
        }
    },
    scene: [GameScene]
}

const game = new Phaser.Game(config);