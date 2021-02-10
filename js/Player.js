class Player {
    constructor(game, initialPos, keyboardMapping, name) {
        this.action;
        this.cameras;
        this.activeCamera;
        this.initialPos = initialPos;
        this.bullets = [];
        this.name = name;
        this.container;
        this.controls;
        this.renderer;
        this.game = game;
        this.cameraFade = 1;
        this.scene;
        this.renderer;
        this.hp = 100;
        this.keyboardMapping = keyboardMapping;
        this.move = {
          forward: 0,
          turn: 0
        }
    }

    initModel(model, anims) {
        var initialPos = this.initialPos;

        this.model = model; // fbx
        this.mixer = model.mixer = new THREE.AnimationMixer(model);
        this.walk = anims.walk;
        this.idle = anims.idle;
        this.run = anims.run;
        this.jump = anims.jump;
        this.defeated = anims.defeated;
        this.root = this.mixer.getRoot();

        this.mixer.addEventListener('finished', (e) => {
            this.setAction('idle');
        });

        this.model.position.set(initialPos.x, initialPos.y, initialPos.z);
        this.game.scene.add(model);

        this.createCameras();
    }

    setAction(name) {

      if (this.action == 'defeated' || this.action == name || !this.mixer) {
        return;
      }

      const anim = this[name];
      const action = this.mixer.clipAction(anim, this.root);
      this.mixer.stopAllAction();
      this.action = name;
  
      switch(name) {
        case 'walk':
          action.timeScale = (this.move != undefined && this.move.forward < 0) ? -0.3 : 1;
          break;
        case 'idle':
          action.timeScale = 0.5;
          break;
        case 'defeated':
          action.timeScale = 0.5;
          action.clampWhenFinished = true;
          document.getElementById('game-over-message').style.display = 'block';
          break;
      }
  
      action.time = 0;
      action.fadeIn(0.5);
      if (name == 'jump' || name == 'defeated') {
        action.loop = THREE.LoopOnce;
      }
      action.play();
      this.actionTime = Date.now();
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

        var playerContainer = document.createElement('div');
        
        this.game.container.appendChild(playerContainer);
        playerContainer.style.float = 'left';
        playerContainer.style.position = 'relative';
        

        var hpBarBorder = document.createElement('div'),
          hpBarPoints = this.hpBar = document.createElement('div');
        hpBarBorder.setAttribute('class', 'hp-bar-border');
        hpBarPoints.setAttribute('class', "hp-bar-points");
        hpBarBorder.appendChild(hpBarPoints);
        
        playerContainer.appendChild(hpBarBorder);
        playerContainer.appendChild(renderer.domElement);
        
        //<div id="hp-bar-border"><div id="hp-bar-points"></div></div>
    }

    initAction() {
        var forward = this.move.forward;
        // console.log(`playerControl(${forward}), ${turn}`);
    
        // if (forward == 0 && turn == 0) {
        //   delete this.move;
        // } else {
        //   this.move = { forward, turn };
        // }

        if(this.hp <= 0) {
          this.setAction('defeated');
          return;
        }
    
        if (forward > 0) {
          if (
            this.action != 'jump' && 
            this.action != 'walk' &&
            this.action != 'run'
          ) {
            this.setAction('walk');
          }  
        } else if (forward < -0.2) {
          if (this.action != 'walk') {
            this.setAction('walk');
          } 
        } else if (this.action == 'walk' || this.action == 'run') { 
          this.setAction('idle');
        }
      }
    

    switchCamera(fade = 0.05) {
        const cams = Object.keys(this.cameras);
        cams.splice(cams.indexOf('active'), 1);
        let index;
        for (const prop in this.cameras) {
          if (this.cameras[prop] == this.cameras.active) {
            index = cams.indexOf(prop) + 1;
            if (index >= cams.length) index = 0;
            this.cameras.active = this.cameras[cams[index]];
            break;
          }
        }
        this.cameraFade = fade;
    }

    // TODO: do we really need this?
    set activeCamera(object) {
        this.cameras.active = object;
    }
    

    // TODO: change to "move" (naming conflict: there's a property with the same name)
    moveModel(dt) { 
      this.initAction();
      const pos = this.model.position.clone();
      pos.y += 60;
      const dir = new THREE.Vector3();
      this.model.getWorldDirection(dir);
      if (this.move.forward < 0) dir.negate();
      let raycaster = new THREE.Raycaster(pos, dir);
      let blocked = false;
      const box = this.game.environmentProxy;

      if (box != undefined) {
      const intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
          if (intersect[0].distance < 50) blocked = true;
      }
      }

        if (!blocked) {
        if (this.move.forward > 0) {
          var speed;
          switch (this.action) {
          case 'run':
              speed = 200;
              break;
          case 'jump':
              speed = 250;
              break;
          default:
              speed = 100;
          }
          
          this.model.translateZ(dt * speed);
        } else {
            this.model.translateZ(-dt * 30);
        }
        }

        if (box != undefined) {
        // cast left
        dir.set(-1, 0, 0);
        dir.applyMatrix4(this.model.matrix);
        dir.normalize();
        raycaster = new THREE.Raycaster(pos, dir);

        let intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
            if (intersect[0].distance < 50) this.model.translateX(50 - intersect[0].distance);
        }

        // cast right
        dir.set(1, 0, 0);
        dir.applyMatrix4(this.model.matrix);
        dir.normalize();
        raycaster = new THREE.Raycaster(pos, dir);

        intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
            if (intersect[0].distance < 50) this.model.translateX(intersect[0].distance - 50);
        }

        // cast down
        dir.set(0, -1, 0);
        pos.y += 200;
        raycaster = new THREE.Raycaster(pos, dir);
        const gravity = 30;

        intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
            const targetY = pos.y - intersect[0].distance;
            if (targetY > this.model.position.y) {
            // Going up
            this.model.position.y = 0.8 * this.model.position.y + 0.2 * targetY;
            this.velocityY = 0;
            } else if (targetY < this.model.position.y) {
            // Falling
            if (this.velocityY == undefined) this.velocityY = 0;
            this.velocityY += dt * gravity;
            this.model.position.y -= this.velocityY;
            if (this.model.position.y < targetY) {
                this.velocityY = 0;
                this.model.position.y = targetY;
            }
            }
        }
        }
    }
}