class Game {
  constructor() {
    const game = this;

    var sfxExt,
      options;

    if (!Detector.webgl) {
      Detector.addGetWebGLMessage();
    }

    this.modes = Object.freeze({
      NONE: Symbol('none'),
      PRELOAD: Symbol('preload'),
      INITIALISING: Symbol('initialising'),
      CREATING_LEVEL: Symbol('creating_level'),
      ACTIVE: Symbol('active'),
      GAMEOVER: Symbol('gameover'),
    });
    this.mode = this.modes.NONE;
    this.keySymbolsMapping = {
      'Space': 'Space',
      'KeyA': 'A',
      'KeyD': 'D',
      'KeyW': 'W',
      'KeyS': 'S',
      'KeyF': 'F',
      'ArrowLeft': '←',
      'ArrowRight': '→', 
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ControlRight': 'Right Ctrl',
      'Enter': 'Enter'
    };
    this.container;
    this.playersConfig = [
      [ {
          x: 478.56442482030235,
          y: 94.52902792598582,
          z: -445.68446898564974
        },
        {
          'KeyA': 'Left',
          'KeyD': 'Right',
          'KeyW': 'Forward',
          'KeyS': 'Backward',
          'Space': 'Jump',
          'KeyF': 'Razor Leaf'
        },
        "Player 1"
      ],
      [
        {
          x: -43.559679486111406,
          y: -8.251207953604283,
          z: -679.5223907753382
        },
        {
          'ArrowLeft': 'Left',
          'ArrowRight': 'Right', 
          'ArrowUp': 'Forward',
          'ArrowDown': 'Backward',
          'ControlRight': 'Jump',
          'Enter': 'Razor Leaf'
        },
        "Player 2"
      ]
    ]
    this.players = this.playersConfig.map((config) => {
      return new Player(this, ...config);
    });
    

    this.stats;
    this.controls;
    this.scene;
    this.cellSize = 16;
    this.interactive = false;
    this.levelIndex = 0;
    this.debug = false;
    this.debugPhysics = false;
    this.cameraFade = 0.05;
    this.mute = true;
    this.collect = [];

    this.models = {}; // reusable models

    // Main game container
    this.container = document.createElement('div');
    this.container.style.height = '100%';
    this.container.style.float = 'left';
    document.body.appendChild(this.container);

    sfxExt = SFX.supportsAudioType('mp3') ? 'mp3' : 'ogg';

    this.assetsPath = 'assets/';

    options = {
      assets: [
        `${this.assetsPath}sfx/i-choose-you.${sfxExt}`
      ],
      oncomplete() {
        game.init();
        game.animate();
      },
    };

    this.mode = this.modes.PRELOAD;

    document.getElementById('sfx-btn').onclick = function () { game.toggleSound(); };
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
      this.sfx['i-choose-you'].play();
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
      scene;

    game.mode = game.modes.INITIALISING;

    // TODO: move it to Player class
    game.players.forEach((player) => {
      player.camera = new THREE.PerspectiveCamera(45, window.innerWidth / 2 / window.innerHeight, 1, 13000);
    });

    scene = game.scene = new THREE.Scene();
    scene.background = new THREE.Color(col);
    this.scene.fog = new THREE.Fog(col, 1300, 1800);


    // Light and sun
    // const geometry = new THREE.SphereGeometry( 400,8, 8 );
    // const material = new THREE.MeshBasicMaterial( {color: 0xfffded} );
    // const sphere = new THREE.Mesh( geometry, material );
    // scene.add( sphere );
    // sphere.position.y = 1000;
    // sphere.position.z = 9500;


    light = new THREE.HemisphereLight(0xffffff, 0.7);
    light.position.set(0, 200, 0);
    scene.add(light);

    light = new THREE.DirectionalLight(0xffd633, 0.5);
    light.position.set(0, 1000, 1000);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.top = 3000;
    light.shadow.camera.bottom = -3000;
    light.shadow.camera.left = -3000;
    light.shadow.camera.right = 3000;
    light.shadow.camera.far = 3000;
    scene.add(light);


    // Bulbasaur model
    loader.load(`${game.assetsPath}fbx/01-Bulbasaur.fbx`, function (model) {
      
      const SCALE = 0.2,
        FPS = 24;
      
      var animations = model.animations[3],
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
      game.players.forEach((player) => {
        player.initModel(THREE.SkeletonUtils.clone(model), anims);
        player.createCameras();
        player.renderView();
      });

      game.keyboard = new Keyboard(game);

      game.loadEnvironment(loader);
    }, null, onError);
    
    // Leaf model 
    loader.load( `${game.assetsPath}fbx/leaf.fbx`, function (leaf) {
      leaf.scale.set(0.12, 0.12, 0.24);
      enableShadow.call(leaf);

      game.models.razorLeaf = leaf;
    }, null, onError);

    window.addEventListener('resize', () => { game.onWindowResize(); }, false);
    game.initSfx();
  }


  loadEnvironment(loader) {
    const game = this;
    var overlay;

    // Visible env
    loader.load(`${this.assetsPath}fbx/environment.fbx`, (model) => {
      game.scene.add(model);
      game.environment = model;
      model.name = 'Environment';
      enableShadow.call(model);
     
      // mock the proxy with the original environment
      game.environmentProxy = model;

      model.children.forEach((child) => {
        if(is(child, 'grass')) {
          child.material.side = THREE.DoubleSide;
        } else if(is(child, 'wall')) {
          child.visible = false;
        } else if(is(child, 'water')) {
          child.material.opacity = 0.5;
          child.material.transparent = true;
        }
      });

      game.players.forEach((player) => {
        player.setAction('idle');
        player.initPosition();  
      });

      game.mode = game.modes.ACTIVE;
      overlay = document.getElementById('overlay');
        overlay.classList.add('fade-in');
      overlay.addEventListener('animationend', (evt) => {
        evt.target.style.display = 'none';
      }, false);

    }, null, onError);
  }

  getMousePosition(clientX, clientY) {
    const pos = new THREE.Vector2();
    pos.x = (clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    pos.y = -(clientY / this.renderer.domElement.clientHeight) * 2 + 1;
    return pos;
  }

  onWindowResize() {
    var playersNumber = this.playersConfig.length;
    this.players.forEach((player) => {
      player.camera.aspect = window.innerWidth / playersNumber / window.innerHeight;
      player.camera.updateProjectionMatrix();
      player.renderer.setSize(window.innerWidth / playersNumber, window.innerHeight);
    });
  }

  animate() {
    
    const game = this,
      dt = game.clock.getDelta(),
      distance = 20;

    var dir,
      pos,
      proxy,
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

    game.players.forEach((player) => {
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
          proxy = game.environmentProxy;
          
          pos.y -= 9; // make sure that the ray touches the leaf
          
          proxy.children.filter((child) => !is(child, 'wall')).forEach((box) => {
            raycaster = new THREE.Raycaster(pos, dir);

            intersect = raycaster.intersectObject(box);
            if(shouldBulletStop(intersect)) {
              stopTheBullet(bullet);
            }
          });

          // Check if damage is inflicted
          game.players.forEach((_player) => {
            if(_player !== player) {
              intersect = raycaster.intersectObject(_player.model.children[2]);
              if(shouldBulletStop(intersect)) {
                stopTheBullet(bullet);
                _player.hp -= 5 + 10 * Math.random();
                if(_player.hp < 0) {
                  _player.hp = 0;
                  _player.setAction('defeated');
                }
                // TODO: move it to setter
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

      // Perform the transition between jump, walk and run
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

      if(player.renderer) {
        player.renderer.render(game.scene, player.camera);
      }

    });

  }


  reload() {
    this.players[0].model.position.set(
      478.56442482030235,
      94.52902792598582,
      -445.68446898564974
    );

    this.players[1].model.position.set(
      -43.559679486111406,
      -8.251207953604283,
      -679.5223907753382
    );

    this.players.forEach((p) => {
      p.hp = 100;
      p.hpBar.style.width = '100%';
      p.setAction('idle');
      document.getElementById('game-over-message').style.display = 'none';
    });
  }
}

