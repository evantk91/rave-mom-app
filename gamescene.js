class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        this.load.spritesheet('player', './sprite_sheets/png_sheets/raver_player1.png', { frameWidth: 64, frameHeight: 64 })

        for(var i = 1; i <= 3; i++) {
            this.load.spritesheet(`ravegirl${i}`, `./sprite_sheets/png_sheets/raver_girl${i}.png`, {frameWidth: 74, frameHeight: 74})
        }

        this.load.spritesheet('heart','./sprite_sheets/png_sheets/Heart.png', {frameWidth: 74, frameHeight: 74})
        this.load.spritesheet('playerloses', './sprite_sheets/png_sheets/raver_player_loses.png', {frameWidth: 74, frameHeight: 74})

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

        gameState.playerGridPositions = {
            row1: [
                [37, 37], [111, 37], [185, 37], [259, 37], [333, 37], [407, 37], [481, 37]
            ],
            row2: [
                [37, 111], [185, 111], [333, 111], [481, 111]
            ],
            row3: [
                [37, 185], [111, 185], [185, 185], [259, 185], [333, 185], [407, 185], [481, 185]
            ],
            row4: [
                [37, 259], [185, 259], [333, 259], [481, 259]
            ],
            row5: [
                [37, 333], [111, 333], [185, 333], [259, 333], [333, 333], [407, 333], [481, 333]
            ],
            row6: [
                [37, 407], [185, 407], [333, 407], [481, 407]
            ],
            row7: [
                [37, 481], [111, 481], [185, 481], [259, 481], [333, 481], [407, 481], [481, 481]
            ]  
        }

        gameState.explosionPositions = {
            bomb1: [
                [37, 37], [111, 37], [185, 37], [259, 37], [37, 111], [37, 185], [37, 259]
            ],
            bomb2: [
                [37, 37], [111, 37], [185, 37], [259, 37], [333, 37]
            ],
            bomb3: [
                [37, 37], [111, 37], [185, 37], [259, 37], [333, 37], [407, 37], [185, 111], [185, 185], [185, 259]
            ],
            bomb4: [
                [37, 37], [111, 37], [185, 37], [259, 37], [333, 37], [407, 37], [481, 37]
            ],
            bomb5: [
                [111, 37], [185, 37], [259, 37], [333, 37], [407, 37], [481, 37], [333, 111], [333, 185], [333, 259]
            ],
            bomb6: [
                [185, 37], [259, 37], [333, 37], [407, 37], [481, 37]
            ],
            bomb7: [
                [259, 37], [333, 37], [407, 37], [481, 37], [481, 111], [481, 185], [481, 259]
            ],
            bomb8: [
                [37, 37], [37, 111], [37, 185], [37, 259], [37, 333]
            ],
            bomb9: [
                [185, 37], [185, 111], [185, 185], [185, 259], [185, 333]
            ],
            bomb10: [
                [333, 37], [333, 111], [333, 185], [333, 259], [333, 333]
            ],
            bomb11: [
                [481, 37], [481, 111], [481, 185], [481, 259], [481, 333]
            ],
            bomb12: [
                [37, 185], [111, 185], [185, 185], [259, 185], [37, 37], [37, 111], [37, 259], [37, 333], [37, 407]
            ],
            bomb13: [
                [37, 185], [111, 185], [185, 185], [259, 185], [333, 185]
            ],
            bomb14: [
                [37, 185], [111, 185], [185, 185], [259, 185], [333, 185], [407, 185], [185, 37], [185, 111], [185, 259], [185, 333], [185, 407]
            ],
            bomb15: [
                [37, 185], [111, 185], [185, 185], [259, 185], [333, 185], [407, 185], [481, 185]
            ],
            bomb16: [
                [111, 185], [185, 185], [259, 185], [333, 185], [407, 185], [481, 185], [333, 37], [333, 111], [333, 259], [333, 333], [333, 407] 
            ],
            bomb17:[
                [185, 185], [259, 185], [333, 185], [407, 185], [481, 185]
            ],
            bomb18: [
                [259, 185], [333, 185], [407, 185], [481, 185], [481, 37], [481, 111], [481, 259], [481, 333], [481, 407]
            ],
            bomb19: [
                [37, 37], [37, 111], [37, 185], [37, 259], [37, 333], [37, 407], [37, 481]
            ],
            bomb20: [
                [185, 37], [185, 111], [185, 185], [185, 259], [185, 333], [185, 407], [185, 481]
            ],
            bomb21: [
                [333, 37], [333, 111], [333, 185], [333, 259], [333, 333], [333, 407], [333, 481]
            ],
            bomb22: [
                [481, 37], [481, 111], [481, 185], [481, 259], [481, 333], [481, 407], [481, 481]
            ],
            bomb23: [
                [37, 333], [111, 333], [185, 333], [259, 333], [37, 111], [37, 185], [37, 259], [37, 407], [37, 481]
            ],
            bomb24: [
                [37, 333], [111, 333], [185, 333], [259, 333], [333, 333]
            ],
            bomb25: [
                [37, 333], [111, 333], [185, 333], [259, 333], [333, 333], [407, 333], [185, 111], [185, 185], [185, 259], [185, 407], [185, 481]
            ],
            bomb26: [
                [37, 333], [111, 333], [185, 333], [259, 333], [333, 333], [407, 333], [481, 333]
            ],
            bomb27: [
                [111, 333], [185, 333], [259, 333], [333, 333], [407, 333], [481, 333], [111, 333], [333, 185], [333, 259], [333, 407], [333, 481]
            ],
            bomb28: [
                [185, 333], [259, 333], [333, 333], [407, 333], [481, 333]
            ],
            bomb29: [
                [259, 333], [333, 333], [407, 333], [481, 333], [481, 111], [481, 185], [481, 259], [481, 407], [481, 481]
            ],
            bomb30: [
                [37, 185], [37, 259], [37, 333], [37, 407], [37, 481]
            ],
            bomb31: [
                [185, 185], [185, 259], [185, 333], [185, 407], [185, 481]
            ],
            bomb32: [
                [333, 185], [333, 259], [333, 333], [333, 407], [333, 481]
            ],
            bomb33: [
                [481, 185], [481, 259], [481, 333], [481, 407], [481, 481]
            ],
            bomb34: [
                [37, 259], [37, 333], [37, 407], [37, 481], [111, 481], [185, 481], [259, 481]
            ],
            bomb35: [
                [37, 481], [111, 481], [185, 481], [259, 481], [333, 481]
            ],
            bomb36: [
                [37, 481], [111, 481], [185, 481], [259, 481], [333, 481], [407, 481], [185, 259], [185, 333], [185, 407]
            ],
            bomb37: [
                [37, 481], [111, 481], [185, 481], [259, 481], [333, 481], [407, 481], [481, 481]
            ],
            bomb38: [
                [111, 481], [185, 481], [259, 481], [333, 481], [407, 481], [481, 481], [333, 259], [333, 333], [333, 407]
            ],
            bomb39: [
                [185, 481], [259, 481], [333, 481], [407, 481], [481, 481]
            ],
            bomb40: [
                [259, 481], [333, 481], [407, 481], [481, 481], [259, 481], [333, 481], [407, 481]
            ]
        }

        gameState.gameEnded = false;
    }
    
    create() {
        this.add.image(0, 0, 'bg')

        gameState.cursors = this.input.keyboard.createCursorKeys();

        gameState.player = this.physics.add.sprite(37, 37, 'player', 0);
        gameState.player.enable = true;
        gameState.heart = this.physics.add.sprite(111, 111, 'heart', 0);
        gameState.playerloses = this.physics.add.sprite(111, 111, 'playerloses', 0);
        gameState.scoreText = this.add.text(200, 530, 'SCORE: 0', {fontSize: '30px', fill: '#FFFFFF'});
        gameState.gameEndText = this.add.text(75, 575, '', {fontSize: '30px', fill: '#FFFFFF'})

        gameState.bomb1 = this.physics.add.sprite(256, 256, 'bomb1', 0);
        gameState.bomb2 = this.physics.add.sprite(256, 256, 'bomb2', 0);

        let ravegirl1_x = setInitialRaveGirlPosition()[0]
        let ravegirl1_y = setInitialRaveGirlPosition()[1]
        gameState.ravegirl1 = this.physics.add.sprite(ravegirl1_x, ravegirl1_y, 'ravegirl1', 0)

        let ravegirl2_x = setInitialRaveGirlPosition()[0]
        let ravegirl2_y = setInitialRaveGirlPosition()[1]
        if(ravegirl2_x === gameState.ravegirl1.x && ravegirl2_y === gameState.ravegirl1.y) {
            ravegirl2_x = setInitialRaveGirlPosition()[0]
            ravegirl2_y = setInitialRaveGirlPosition()[1]
        }
        gameState.ravegirl2 = this.physics.add.sprite(ravegirl2_x, ravegirl2_y, 'ravegirl2', 0)

        let ravegirl3_x = setInitialRaveGirlPosition()[0]
        let ravegirl3_y = setInitialRaveGirlPosition()[1]
        while((ravegirl3_x === gameState.ravegirl1.x && ravegirl3_y === gameState.ravegirl1.y) ||
        (ravegirl3_x === gameState.ravegirl2.x && ravegirl3_y === gameState.ravegirl2.y)) {
            ravegirl3_x = setInitialRaveGirlPosition()[0]
            ravegirl3_y = setInitialRaveGirlPosition()[1]
        }
        gameState.ravegirl3 = this.physics.add.sprite(ravegirl3_x, ravegirl3_y, 'ravegirl3', 0)

        function setInitialRaveGirlPosition() {
            let randIdx = Math.floor(Math.random() * 40);
            let [ravegirlstartX, ravegirlstartY] = gameState.raveGirlLocations[randIdx];
            if(ravegirlstartX === getPlayerGridPosition(gameState.player) && ravegirlstartY === getPlayerGridPosition(gameState.player)) {
                randIdx = Math.floor(Math.random() * 40);
                [ravegirlstartX, ravegirlstartY] = gameState.raveGirlLocations[randIdx];
            }
            return [ravegirlstartX, ravegirlstartY]
        }
        
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
                repeat: 0,
                frameRate: 3
            })
        }

        for(var i = 1; i <= 3; i++) {
            this.anims.create({
                key: `ravegirl${i}`,
                frames: this.anims.generateFrameNumbers(`ravegirl${i}`, {start: 0, end: 11}),
                repeat: 0,
                frameRate: 3
            })
        }

        this.anims.create({
            key: 'heart',
            frames: this.anims.generateFrameNumbers('heart', {start: 0, end: 3}),
            repeat: 1,
            frameRate: 3
        })
        
        this.anims.create({
            key: 'playerloses',
            frames: this.anims.generateFrameNumbers('playerloses', {start: 0, end: 3}),
            repeat: -1,
            frameRate: 3
        })  
        
        gameState.ravegirl1.anims.play('ravegirl1', true)
        gameState.ravegirl2.anims.play('ravegirl2', true)
        gameState.ravegirl3.anims.play('ravegirl3', true)

        let randBomb1 = `bomb${Math.floor(Math.random() * 40) + 1}`;
        gameState.bomb1.anims.play(randBomb1, true)

        let randBomb2 = `bomb${Math.floor(Math.random() * 40) + 1}`;
        gameState.bomb2.anims.play(randBomb2, true)

        let playerX; 
        let playerY;

        gameState.bomb1.on('animationcomplete', function() {
            [playerX, playerY] = getPlayerGridPosition(gameState.player)

            if(isArrayInArray(gameState.explosionPositions[randBomb1], [playerX, playerY])) {
                gameState.scoreText.x = 60
                gameState.scoreText.setText(`GAME OVER... SCORE: ${gameState.score}`);

                const result = {
                    user_id: localStorage.getItem("user_id"),
                    score: gameState.score
                }

                fetch("http://localhost:3000/api/v1/scores", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(result)
                })
                
                gameState.ravegirl1.anims.pause()
                gameState.ravegirl2.anims.pause()
                gameState.ravegirl3.anims.pause()

                gameState.bomb1.destroy()

                gameState.player.x = 111; gameState.player.y = 111;
                gameState.player.setVelocityX(0); gameState.player.setVelocityY(0);
                gameState.player.enable = false;

                gameState.playerloses.x = playerX; gameState.playerloses.y = playerY;
                gameState.playerloses.anims.play('playerloses', true);
                gameState.gameEndText.setText('CLICK TO PLAY AGAIN');
                gameState.gameEnded = true;

            } else {
                randBomb1 = `bomb${Math.floor(Math.random() * 40) + 1}`;
                gameState.bomb1.anims.play(randBomb1, true);
            }
        })

        gameState.bomb2.on('animationcomplete', function() {
            [playerX, playerY] = getPlayerGridPosition(gameState.player)

            if(isArrayInArray(gameState.explosionPositions[randBomb2], [playerX, playerY])) {
                gameState.scoreText.x = 60
                gameState.scoreText.setText(`GAME OVER... SCORE: ${gameState.score}`);

                const result = {
                    user_id: localStorage.getItem("user_id"),
                    score: gameState.score
                }

                fetch("http://localhost:3000/api/v1/score", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(result)
                })
                
                gameState.ravegirl1.anims.pause()
                gameState.ravegirl2.anims.pause()
                gameState.ravegirl3.anims.pause()

                gameState.bomb2.destroy()

                gameState.player.x = 111; gameState.player.y = 111;
                gameState.player.setVelocityX(0); gameState.player.setVelocityY(0);
                gameState.player.enable = false;

                gameState.playerloses.x = playerX; gameState.playerloses.y = playerY;
                gameState.playerloses.anims.play('playerloses', true);
                gameState.gameEndText.setText('CLICK TO PLAY AGAIN');
                gameState.gameEnded = true;

            } else {
                randBomb2 = `bomb${Math.floor(Math.random() * 40) + 1}`;
                gameState.bomb2.anims.play(randBomb2, true);
            }
        })

        this.input.on('pointerup', () => {
            if(gameState.gameEnded === true) {
                gameState.score = 0;
                this.scene.restart();
            }
        })

        gameState.ravegirl1.on('animationcomplete', function() {
            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)];

            while (((raveGirlX === gameState.ravegirl2.x) && (raveGirlY === gameState.ravegirl2.y)) || 
            ((raveGirlX === gameState.ravegirl3.x) && (raveGirlY === gameState.ravegirl3.y))) {
                [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]
            }
            
            gameState.ravegirl1.x = raveGirlX;
            gameState.ravegirl1.y = raveGirlY;
            gameState.ravegirl1.setVelocityX(0); gameState.ravegirl1.setVelocityY(0)
            gameState.ravegirl1.anims.play('ravegirl1', true)
        })

        gameState.ravegirl2.on('animationcomplete', function() {
            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]; 
            
            while (((raveGirlX === gameState.ravegirl1.x) && (raveGirlY === gameState.ravegirl1.y)) || 
            ((raveGirlX === gameState.ravegirl3.x) && (raveGirlY === gameState.ravegirl3.y))) {
                [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]
            }

            gameState.ravegirl2.x = raveGirlX;
            gameState.ravegirl2.y = raveGirlY;
            gameState.ravegirl2.setVelocityX(0); gameState.ravegirl2.setVelocityY(0)
            gameState.ravegirl2.anims.play('ravegirl2', true)
        })

        gameState.ravegirl3.on('animationcomplete', function() {
            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)];
            
            while (((raveGirlX === gameState.ravegirl1.x) && (raveGirlY === gameState.ravegirl1.y)) || 
            ((raveGirlX === gameState.ravegirl2.x) && (raveGirlY === gameState.ravegirl2.y))) {
                [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]
            }

            gameState.ravegirl3.x = raveGirlX;
            gameState.ravegirl3.y = raveGirlY;
            gameState.ravegirl3.setVelocityX(0); gameState.ravegirl3.setVelocityY(0)
            gameState.ravegirl3.anims.play('ravegirl3', true)
        })

        this.physics.add.collider(gameState.ravegirl1, gameState.player, function() {
            gameState.heart.x = gameState.ravegirl1.x;
            gameState.heart.y = gameState.ravegirl1.y;
            gameState.heart.anims.play('heart', true);
            gameState.heart.on('animationcomplete', function() {
                gameState.heart.x = 111; gameState.heart.y = 111;
            })

            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)];
            
            while (((raveGirlX === gameState.ravegirl2.x) && (raveGirlY === gameState.ravegirl2.y)) || 
            ((raveGirlX === gameState.ravegirl3.x) && (raveGirlY === gameState.ravegirl3.y))) {
                [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]
            }

            gameState.ravegirl1.x = raveGirlX; gameState.ravegirl1.y = raveGirlY;
            gameState.ravegirl1.setVelocityX(0); gameState.ravegirl1.setVelocityY(0);
            gameState.ravegirl1.anims.stop(null, true);

            gameState.score += 1;
            gameState.scoreText.setText(`SCORE: ${gameState.score}`);
        })

        this.physics.add.collider(gameState.ravegirl2, gameState.player, function() {
            gameState.heart.x = gameState.ravegirl2.x;
            gameState.heart.y = gameState.ravegirl2.y;
            gameState.heart.anims.play('heart', true);
            gameState.heart.on('animationcomplete', function() {
                gameState.heart.x = 111; gameState.heart.y = 111;
            });

            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)];
            
            while (((raveGirlX === gameState.ravegirl1.x) && (raveGirlY === gameState.ravegirl1.y)) || 
            ((raveGirlX === gameState.ravegirl3.x) && (raveGirlY === gameState.ravegirl3.y))) {
                [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]
            }

            gameState.ravegirl2.x = raveGirlX; gameState.ravegirl2.y = raveGirlY;
            gameState.ravegirl2.setVelocityX(0); gameState.ravegirl2.setVelocityY(0);
            gameState.ravegirl2.anims.stop(null, true);

            gameState.score += 1;
            gameState.scoreText.setText(`SCORE: ${gameState.score}`);
        })

        this.physics.add.collider(gameState.ravegirl3, gameState.player, function() {
            gameState.heart.x = gameState.ravegirl3.x;
            gameState.heart.y = gameState.ravegirl3.y;
            gameState.heart.anims.play('heart', true);
            gameState.heart.on('animationcomplete', function() {
                gameState.heart.x = 111; gameState.heart.y = 111;
            });

            let [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)];
            
            while (((raveGirlX === gameState.ravegirl1.x) && (raveGirlY === gameState.ravegirl1.y)) || 
            ((raveGirlX === gameState.ravegirl2.x) && (raveGirlY === gameState.ravegirl2.y))) {
                [raveGirlX, raveGirlY] = gameState.raveGirlLocations[Math.floor(Math.random() * 40)]
            }

            gameState.ravegirl3.x = raveGirlX; gameState.ravegirl3.y = raveGirlY;
            gameState.ravegirl3.setVelocityX(0); gameState.ravegirl3.setVelocityY(0);
            gameState.ravegirl3.anims.stop(null, true);

            gameState.score += 1;
            gameState.scoreText.setText(`SCORE: ${gameState.score}`);
        })

        function isArrayInArray(arr, item) {
            var itemStr = JSON.stringify(item);
            var contains = arr.some(function(ele) {
                return JSON.stringify(ele) === itemStr;
            });
            return contains;
        }

        function getPlayerGridPosition(player) {
            let playerRow = getPlayerRow(player)
            let playerCol = getPlayerCol(player)
            return gameState.playerGridPositions[playerRow][playerCol]
        }
        
        function getPlayerRow(player) {
            if(player.y <= 74) {
                return 'row1';
            } else if(player.y > 74 && player.y <= 148) {
                return 'row2';
            } else if(player.y > 148 && player.y <= 222) {
                return 'row3';
            } else if(player.y > 222 && player.y <= 296) {
                return 'row4';
            } else if(player.y > 296 && player.y <= 370) {
                return 'row5';
            } else if(player.y > 370 && player.y <= 444) {
                return 'row6';
            } else {
                return 'row7';
            }
        }

        function getPlayerCol(player) {
            if(getPlayerRow(player) === 'row1' || getPlayerRow(player) === 'row3' || getPlayerRow(player) === 'row5' || getPlayerRow(player) === 'row7') {
                if(player.x <= 74) {
                    return 0;
                } else if(player.x > 74 && player.x <= 148) {
                    return 1;
                } else if(player.x > 148 && player.x <= 222) {
                    return 2;
                } else if(player.x > 222 && player.x <= 296) {
                    return 3;
                } else if(player.x > 296 && player.x <= 370) {
                    return 4;
                } else if(player.x > 370 && player.x <= 444) {
                    return 5;
                } else {
                    return 6;
                }
            } else {
                if(player.x <= 74) {
                    return 0;
                } else if(player.x > 148 && player.x <= 222) {
                    return 1;
                } else if(player.x > 296 && player.x <= 370) {
                    return 2;
                } else {
                    return 3;
                }
            }
        } 
    }
    
    update() {
        if(gameState.player.enable) {
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
            } else if(((gameState.cursors.up.isDown) && (gameState.cursors.right.isDown)) || ((gameState.cursors.up.isDown) && (gameState.cursors.left.isDown)) ||
            ((gameState.cursors.down.isDown) && (gameState.cursors.right.isDown)) || ((gameState.cursors.down.isDown) && (gameState.cursors.left.isDown))) {
                gameState.player.setVelocityX(0);
                gameState.player.setVelocityY(0); 
            } else {
                gameState.player.setVelocityX(0);
                gameState.player.setVelocityY(0);   
            }
        }
    }
}