class Player {
    constructor(game, initialPos) {
        this.camera;
        this.initialPos = initialPos;
        this.bullets = [];
        this.container;
        this.controls;
        this.renderer;
        this.game = game;
    }

    initModel(model, anims) {
        var initialPos = this.initialPos;

        this.model = model; // fbx
        this.mixer = model.mixer = new THREE.AnimationMixer(model);
        this.walk = anims.walk;
        this.idle = anims.idle;
        this.run = anims.run;
        this.jump = anims.jump;
        this.root = this.mixer.getRoot();

        this.mixer.addEventListener('finished', (e) => {
            this.game.action = 'idle';
        });

        this.model.position.set(initialPos.x, initialPos.y, initialPos.z);
        this.game.scene.add(model);
    }

}