class StartMenu extends Phaser.Scene {
    constructor() {
        super({key: 'StartMenu'});
    }

    preload() {
        // Relative to index.html at the repo root, not to this file in js/.
        this.load.spritesheet('startmenu', './sprite_sheets/png_sheets/start_menu.png', { frameWidth: 518, frameHeight: 666 })
    }

    create() {
        gameState.startmenu = this.physics.add.sprite(256, 333, 'startmenus', 0)

        this.anims.create({
            key: 'startmenu',
            frames: this.anims.generateFrameNumbers('startmenu', {start: 0, end: 15}),
            frameRate: 2,
            repeat: -1
        })

        gameState.startmenu.anims.play('startmenu', true);

        this.input.on('pointerup', () => {
            this.scene.stop('StartMenu')
            this.scene.start('GameScene')
        })
    }
}