class Player {
    constructor(game, initialPos) {
        this.cameras;
        this.activeCamera;
        this.initialPos = initialPos;
        this.bullets = [];
        this.container;
        this.controls;
        this.renderer;
        this.game = game;
        this.cameraFade;
        this.scene;
        this.renderer;
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

        this.createCameras();
    }

    createCameras() {
        const front = new THREE.Object3D(),
          back = new THREE.Object3D();
        
        front.position.set(300, 100, 1000);
        front.parent = this.model;
            
        back.position.set(0, 500, -800);
        back.parent = this.model;
    
        this.cameras = { front, back }; 
        this.activeCamera = this.cameras.back;
        this.cameras.active = back; // TODO: activeCamera and cameras.active are the same thing
        this.cameraFade = 1;
    
      }

    initPosition() {
        // cast down
        const dir = new THREE.Vector3(0, -1, 0);
        const pos = this.model.position.clone();
        pos.y += 200;
        const raycaster = new THREE.Raycaster(pos, dir);
        const box = this.game.environmentProxy;
    
        const intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
          this.model.position.y = pos.y - intersect[0].distance;
        }
    }

    renderView() {
        var renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth / 2, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        renderer.shadowMapDebug = true;
        this.game.container.appendChild(renderer.domElement);
    }
}