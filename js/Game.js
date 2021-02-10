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
    this.player = new Player(
      this, 
      {x: 0, y: 0, z: 0},
      {
        'Space': 'jump',
        'KeyA': 'left',
        'KeyD': 'right',
        'KeyW': 'forward',
        'KeyS': 'backward',
        'KeyF': 'razorLeaf'
      },
      "Player 1"
    );

    this.player2 = new Player(
      this, 
      {x: 0, y: 0, z: 300},
      {
        'ArrowLeft': 'left',
        'ArrowRight': 'right', 
        'ArrowUp': 'forward',
        'ArrowDown': 'backward',
        'ControlRight': 'jump',
        'Enter': 'razorLeaf'
      },
      "Player 2"
    );
    
    this.stats;
    this.controls;
    this.scene;
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

    this.models = {}; // reusable models

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
    this.container.style.float = 'left';
    document.body.appendChild(this.container);


    const sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';
    const game = this;
    this.anims = []; // TODO: do we need this?

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

    document.getElementById('camera-btn').onclick = function () { game.player.switchCamera(); };
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


  init() {
    const col = 0xbaecfd,
      loader = new THREE.FBXLoader(),
      game = this;

    var light, 
      scene,
      player = game.player,
      player2 = game.player2;

    game.mode = game.modes.INITIALISING;

    // TODO: move it to Player class
    player.camera = new THREE.PerspectiveCamera(45, window.innerWidth / 2 / window.innerHeight, 1, 2000);
    player2.camera = new THREE.PerspectiveCamera(45, window.innerWidth / 2 / window.innerHeight, 1, 2000);


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


    // Load and init the model
    // TODO: make it another function
    loader.load(`${game.assetsPath}fbx/01-Bulbasaur.fbx`, function (model) {
      
      const SCALE = 0.2,
        FPS = 24;
      
      var player1 = game.player,
        player2 = game.player2,
        animations = model.animations[3],
        subclip = THREE.AnimationUtils.subclip,
        anims = {};

      // Model
      model.castShadow = true;
      model.rotationY = 0;
      model.children[0].visible = false; // TODO: remove the lamp
      model.name = 'Bulbasaur';
      model.scale.set(SCALE, SCALE, SCALE);
      enableShadow.call(model);
      anims.walk = model.animations[1];
      anims.idle = subclip(animations, 'idle', 0, 30, FPS);
      anims.run = subclip(animations, 'run', 92, 105, FPS);
      anims.jump = subclip(animations, 'jump', 125, 145, FPS);
      anims.defeated = subclip(animations, 'defeated', 175, 182, FPS);


      // Players
      player1.initModel(THREE.SkeletonUtils.clone(model), anims);
      player2.initModel(THREE.SkeletonUtils.clone(model), anims);


      game.keyboard = new Keyboard({
        game
      });

      player1.createCameras();
      player2.createCameras();
      game.loadEnvironment(loader);
    }, null, game.onError);

    // TODO: multiple leafs should be fired at once
    
    // Leaf model 
    loader.load( `${game.assetsPath}fbx/leaf.fbx`, function (leaf) {
      leaf.scale.set(0.12, 0.12, 0.24);
      enableShadow.call(leaf);

      game.models.razorLeaf = leaf;
    }, null, game.onError);

    player.renderView();
    player2.renderView();

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
      
      delete game.anims; // TODO: do we really need this?
      game.player.setAction('idle');
      game.player.initPosition();
      game.player2.setAction('idle');
      game.player2.initPosition();
      game.mode = game.modes.ACTIVE;
      const overlay = document.getElementById('overlay');
        overlay.classList.add('fade-in');
      overlay.addEventListener('animationend', (evt) => {
        evt.target.style.display = 'none';
      }, false);

    }, null, game.onError);
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
    this.player.camera.aspect = window.innerWidth / 2 / window.innerHeight;
    this.player.camera.updateProjectionMatrix();

    this.player.renderer.setSize(window.innerWidth / 2, window.innerHeight);

    this.player2.camera.aspect = window.innerWidth / 2 / window.innerHeight;
    this.player2.camera.updateProjectionMatrix();

    this.player2.renderer.setSize(window.innerWidth / 2, window.innerHeight);
  }

  animate() {
    
    const game = this,
      dt = game.clock.getDelta(),
      distance = 20;

    var bullet,
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
      };
      
    requestAnimationFrame(() => { game.animate(); });

    [game.player, game.player2].forEach((player) => {
      var bullets = player.bullets,
        cameras = player.cameras;

  
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

          // Check if damage is inflicted
          [game.player, game.player2].forEach((_player) => {
            if(_player !== player) {
              intersect = raycaster.intersectObject(_player.model.children[2]);
              if(shouldBulletStop(intersect)) {
                stopTheBullet(bullet);
                _player.hp -= 10;
                _player.hpBar.style.width = _player.hp + '%';
              }
            }

          });

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
          player.setAction('run');
        }
      }

      // Turning
      if (player.move != undefined) {
        if (player.move.forward != 0) {
          player.moveModel(dt);
        }
        if(player.model) {
          player.model.rotationY =  (player.model.rotationY || 0) + player.move.turn * dt;
          player.model.rotateY(player.move.turn * dt);
        }

      }

      // Camera handling
      if (cameras != undefined && cameras.active != undefined) {
        player.camera.position.lerp(cameras.active.getWorldPosition(new THREE.Vector3()), player.cameraFade);
        let pos;
        if (player.cameraTarget != undefined) {
          player.camera.position.copy(player.cameraTarget.position);
          pos = player.cameraTarget.target;
        } else {
          pos = player.model.position.clone();
          pos.y += 60;
        }
        player.camera.lookAt(pos);
      }

      player.renderer.render(game.scene, player.camera);

    });
    if (game.stats != undefined) {
      game.stats.update();
    }
  }

  // Util function 
  // TODO: move it
  onError(error) {
    const msg = console.error(JSON.stringify(error));
    console.error(error);
  }
}

