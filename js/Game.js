class Game {
  constructor() {
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    this.modes = Object.freeze({
      NONE: Symbol('none'),
      PRELOAD: Symbol('preload'),
      INITIALISING: Symbol('initialising'),
      CREATING_LEVEL: Symbol('creating_level'),
      ACTIVE: Symbol('active'),
      GAMEOVER: Symbol('gameover'),
    });
    this.mode = this.modes.NONE;

    this.container;
    this.player = { };
    this.stats;
    this.controls;
    this.camera;
    this.scenes;
    this.renderer;
    this.cellSize = 16;
    this.interactive = false;
    this.levelIndex = 0;
    this._hints = 0;
    this.score = 0;
    this.debug = false;
    this.debugPhysics = false;
    this.cameraFade = 0.05;
    this.mute = false;
    this.collect = [];

    this.messages = {
      text: [
        'Welcome to Bulbasaur duel!',
        'GOOD LUCK!',
      ],
      index: 0,
    };

    if (localStorage && !this.debug) {
      // const levelIndex = Number(localStorage.getItem('levelIndex'));
      // if (levelIndex!=undefined) this.levelIndex = levelIndex;
    }

    this.container = document.createElement('div');
    this.container.style.height = '100%';
    document.body.appendChild(this.container);

    const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
    const game = this;
    this.anims = []; // ['ascend-stairs', 'gather-objects', 'look-around', 'push-button'];
    this.tweens = [];

    this.assetsPath = '../assets/';

    const options = {
      assets: [
        `${this.assetsPath}sfx/i-choose-you.${sfxExt}`
      ],
      oncomplete() {
        game.init();
        game.animate();
      },
    };

    this.anims.forEach((anim) => { options.assets.push(`${game.assetsPath}fbx/${anim}.fbx`); });

    this.mode = this.modes.PRELOAD;

    document.getElementById('camera-btn').onclick = function () { game.switchCamera(); };
    document.getElementById('sfx-btn').onclick = function () { game.toggleSound(); };

    this.actionBtn = document.getElementById('action-btn');

    this.clock = new THREE.Clock();

    const preloader = new Preloader(options);
  }

  toggleSound() {
    this.mute = !this.mute;
    const btn = document.getElementById('sfx-btn');

    if (this.mute) {
      for (const prop in this.sfx) {
        const sfx = this.sfx[prop];
        if (sfx instanceof SFX) sfx.stop();
      }
      btn.innerHTML = '<i class="fas fa-volume-off"></i>';
    } else {
      this.sfx.factory.play;
      this.sfx.fan.play();
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
  }

  contextAction() {
    console.log(`contextAction called ${JSON.stringify(this.onAction)}`);
    if (this.onAction !== undefined) {
      if (this.onAction.action != undefined) {
        this.action = this.onAction.action;
      }
    }
  }

  switchCamera(fade = 0.05) {
    const cams = Object.keys(this.player.cameras);
    cams.splice(cams.indexOf('active'), 1);
    let index;
    for (const prop in this.player.cameras) {
      if (this.player.cameras[prop] == this.player.cameras.active) {
        index = cams.indexOf(prop) + 1;
        if (index >= cams.length) index = 0;
        this.player.cameras.active = this.player.cameras[cams[index]];
        break;
      }
    }
    this.cameraFade = fade;
  }

  initSfx() {
    this.sfx = {};
    this.sfx.context = new (window.AudioContext || window.webkitAudioContext)();
    const list = ['i-choose-you'];
    const game = this;
    list.forEach((item) => {
      game.sfx[item] = new SFX({
        context: game.sfx.context,
        src: { mp3: `${game.assetsPath}sfx/${item}.mp3`, ogg: `${game.assetsPath}sfx/${item}.ogg` },
        volume: 0.3,
      });
    });
  }

  set activeCamera(object) {
    this.player.cameras.active = object;
  }



  init() {
    const col = 0xbaecfd,
      loader = new THREE.FBXLoader(),
      game = this;

    var light, 
      scene,
      player = game.player,
      renderer;

    game.mode = game.modes.INITIALISING;

    game.camera = new THREE.PerspectiveCamera
      (
        45, window.innerWidth / window.innerHeight, 1, 2000
      );

    scene = game.scene = new THREE.Scene();
    scene.background = new THREE.Color(col);
    //this.scene.fog = new THREE.Fog(col, 500, 1500);

    light = new THREE.HemisphereLight(0xffffff, 0.5);
    light.position.set(0, 200, 0);
    scene.add(light);

    light = new THREE.DirectionalLight(0xffd633, 0.5);
    light.position.set(0, 2000, 1000);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.top = 3000;
    light.shadow.camera.bottom = -3000;
    light.shadow.camera.left = -3000;
    light.shadow.camera.right = 3000;
    light.shadow.camera.far = 3000;
    scene.add(light);

    // TODO: add orbit controls

    // Load and init the model
    loader.load(`${game.assetsPath}fbx/01-Bulbasaur.fbx`, function (model) {
      const SCALE = 0.2,
        FPS = 24;
      
      var mixer,
        player = game.player,
        enemy,
        animations = model.animations[3],
        subclip = THREE.AnimationUtils.subclip,

      mixer = model.mixer = new THREE.AnimationMixer(model);
      mixer.addEventListener('finished', (e) => {
        game.action = 'idle';
      });
      model.castShadow = true;
      model.rotationY = 0;
      model.children[0].visible = false; // TODO: remove the lamp

      player.mixer = mixer;
      player.root = mixer.getRoot();

      model.name = 'Bulbasaur';
      model.scale.set(SCALE, SCALE, SCALE);

      enableShadow.call(model);

      scene.add(model);

      player.model = model;
      player.model.position.set(0, -20, -20);
      player.bullets = [];

      player.walk = model.animations[1];
      player.idle = subclip(animations, 'idle', 0, 30, FPS);
      player.run = subclip(animations, 'run', 92, 105, FPS);
      player.jump = subclip(animations, 'jump', 125, 145, FPS);

      // Enemy model for debugging purposes
      enemy = game.enemy = THREE.SkeletonUtils.clone(model);
      enemy.position.set(0, -20, 300);
      enemy.rotateY(Math.PI);
      enemy.hp = 100;
      scene.add(enemy);

      game.joystick = new JoyStick({
        onMove: game.playerControl,
        game
      });

      game.createCameras();
      game.loadEnvironment(loader);
    }, null, game.onError);

    // TODO: multiple leafs should be fired at once
    
    // Leaf model 
    loader.load( `${game.assetsPath}fbx/leaf.fbx`, function (leaf) {
      leaf.scale.set(0.12, 0.12, 0.24);
      enableShadow.call(leaf);

      player.razorLeaf = leaf;
    }, null, game.onError);

    renderer = game.renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    renderer.shadowMapDebug = true;
    game.container.appendChild(renderer.domElement);

    window.addEventListener('resize', () => { game.onWindowResize(); }, false);

    // stats
    // if (game.debug) {
    //   game.stats = new Stats();
    //   game.container.appendChild(game.stats.dom);
    // }

    game.initSfx();
  }


  loadEnvironment(loader) {
    const game = this;

    // Visible env
    loader.load(`${this.assetsPath}fbx/environment4.fbx`, (model) => {
      game.scene.add(model);
      model.name = 'Environment';
      enableShadow.call(model);
     
      // mock the proxy with the original environment
      game.environmentProxy = model.children[1]; // TODO: remove camera from mesh
      game.loadNextAnim(loader);
    }, null, game.onError);
  }

  playerControl(forward, turn) {
    // console.log(`playerControl(${forward}), ${turn}`);
    turn = -turn;

    if (forward == 0 && turn == 0) {
      delete this.player.move;
    } else {
      this.player.move = { forward, turn };
    }

    if (forward > 0) {
      if (
        this.player.action != 'jump' && 
        this.player.action != 'walk' &&
        this.player.action != 'run'
      ) {
        this.action = 'walk';
      }  
    } else if (forward < -0.2) {
      if (this.player.action != 'walk') {
        this.action = 'walk';
      } 
    } else if (this.player.action == 'walk' || this.player.action == 'run') { 
      this.action = 'idle';
    }
  }

  createCameras() {
    const front = new THREE.Object3D(),
      back = new THREE.Object3D();

    var player = this.player;
    
    front.position.set(300, 100, 1000);
    front.parent = player.model;
	    
    back.position.set(0, 500, -800);
    back.parent = player.model;

	  player.cameras = { front, back }; 
    game.activeCamera = player.cameras.back;
    game.cameraFade = 1;

  }

  // TODO: continue here

  loadNextAnim(loader) {
    const anim = this.anims.pop();
    const game = this;
      delete game.anims;
      game.action = 'idle';
      game.initPlayerPosition();
      game.mode = game.modes.ACTIVE;
      const overlay = document.getElementById('overlay');
        overlay.classList.add('fade-in');
      overlay.addEventListener('animationend', (evt) => {
        evt.target.style.display = 'none';
      }, false);

  }

  initPlayerPosition() {
    // cast down
    const dir = new THREE.Vector3(0, -1, 0);
    const pos = this.player.model.position.clone();
    pos.y += 200;
    const raycaster = new THREE.Raycaster(pos, dir);
    const box = this.environmentProxy;

    const intersect = raycaster.intersectObject(box);
    if (intersect.length > 0) {
      this.player.model.position.y = pos.y - intersect[0].distance;
    }
  }

  getMousePosition(clientX, clientY) {
    const pos = new THREE.Vector2();
    pos.x = (clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    pos.y = -(clientY / this.renderer.domElement.clientHeight) * 2 + 1;
    return pos;
  }

  showMessage(msg, fontSize = 20, onOK = null) {
    const txt = document.getElementById('message_text');
    txt.innerHTML = msg;
    txt.style.fontSize = `${fontSize}px`;
    const btn = document.getElementById('message_ok');
    const panel = document.getElementById('message');
    const game = this;
    if (onOK != null) {
      btn.onclick = function () {
        panel.style.display = 'none';
        onOK.call(game);
      };
    } else {
      btn.onclick = function () {
        panel.style.display = 'none';
      };
    }
    panel.style.display = 'flex';
  }

  loadJSON(name, callback) {
    const xobj = new XMLHttpRequest();
    xobj.overrideMimeType('application/json');
    xobj.open('GET', `${name}.json`, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == '200') {
        // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
        callback(xobj.responseText);
			  }
    };
    xobj.send(null);
	 }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  set action(name) {
    if (this.player.action == name) return;
    const anim = this.player[name];
    const action = this.player.mixer.clipAction(anim, this.player.root);
    this.player.mixer.stopAllAction();
    this.player.action = name;

    switch(name) {
      case 'walk':
        action.timeScale = (this.player.move != undefined && this.player.move.forward < 0) ? -0.3 : 1;
        break;
      case 'idle':
        action.timeScale = 0.5;
        break;
    }

    action.time = 0;
    action.fadeIn(0.5);
    if (name == 'jump') {
      action.loop = THREE.LoopOnce;
    }
    action.play();
    this.player.actionTime = Date.now();
  }

  movePlayer(dt) {
    const pos = this.player.model.position.clone();
    pos.y += 60;
    const dir = new THREE.Vector3();
    this.player.model.getWorldDirection(dir);
    if (this.player.move.forward < 0) dir.negate();
    let raycaster = new THREE.Raycaster(pos, dir);
    let blocked = false;
    const box = this.environmentProxy;

    if (this.environmentProxy != undefined) {
      const intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) blocked = true;
      }
    }

    if (!blocked) {
      if (this.player.move.forward > 0) {
        var speed;
        switch (this.player.action) {
          case 'run':
            speed = 200;
            break;
          case 'jump':
            speed = 350;
            break;
          default:
            speed = 100;
        }
        
        this.player.model.translateZ(dt * speed);
      } else {
        this.player.model.translateZ(-dt * 30);
      }
    }

    if (this.environmentProxy != undefined) {
      // cast left
      dir.set(-1, 0, 0);
      dir.applyMatrix4(this.player.model.matrix);
      dir.normalize();
      raycaster = new THREE.Raycaster(pos, dir);

      let intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) this.player.model.translateX(50 - intersect[0].distance);
      }

      // cast right
      dir.set(1, 0, 0);
      dir.applyMatrix4(this.player.model.matrix);
      dir.normalize();
      raycaster = new THREE.Raycaster(pos, dir);

      intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
        if (intersect[0].distance < 50) this.player.model.translateX(intersect[0].distance - 50);
      }

      // cast down
      dir.set(0, -1, 0);
      pos.y += 200;
      raycaster = new THREE.Raycaster(pos, dir);
      const gravity = 30;

      intersect = raycaster.intersectObject(box);
      if (intersect.length > 0) {
        const targetY = pos.y - intersect[0].distance;
        if (targetY > this.player.model.position.y) {
          // Going up
          this.player.model.position.y = 0.8 * this.player.model.position.y + 0.2 * targetY;
          this.player.velocityY = 0;
        } else if (targetY < this.player.model.position.y) {
          // Falling
          if (this.player.velocityY == undefined) this.player.velocityY = 0;
          this.player.velocityY += dt * gravity;
          this.player.model.position.y -= this.player.velocityY;
          if (this.player.model.position.y < targetY) {
            this.player.velocityY = 0;
            this.player.model.position.y = targetY;
          }
        }
      }
    }
  }

  animate() {
    const game = this,
      dt = game.clock.getDelta(),
      distance = 20,
      player = game.player;

    var bullets = game.player.bullets,
      bullet,
      velocity,
      dir,
      pos,
      box,
      raycaster,
      intersect,
      stopTheBullet = function(bullet) {
        bullet.velocity = new THREE.Vector3(0,0,0);
        bullet.alive = false;
      },
      shouldBulletStop = function(intersect) {
        return intersect.length > 0 && intersect[0].distance < distance;
      },
      enemy = game.enemy,
      cameras = player.cameras;
      
    requestAnimationFrame(() => { game.animate(); });

    // Handle bullets
    if(bullets) {
      for(var i = bullets.length - 1; i >= 0; i--) {
        var bullet = bullets[i],
          velocity = bullet.velocity;

        if(!bullet.alive) {
          bullets.splice(i, 1);
          continue;
        }

        if(!velocity.x && !velocity.y && !velocity.z) {
          continue;
        }

        dir = velocity.clone().normalize();
        pos = bullet.position.clone();
        box = game.environmentProxy;
          
        // TODO: improve collision detetion mechanism
        pos.y -= 9; // make sure that the ray touches the leaf
        raycaster = new THREE.Raycaster(pos, dir);

        intersect = raycaster.intersectObject(box);
        if(shouldBulletStop(intersect)) {
          stopTheBullet(bullet);
        }

        // Check if the enemy is hit
        intersect = raycaster.intersectObject(game.enemy.children[2]);
        if(shouldBulletStop(intersect)) {
          stopTheBullet(bullet);
          enemy.hp -= 10;
          document.getElementById('hp-bar-points').style.width = enemy.hp + '%';
        }

        bullet.position.add(bullet.velocity);
        if(velocity.x !== 0 || velocity.y  !== 0 || velocity.z  !== 0 ) {
          bullet.rotateY(30 * dt, 10 * dt, 5 * dt);
        } 

      }
    }

    // Update the mixer
    if (player.mixer != undefined && game.mode == game.modes.ACTIVE) {
      player.mixer.update(dt);
    }

    // Perform the transition between jump/walk and run
    if (player.action == 'walk' || player.action == 'jump') {
      const elapsedTime = Date.now() - player.actionTime;
      if (
        elapsedTime > (player.action == 'walk' ? 1000 : 650) 
        &&
        player.move?.forward > 0
      ) {
        game.action = 'run';
      }
    }

    // Turning
    if (player.move != undefined) {
      if (player.move.forward != 0) {
        game.movePlayer(dt);
      }
      player.model.rotationY += player.move.turn * dt;
      player.model.rotateY(player.move.turn * dt);
    }

    // Camera handling
    if (cameras != undefined && cameras.active != undefined) {
      game.camera.position.lerp(cameras.active.getWorldPosition(new THREE.Vector3()), game.cameraFade);
      let pos;
      if (game.cameraTarget != undefined) {
        game.camera.position.copy(game.cameraTarget.position);
        pos = game.cameraTarget.target;
      } else {
        pos = player.model.position.clone();
        pos.y += 60;
      }
      game.camera.lookAt(pos);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.stats != undefined) this.stats.update();
  }

  // Utils function 
  // TODO: move it
  onError(error) {
    const msg = console.error(JSON.stringify(error));
    console.error(error.message);
  }
}

