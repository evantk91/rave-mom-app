class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene'});
    }

    preload() {
        // Loader paths are relative to index.html at the repo root, not to this
        // file in js/, so they need no '../' despite the script living a level down.
        this.load.spritesheet('player', './sprite_sheets/png_sheets/raver_player1.png', { frameWidth: 64, frameHeight: 64 })

        for(var i = 1; i <= 3; i++) {
            this.load.spritesheet(`ravegirl${i}`, `./sprite_sheets/png_sheets/raver_girl${i}.png`, {frameWidth: 74, frameHeight: 74})
        }

        this.load.spritesheet('heart','./sprite_sheets/png_sheets/Heart.png', {frameWidth: 74, frameHeight: 74})
        this.load.spritesheet('playerloses', './sprite_sheets/png_sheets/raver_player_loses.png', {frameWidth: 74, frameHeight: 74})

        this.load.image('bg', './assets/images/free-to-use-sounds-Qgq7j_QCYtw-unsplash.jpg')
        this.load.image('block', './assets/images/Level-barriers.png')

        for(var i = 1; i <= 40; i++) {
            this.load.spritesheet(`bomb${i}`, `./sprite_sheets/png_sheets/bomb${i}.png`, {frameWidth: 518, frameHeight: 518})
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

        // Each rave girl takes a cell nothing else is on. The caller lists what
        // to avoid — the player, plus everyone already placed.
        //
        // This replaces three attempts at that idea, each with its own hole.
        // `setInitialRaveGirlPosition()[0]` and `[1]` were two *independent*
        // calls, so a rave girl took her x from one draw and her y from an
        // unrelated one; the mixed pair often wasn't a legal cell at all, which
        // is how rave girls ended up standing inside the blocks. The check
        // meant to keep them off the player compared a number against the
        // [x, y] array the function returns, so it was never true. And rave
        // girl 2 re-rolled at most once, so she could still land on rave girl 1.
        const [ravegirl1_x, ravegirl1_y] = drawRaveGirlPosition(cellsTouchingPlayer());
        gameState.ravegirl1 = this.physics.add.sprite(ravegirl1_x, ravegirl1_y, 'ravegirl1', 0)

        const [ravegirl2_x, ravegirl2_y] = drawRaveGirlPosition([...cellsTouchingPlayer(), [ravegirl1_x, ravegirl1_y]]);
        gameState.ravegirl2 = this.physics.add.sprite(ravegirl2_x, ravegirl2_y, 'ravegirl2', 0)

        const [ravegirl3_x, ravegirl3_y] = drawRaveGirlPosition([...cellsTouchingPlayer(), [ravegirl1_x, ravegirl1_y], [ravegirl2_x, ravegirl2_y]]);
        gameState.ravegirl3 = this.physics.add.sprite(ravegirl3_x, ravegirl3_y, 'ravegirl3', 0)

        // Drops the taken cells before drawing rather than re-rolling until it
        // gets lucky, so there's no retry that can run long and no way to
        // return a cell that's already occupied. 40 cells against at most five
        // exclusions, so the pool is never empty.
        function drawRaveGirlPosition(taken) {
            const free = BOARD.cells.filter(cell =>
                !taken.some(other => other[0] === cell[0] && other[1] === cell[1]));
            return free[Math.floor(Math.random() * free.length)];
        }

        // Every cell close enough that a rave girl placed there would already be
        // touching the player. Arcade bodies are the frame sizes — 64x64 for the
        // player, 74x74 for a rave girl — so they intersect once their centres
        // are within 69px on both axes.
        //
        // Naming just the player's own cell isn't enough, because the player is
        // hardly ever standing on one. Mid-corridor they sit 37px from the two
        // cells either side, and a rave girl dropped on either would be inside
        // the player the instant she appeared — collected on the spot for a free
        // point, then relocated again. Across every position the player can
        // occupy, excluding the single nearest cell still leaves an overlapping
        // cell drawable 85% of the time; this leaves none, and costs at most
        // three of the 40 cells.
        function cellsTouchingPlayer() {
            const touching = (a, b) => Math.abs(a - b) < (64 + 74) / 2;
            return BOARD.cells.filter(cell =>
                touching(cell[0], gameState.player.x) && touching(cell[1], gameState.player.y));
        }
        
        const blocks = this.physics.add.staticGroup();

        for (let i = 0; i < BOARD.blockLocations.length; i++) {
            blocks.create(BOARD.blockLocations[i][0], BOARD.blockLocations[i][1], 'block');
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
        let scoreFlag = false;

        gameState.bomb1.on('animationcomplete', function() {
            [playerX, playerY] = getPlayerGridPosition(gameState.player)
            const scoresURL = "https://rave-mom-api.onrender.com/api/v1/scores"

            if(isArrayInArray(BOARD.explosionPositions[randBomb1], [playerX, playerY]) && gameState.gameEnded === false) {
                gameState.scoreText.x = 60
                gameState.scoreText.setText(`GAME OVER... SCORE: ${gameState.score}`);

                const result = {
                    score: {
                        user_id: localStorage.getItem("user_id"),
                        score: gameState.score
                    }
                }

                fetch(scoresURL, {
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
                gameState.playerloses.once('animationrepeat', revealGameOverButtons);
                gameState.gameEndText.setText('CLICK TO PLAY AGAIN');
                gameState.gameEnded = true;

            } else {
                randBomb1 = `bomb${Math.floor(Math.random() * 40) + 1}`;
                gameState.bomb1.anims.play(randBomb1, true);
            }
        })

        gameState.bomb2.on('animationcomplete', function() {
            [playerX, playerY] = getPlayerGridPosition(gameState.player)
            const scoresURL = "https://rave-mom-api.onrender.com/api/v1/scores"

            if(isArrayInArray(BOARD.explosionPositions[randBomb2], [playerX, playerY]) && gameState.gameEnded === false) {
                gameState.scoreText.x = 60
                gameState.scoreText.setText(`GAME OVER... SCORE: ${gameState.score}`);

                const result = { 
                    score: {
                        user_id: localStorage.getItem("user_id"),
                        score: gameState.score
                    }
                }

                fetch(scoresURL, {
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
                gameState.playerloses.once('animationrepeat', revealGameOverButtons);
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
                hideGameOverButtons();
                this.scene.restart();
            }
        })

        gameState.ravegirl1.on('animationcomplete', function() {
            const [raveGirlX, raveGirlY] = drawRaveGirlPosition([
                ...cellsTouchingPlayer(),
                [gameState.ravegirl2.x, gameState.ravegirl2.y],
                [gameState.ravegirl3.x, gameState.ravegirl3.y]
            ]);

            gameState.ravegirl1.x = raveGirlX;
            gameState.ravegirl1.y = raveGirlY;
            gameState.ravegirl1.setVelocityX(0); gameState.ravegirl1.setVelocityY(0)
            gameState.ravegirl1.anims.play('ravegirl1', true)
        })

        gameState.ravegirl2.on('animationcomplete', function() {
            const [raveGirlX, raveGirlY] = drawRaveGirlPosition([
                ...cellsTouchingPlayer(),
                [gameState.ravegirl1.x, gameState.ravegirl1.y],
                [gameState.ravegirl3.x, gameState.ravegirl3.y]
            ]);

            gameState.ravegirl2.x = raveGirlX;
            gameState.ravegirl2.y = raveGirlY;
            gameState.ravegirl2.setVelocityX(0); gameState.ravegirl2.setVelocityY(0)
            gameState.ravegirl2.anims.play('ravegirl2', true)
        })

        gameState.ravegirl3.on('animationcomplete', function() {
            const [raveGirlX, raveGirlY] = drawRaveGirlPosition([
                ...cellsTouchingPlayer(),
                [gameState.ravegirl1.x, gameState.ravegirl1.y],
                [gameState.ravegirl2.x, gameState.ravegirl2.y]
            ]);

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

            const [raveGirlX, raveGirlY] = drawRaveGirlPosition([
                ...cellsTouchingPlayer(),
                [gameState.ravegirl2.x, gameState.ravegirl2.y],
                [gameState.ravegirl3.x, gameState.ravegirl3.y]
            ]);

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

            const [raveGirlX, raveGirlY] = drawRaveGirlPosition([
                ...cellsTouchingPlayer(),
                [gameState.ravegirl1.x, gameState.ravegirl1.y],
                [gameState.ravegirl3.x, gameState.ravegirl3.y]
            ]);

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

            const [raveGirlX, raveGirlY] = drawRaveGirlPosition([
                ...cellsTouchingPlayer(),
                [gameState.ravegirl1.x, gameState.ravegirl1.y],
                [gameState.ravegirl2.x, gameState.ravegirl2.y]
            ]);

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

        // The player is almost never standing exactly on a grid cell. Movement
        // is continuous at 192px/s, so at 60fps the sprite advances 3.2px per
        // frame and a bomb's animation finishes wherever it finishes. Any
        // answer to "which cell is the player on?" has to cope with being
        // between cells, because that is the normal case rather than the edge
        // one.
        //
        // Taking the nearest of the 40 legal cells always names a cell the
        // player is genuinely near: at most 37px away in a corridor, at most
        // 74px in a block interior, where all four neighbours are equidistant.
        //
        // The pair of band tests this replaces had no such bound. Even rows
        // hold only 4 legal cells, so getPlayerCol tested four narrow x bands
        // and funnelled everything outside them into `return 3` — the widest
        // gap being x in (74, 148]. A player at (75, 76) came back as
        // (481, 111), 444px from the cell it should have named, on the
        // opposite side of the board. Averaged over the whole board the old
        // answer was 57px wrong.
        //
        // This result feeds the bomb collision check, so a wrong cell means
        // being killed standing somewhere safe, or walking through a blast
        // untouched.
        //
        // Squared distances order identically to real ones and skip 40 square
        // roots. Exact ties keep the first cell found, so a player poised
        // midway between two cells reports one of them steadily instead of
        // alternating frame to frame.
        function getPlayerGridPosition(player) {
            return BOARD.cells.reduce((nearest, cell) => {
                const distance = (cell[0] - player.x) ** 2 + (cell[1] - player.y) ** 2;
                return distance < nearest.distance ? { cell: cell, distance: distance } : nearest;
            }, { cell: BOARD.cells[0], distance: Infinity }).cell;
        }
        
        // The Leaderboard and Log Out buttons live in the dashboard markup, but
        // only this scene knows when the game has ended. Toggling a class on
        // <body> hands that off without either script reaching into the other's
        // scope; game.css decides what the class means.
        function revealGameOverButtons() {
            document.body.classList.add('game-over');
        }

        function hideGameOverButtons() {
            document.body.classList.remove('game-over');
        }

    }
    
    update() {
        if(gameState.player.enable) {
            // Clear both axes before dispatching, so exactly one direction is
            // ever in effect. Each branch below sets a single axis and used to
            // leave the other holding whatever velocity it was last given —
            // so holding right and tapping down set velocity to (192, 192) and
            // the player kept travelling diagonally at 271px/s, 41% faster
            // than intended, until *every* key was released. Releasing down
            // alone did not stop it.
            //
            // This also replaces the two branches that used to sit at the end
            // of the chain. The first tried to suppress diagonals but was
            // unreachable: any diagonal combination has a key that satisfies an
            // earlier branch, so `down`/`up` always matched first. The second
            // handled "no keys held", which the unconditional clear now covers.
            gameState.player.setVelocityX(0);
            gameState.player.setVelocityY(0);

            // The bounds used to gate the *input* (`up.isDown && y >= 37`) and
            // were tested before the move, so the player took one more 3.2px
            // step, landed outside the boundary, and the test then failed for
            // good. Clamping the position instead keeps the player on the board
            // and keeps a direction from disabling itself by overshooting.
            gameState.player.x = Phaser.Math.Clamp(gameState.player.x, 37, 481);
            gameState.player.y = Phaser.Math.Clamp(gameState.player.y, 37, 481);

            // Most recently pressed key wins. Phaser stamps every Key with
            // timeDown, so the direction in effect is simply the held key with
            // the latest stamp — no keydown bookkeeping of our own.
            //
            // An if/else chain can't express this: it hardcodes one fixed
            // priority order, which made the controls asymmetric. Under the old
            // `down > up > right > left`, pressing up while holding right took
            // over, but pressing right while holding up did nothing at all.
            const directions = [
                { key: gameState.cursors.up,    vx: 0,    vy: -192, anim: 'walk-up' },
                { key: gameState.cursors.down,  vx: 0,    vy: 192,  anim: 'walk-down' },
                { key: gameState.cursors.left,  vx: -192, vy: 0,    anim: 'walk-left' },
                { key: gameState.cursors.right, vx: 192,  vy: 0,    anim: 'walk-right' }
            ];

            const held = directions.filter(direction => direction.key.isDown);

            if(held.length > 0) {
                // A max-by: fold over everything held, carrying the larger
                // timeDown forward, so this works for three or four keys at
                // once and not just a pair.
                //
                // What makes the stamp usable is that Phaser writes it only on
                // the down *transition* — `Key.onDown` sets timeDown inside an
                // `if (!this.isDown)` guard. The OS fires repeated keydown
                // events while a key is held, and those bump `repeats` but
                // leave timeDown frozen at the moment of the press. So the
                // stamps stay in press order for the whole hold and we don't
                // have to track key order ourselves.
                //
                // `>=` only matters for two keys stamped in the same event
                // batch; it breaks the tie toward the end of `directions`.
                // Which one wins is arbitrary, but it has to be *stable*, or a
                // tie would flip direction from frame to frame.
                const active = held.reduce((latest, direction) =>
                    direction.key.timeDown >= latest.key.timeDown ? direction : latest);

                // At an edge the chosen direction stays chosen and simply
                // produces no movement, rather than falling through to another
                // one. Falling through is what used to send you sideways along
                // the top row while you were holding up.
                const blocked =
                    (active.vy < 0 && gameState.player.y <= 37) ||
                    (active.vy > 0 && gameState.player.y >= 481) ||
                    (active.vx < 0 && gameState.player.x <= 37) ||
                    (active.vx > 0 && gameState.player.x >= 481);

                if(!blocked) {
                    gameState.player.setVelocityX(active.vx);
                    gameState.player.setVelocityY(active.vy);
                }

                gameState.player.anims.play(active.anim, true);
            }
        }
    }
}