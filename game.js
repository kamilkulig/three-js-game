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
    this.scene;
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
    document.getElementById('action-btn').onclick = function () { game.contextAction(); };
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
    const game = this;
    const dt = this.clock.getDelta();
    var bullets = game.player.bullets;

    requestAnimationFrame(() => { game.animate(); });

    if(bullets) {
      for(var i = bullets.length - 1; i >= 0; i--) {
        var bullet = bullets[i];
        if(!bullet.alive) {
          bullets.splice(i, 1);
          continue;
        }

        if(!bullet.velocity.x && !bullet.velocity.y && !bullet.velocity.z) {
          continue;
        }
        var dir =  bullet.velocity.clone().normalize(),
          pos = bullet.position.clone(),
          box = game.environmentProxy;
          
        // TODO: improve collision detetion mechanism
        
        pos.y -= 9;

        var raycaster = new THREE.Raycaster(pos, dir);
        var distance = 20;

        // // visualize raycaster for test purposes
        // // dot
        // var geometry = new THREE.SphereGeometry( 1, 32, 32 );
        // var material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
        // var sphere = new THREE.Mesh( geometry, material );
        // sphere.position.set(pos.x, pos.y, pos.z);
        // game.scene.add(sphere);

        // // line
        // var material2 = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        // var points = [];
        // points.push( new THREE.Vector3(pos.x, pos.y, pos.z));
        // points.push(
        //   new THREE.Vector3(
        //     pos.x + dir.x * distance,
        //     pos.y  + dir.y * distance,
        //     pos.z  + dir.z * distance
        //   )
        // );

        // var geometry2 = new THREE.BufferGeometry().setFromPoints( points );
        // var line = new THREE.Line( geometry2, material2 );
        // game.scene.add( line );

        let intersect = raycaster.intersectObject(box);
        if (intersect.length > 0) {
         //console.log(intersect[0].distance);
          if(intersect[0].distance < distance) {
            bullet.velocity = new THREE.Vector3(0,0,0);
            bullet.alive = false;
          }
        }

        // Check if the enemy is hit
        intersect = raycaster.intersectObject(game.enemy.children[2]);
        if (intersect.length > 0) {
          if(intersect[0].distance < distance) {
            bullet.velocity = new THREE.Vector3(0,0,0);
            bullet.alive = false;
            game.enemy.hp -= 10;
            document.getElementById('hp-bar-points').style.width = game.enemy.hp + '%';
          }
        }

        
        bullet.position.add(bullet.velocity);
        if(bullet.velocity.x !== 0 || bullet.velocity.y  !== 0 || bullet.velocity.z  !== 0 ) {
          bullet.rotateY(30 * dt, 10 * dt, 5 * dt);
        } 

      }
    }


    if (this.tweens.length > 0) {
      this.tweens.forEach((tween) => { tween.update(dt); });
    }

    if (this.player.mixer != undefined && this.mode == this.modes.ACTIVE) {
      this.player.mixer.update(dt);
    }

    if (this.player.action == 'walk') {
      const elapsedTime = Date.now() - this.player.actionTime;
      if (elapsedTime > 1000 && this.player.move.forward > 0) this.action = 'run';
    }

    // TODO: refactor - below code too similiar to the above one
    if (this.player.action == 'jump') {
      const elapsedTime = Date.now() - this.player.actionTime;
      if (elapsedTime > 650 && this.player.move.forward > 0) this.action = 'run';
    }

    if (this.player.move != undefined) {
      if (this.player.move.forward != 0) this.movePlayer(dt);
      this.player.model.rotationY += this.player.move.turn * dt;
      this.player.model.rotateY(this.player.move.turn * dt);
    }

    if (this.player.cameras != undefined && this.player.cameras.active != undefined) {
      this.camera.position.lerp(this.player.cameras.active.getWorldPosition(new THREE.Vector3()), this.cameraFade);
      let pos;
      if (this.cameraTarget != undefined) {
        this.camera.position.copy(this.cameraTarget.position);
        pos = this.cameraTarget.target;
      } else {
        pos = this.player.model.position.clone();
        pos.y += 60;
      }
      this.camera.lookAt(pos);
    }

    this.actionBtn.style = 'display:none;';
    let trigger = false;

    if (this.doors !== undefined) {
      this.doors.forEach((door) => {
        if (game.player.model.position.distanceTo(door.trigger.position) < 100) {
          game.actionBtn.style = 'display:block;';
          game.onAction = { action: 'push-button', mode: 'open-doors', index: 0 };
          trigger = true;
        }
      });
    }

    if (this.collect !== undefined && !trigger) {
      this.collect.forEach((object) => {
        if (object.visible && game.player.model.position.distanceTo(object.position) < 100) {
          game.actionBtn.style = 'display:block;';
          game.onAction = {
            action: 'gather-objects', mode: 'collect', index: 0, src: 'usb.jpg',
          };
          trigger = true;
        }
      });
    }

    if (!trigger) delete this.onAction;

    if (this.fans !== undefined) {
      let vol = 0;
      this.fans.forEach((fan) => {
        const dist = fan.position.distanceTo(game.player.model.position);
        const tmpVol = 1 - dist / 1000;
        if (tmpVol > vol) vol = tmpVol;
        fan.rotateZ(dt);
      });
      this.sfx.fan.volume = vol;
    }

    this.renderer.render(this.scene, this.camera);

    if (this.stats != undefined) this.stats.update();
  }

  onError(error) {
    const msg = 		console.error(JSON.stringify(error));
    console.error(error.message);
  }
}

class Easing {
  // t: current time, b: begInnIng value, c: change In value, d: duration
  constructor(start, end, duration, startTime = 0, type = 'linear') {
    this.b = start;
    this.c = end - start;
    this.d = duration;
    this.type = type;
    this.startTime = startTime;
  }

  value(time) {
    this.t = time - this.startTime;
    return this[this.type]();
  }

  linear() {
    return this.c * (this.t / this.d) + this.b;
  }

  inQuad() {
    return this.c * (this.t /= this.d) * this.t + this.b;
  }

  outQuad() {
    return -this.c * (this.t /= this.d) * (this.t - 2) + this.b;
  }

  inOutQuad() {
    if ((this.t /= this.d / 2) < 1) return this.c / 2 * this.t * this.t + this.b;
    return -this.c / 2 * ((--this.t) * (this.t - 2) - 1) + this.b;
  }

  projectile() {
    const { c } = this;
    const { b } = this;
    const { t } = this;
    this.t *= 2;
    let result;
    let func;
    if (this.t < this.d) {
      result = this.outQuad();
      func = 'outQuad';
    } else {
      this.t -= this.d;
      this.b += c;
      this.c = -c;
      result = this.inQuad();
      func = 'inQuad';
    }
    console.log(`projectile: ${result.toFixed(2)} time:${this.t.toFixed(2)} func:${func}`);
    this.b = b;
    this.c = c;
    this.t = t;
    return result;
  }

  inCubic() {
    return this.c * (this.t /= this.d) * this.t * this.t + this.b;
  }

  outCubic() {
    return this.c * ((this.t = this.t / this.d - 1) * this.t * this.t + 1) + this.b;
  }

  inOutCubic() {
    if ((this.t /= this.d / 2) < 1) return this.c / 2 * this.t * this.t * this.t + this.b;
    return this.c / 2 * ((this.t -= 2) * this.t * this.t + 2) + this.b;
  }

  inQuart() {
    return this.c * (this.t /= this.d) * this.t * this.t * this.t + this.b;
  }

  outQuart() {
    return -this.c * ((this.t = this.t / this.d - 1) * this.t * this.t * this.t - 1) + this.b;
  }

  inOutQuart() {
    if ((this.t /= this.d / 2) < 1) return this.c / 2 * this.t * this.t * this.t * this.t + this.b;
    return -this.c / 2 * ((this.t -= 2) * this.t * this.t * this.t - 2) + this.b;
  }

  inQuint() {
    return this.c * (this.t /= this.d) * this.t * this.t * this.t * this.t + this.b;
  }

  outQuint() {
    return this.c * ((this.t = this.t / this.d - 1) * this.t * this.t * this.t * this.t + 1) + this.b;
  }

  inOutQuint() {
    if ((this.t /= this.d / 2) < 1) return this.c / 2 * this.t * this.t * this.t * this.t * this.t + this.b;
    return this.c / 2 * ((this.t -= 2) * this.t * this.t * this.t * this.t + 2) + this.b;
  }

  inSine() {
    return -this.c * Math.cos(this.t / this.d * (Math.PI / 2)) + this.c + this.b;
  }

  outSine() {
    return this.c * Math.sin(this.t / this.d * (Math.PI / 2)) + this.b;
  }

  inOutSine() {
    return -this.c / 2 * (Math.cos(Math.PI * this.t / this.d) - 1) + this.b;
  }

  inExpo() {
    return (this.t == 0) ? this.b : this.c * Math.pow(2, 10 * (this.t / this.d - 1)) + this.b;
  }

  outExpo() {
    return (this.t == this.d) ? this.b + this.c : this.c * (-Math.pow(2, -10 * this.t / this.d) + 1) + this.b;
  }

  inOutExpo() {
    if (this.t == 0) return this.b;
    if (this.t == this.d) return this.b + this.c;
    if ((this.t /= this.d / 2) < 1) return this.c / 2 * Math.pow(2, 10 * (this.t - 1)) + this.b;
    return this.c / 2 * (-Math.pow(2, -10 * --this.t) + 2) + this.b;
  }

  inCirc() {
    return -this.c * (Math.sqrt(1 - (this.t /= this.d) * this.t) - 1) + this.b;
  }

  outCirc() {
    return this.c * Math.sqrt(1 - (this.t = this.t / this.d - 1) * this.t) + this.b;
  }

  inOutCirc() {
    if ((this.t /= this.d / 2) < 1) return -this.c / 2 * (Math.sqrt(1 - this.t * this.t) - 1) + this.b;
    return this.c / 2 * (Math.sqrt(1 - (this.t -= 2) * this.t) + 1) + this.b;
  }

  inElastic() {
    const s = 1.70158; let p = 0; let
      a = this.c;
    if (this.t == 0) return this.b; if ((this.t /= this.d) == 1) return this.b + this.c; if (!p) p = this.d * 0.3;
    if (a < Math.abs(this.c)) { a = this.c; const s = p / 4; } else { const s = p / (2 * Math.PI) * Math.asin(this.c / a); }
    return -(a * Math.pow(2, 10 * (this.t -= 1)) * Math.sin((this.t * this.d - s) * (2 * Math.PI) / p)) + this.b;
  }

  outElastic() {
    const s = 1.70158; let p = 0; let
      a = this.c;
    if (this.t == 0) return this.b; if ((this.t /= this.d) == 1) return this.b + this.c; if (!p) p = this.d * 0.3;
    if (a < Math.abs(this.c)) { a = this.c; const s = p / 4; } else { const s = p / (2 * Math.PI) * Math.asin(this.c / a); }
    return a * Math.pow(2, -10 * this.t) * Math.sin((this.t * this.d - s) * (2 * Math.PI) / p) + this.c + this.b;
  }

  inOutElastic() {
    const s = 1.70158; let p = 0; let
      a = this.c;
    if (this.t == 0) return this.b; if ((this.t /= this.d / 2) == 2) return this.b + this.c; if (!p) p = this.d * (0.3 * 1.5);
    if (a < Math.abs(this.c)) { a = this.c; const s = p / 4; } else { const s = p / (2 * Math.PI) * Math.asin(this.c / a); }
    if (this.t < 1) return -0.5 * (a * Math.pow(2, 10 * (this.t -= 1)) * Math.sin((this.t * this.d - s) * (2 * Math.PI) / p)) + this.b;
    return a * Math.pow(2, -10 * (this.t -= 1)) * Math.sin((this.t * this.d - s) * (2 * Math.PI) / p) * 0.5 + this.c + this.b;
  }

  inBack() {
    const s = 1.70158;
    return this.c * (this.t /= this.d) * this.t * ((s + 1) * this.t - s) + this.b;
  }

  outBack() {
    const s = 1.70158;
    return this.c * ((this.t = this.t / this.d - 1) * this.t * ((s + 1) * this.t + s) + 1) + this.b;
  }

  inOutBack() {
    let s = 1.70158;
    if ((this.t /= this.d / 2) < 1) return this.c / 2 * (this.t * this.t * (((s *= (1.525)) + 1) * this.t - s)) + this.b;
    return this.c / 2 * ((this.t -= 2) * this.t * (((s *= (1.525)) + 1) * this.t + s) + 2) + this.b;
  }

  inBounce(t = this.t, b = this.b) {
    return this.c - this.outBounce(this.d - t, 0) + b;
  }

  outBounce(t = this.t, b = this.b) {
    if ((t /= this.d) < (1 / 2.75)) {
      return this.c * (7.5625 * t * t) + b;
    } if (t < (2 / 2.75)) {
      return this.c * (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75) + b;
    } if (t < (2.5 / 2.75)) {
      return this.c * (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375) + b;
    }
    return this.c * (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375) + b;
  }

  inOutBounce() {
    if (this.t < this.d / 2) return this.inBounce(this.t * 2, 0) * 0.5 + this.b;
    return this.outBounce(this.t * 2 - this.d, 0) * 0.5 + this.c * 0.5 + this.b;
  }
}

class Tween {
  constructor(target, channel, endValue, duration, oncomplete, easing = 'inOutQuad') {
    this.target = target;
    this.channel = channel;
    this.oncomplete = oncomplete;
    this.endValue = endValue;
    this.duration = duration;
    this.currentTime = 0;
    this.finished = false;
    // constructor(start, end, duration, startTime=0, type='linear')
    this.easing = new Easing(target[channel], endValue, duration, 0, easing);
  }

  update(dt) {
    if (this.finished) return;
    this.currentTime += dt;
    if (this.currentTime >= this.duration) {
      this.target[this.channel] = this.endValue;
      if (this.oncomplete) this.oncomplete();
      this.finished = true;
    } else {
      this.target[this.channel] = this.easing.value(this.currentTime);
    }
  }
}

class SFX {
  constructor(options) {
    this.context = options.context;
    const volume = (options.volume != undefined) ? options.volume : 1.0;
    this.gainNode = this.context.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    this.gainNode.connect(this.context.destination);
    this._loop = (options.loop == undefined) ? false : options.loop;
    this.fadeDuration = (options.fadeDuration == undefined) ? 0.5 : options.fadeDuration;
    this.autoplay = (options.autoplay == undefined) ? false : options.autoplay;
    this.buffer = null;

    let codec;
    for (const prop in options.src) {
      if (SFX.supportsAudioType(prop)) {
        codec = prop;
        break;
      }
    }

    if (codec != undefined) {
      this.url = options.src[codec];
      this.load(this.url);
    } else {
      console.warn('Browser does not support any of the supplied audio files');
    }
  }

  static supportsAudioType(type) {
    let audio;

    // Allow user to create shortcuts, i.e. just "mp3"
    const formats = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aif: 'audio/x-aiff',
      ogg: 'audio/ogg',
    };

    if (!audio) audio = document.createElement('audio');

    return audio.canPlayType(formats[type] || type);
  }

  load(url) {
  		// Load buffer asynchronously
  		const request = new XMLHttpRequest();
  		request.open('GET', url, true);
  		request.responseType = 'arraybuffer';

  		const sfx = this;

  		request.onload = function () {
      // Asynchronously decode the audio file data in request.response
    		sfx.context.decodeAudioData(
      			request.response,
      			(buffer) => {
          if (!buffer) {
            console.error(`error decoding file data: ${sfx.url}`);
            return;
          }
          sfx.buffer = buffer;
          if (sfx.autoplay) sfx.play();
        },
        (error) => {
          console.error('decodeAudioData error', error);
        },
    		);
  		};

  		request.onerror = function () {
    		console.error('SFX Loader: XHR error');
  		};

  		request.send();
  }

  set loop(value) {
    this._loop = value;
    if (this.source != undefined) this.source.loop = value;
  }

  play() {
    if (this.buffer == null) return;
    if (this.source != undefined) this.source.stop();
    this.source = this.context.createBufferSource();
    this.source.loop = this._loop;
	  	this.source.buffer = this.buffer;
	  	this.source.connect(this.gainNode);
    this.source.start(0);
  }

  set volume(value) {
    this._volume = value;
    this.gainNode.gain.setTargetAtTime(value, this.context.currentTime + this.fadeDuration, 0);
  }

  pause() {
    if (this.source == undefined) return;
    this.source.stop();
  }

  stop() {
    if (this.source == undefined) return;
    this.source.stop();
    delete this.source;
  }
}



class JoyStick {

  constructor(options) {
    const circle = document.createElement('div');
    circle.style.cssText = 'position:absolute; bottom:35px; width:80px; height:80px; background:rgba(126, 126, 126, 0.5); border:#fff solid medium; border-radius:50%; left:50%; transform:translateX(-50%);';
    const thumb = document.createElement('div');
    thumb.style.cssText = 'position: absolute; left: 20px; top: 20px; width: 40px; height: 40px; border-radius: 50%; background: #fff;';
    circle.appendChild(thumb);
    document.body.appendChild(circle);
    this.domElement = thumb;
    this.maxRadius = options.maxRadius || 40;
    this.maxRadiusSquared = this.maxRadius * this.maxRadius;
    this.onMove = options.onMove;
    this.game = options.game;
    this.origin = { left: this.domElement.offsetLeft, top: this.domElement.offsetTop };
    this.forward = 0;
    this.turn = 0;
    
    const joystick = this;

    if (this.domElement != undefined) {
      if ('ontouchstart' in window) {
        this.domElement.addEventListener('touchstart', (evt) => { joystick.tap(evt); });
      } else {
        this.domElement.addEventListener('mousedown', (evt) => { joystick.tap(evt); });
      }
    }

    // keyboard support
    if ('onkeydown' in window) {
      document.addEventListener('keydown', function(e) {
        switch (e.code) {
          case 'ArrowUp': joystick.forward = 0.5; break;
          case 'ArrowDown': joystick.forward = -0.5; break;
          case 'ArrowLeft': joystick.turn = -1; break;
          case 'ArrowRight': joystick.turn = 1; break;
          case 'Space': 
            if(game.action !== 'jump') {
              game.action = 'jump';
            }
            break;
          case 'KeyF': // TODO: move it to a separate function
            //var bullet = new THREE.Mesh(
            //  new THREE.SphereGeometry(10, 32, 32),
            //  new THREE.MeshBasicMaterial({color: 0xffff00})
            //),

            var bullet = game.player.razorLeaf.clone(),
            scene = game.scene, 
            position = game.player.model.position,
            rY;

            const speed = 20;

            bullet.position.set(position.x, position.y + 20, position.z);
            rY = game.player.model.rotationY;

            bullet.velocity = new THREE.Vector3(
              Math.sin(rY) * speed,
              0 ,
              Math.cos(rY) * speed
            );

            bullet.alive = true; 
            setTimeout(function() { // TODO: move it to a separate funcion
              bullet.alive = false;
              scene.remove(bullet);
            }, 10000);
            game.player.bullets.push(bullet); 

            scene.add(bullet); 
            break;
        }
        joystick.moveByKeyboard(); // TODO: refactor
      });
    }

    if ('onkeyup' in window) {
      document.addEventListener('keyup', function(e) {
        switch (e.code) {
          case 'ArrowUp': joystick.forward = 0; break;
          case 'ArrowDown': joystick.forward = 0; break;
          case 'ArrowLeft': joystick.turn = 0; break;
          case 'ArrowRight': joystick.turn = 0; break;
        }
        joystick.moveByKeyboard(); // TODO: refactor
      });
    }

  }

  getMousePosition(evt) {
    const clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
    const clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
    return { x: clientX, y: clientY };
  }

  tap(evt) {
    evt = evt || window.event;
    // get the mouse cursor position at startup:
    this.offset = this.getMousePosition(evt);
    const joystick = this;
    if ('ontouchstart' in window) {
      document.ontouchmove = function (evt) { joystick.move(evt); };
      document.ontouchend = function (evt) { joystick.up(evt); };
    } else {
      document.onmousemove = function (evt) { joystick.move(evt); };
      document.onmouseup = function (evt) { joystick.up(evt); };
    }
  }

  moveByKeyboard() {
    if (this.onMove != undefined) {
      this.onMove.call(this.game, this.forward, this.turn);
    }
  }

  move(evt) {
    evt = evt || window.event;
    const mouse = this.getMousePosition(evt);
    // calculate the new cursor position:
    let left = mouse.x - this.offset.x;
    let top = mouse.y - this.offset.y;
    // this.offset = mouse;

    const sqMag = left * left + top * top;
    if (sqMag > this.maxRadiusSquared) {
      // Only use sqrt if essential
      const magnitude = Math.sqrt(sqMag);
      left /= magnitude;
      top /= magnitude;
      left *= this.maxRadius;
      top *= this.maxRadius;
    }

    // set the element's new position:
    this.domElement.style.top = `${top + this.domElement.clientHeight / 2}px`;
    this.domElement.style.left = `${left + this.domElement.clientWidth / 2}px`;

    const forward = -(top - this.origin.top + this.domElement.clientHeight / 2) / this.maxRadius;
    const turn = (left - this.origin.left + this.domElement.clientWidth / 2) / this.maxRadius;

    if (this.onMove != undefined) this.onMove.call(this.game, forward, turn);
  }

  up(evt) {
    if ('ontouchstart' in window) {
      document.ontouchmove = null;
      document.touchend = null;
    } else {
      document.onmousemove = null;
      document.onmouseup = null;
    }
    this.domElement.style.top = `${this.origin.top}px`;
    this.domElement.style.left = `${this.origin.left}px`;

    this.onMove.call(this.game, 0, 0);
  }
}

class Preloader {
  constructor(options) {
    this.assets = {};
    for (const asset of options.assets) {
      this.assets[asset] = { loaded: 0, complete: false };
      this.load(asset);
    }
    this.container = options.container;

    if (options.onprogress == undefined) {
      this.onprogress = onprogress;
      this.domElement = document.createElement('div');
      this.domElement.style.position = 'absolute';
      this.domElement.style.top = '0';
      this.domElement.style.left = '0';
      this.domElement.style.width = '100%';
      this.domElement.style.height = '100%';
      this.domElement.style.background = '#000';
      this.domElement.style.opacity = '0.7';
      this.domElement.style.display = 'flex';
      this.domElement.style.alignItems = 'center';
      this.domElement.style.justifyContent = 'center';
      this.domElement.style.zIndex = '1111';
      const barBase = document.createElement('div');
      barBase.style.background = '#aaa';
      barBase.style.width = '50%';
      barBase.style.minWidth = '250px';
      barBase.style.borderRadius = '10px';
      barBase.style.height = '15px';
      this.domElement.appendChild(barBase);
      const bar = document.createElement('div');
      bar.style.background = '#2a2';
      bar.style.width = '50%';
      bar.style.borderRadius = '10px';
      bar.style.height = '100%';
      bar.style.width = '0';
      barBase.appendChild(bar);
      this.progressBar = bar;
      if (this.container != undefined) {
        this.container.appendChild(this.domElement);
      } else {
        document.body.appendChild(this.domElement);
      }
    } else {
      this.onprogress = options.onprogress;
    }

    this.oncomplete = options.oncomplete;

    const loader = this;
    function onprogress(delta) {
      const progress = delta * 100;
      loader.progressBar.style.width = `${progress}%`;
    }
  }

  checkCompleted() {
    for (const prop in this.assets) {
      const asset = this.assets[prop];
      if (!asset.complete) return false;
    }
    return true;
  }

  get progress() {
    let total = 0;
    let loaded = 0;

    for (const prop in this.assets) {
      const asset = this.assets[prop];
      if (asset.total == undefined) {
        loaded = 0;
        break;
      }
      loaded += asset.loaded;
      total += asset.total;
    }

    return loaded / total;
  }

  load(url) {
    const loader = this;
    const xobj = new XMLHttpRequest();
    xobj.overrideMimeType('application/json');
    xobj.open('GET', url, true);
    xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == '200') {
				  loader.assets[url].complete = true;
				  if (loader.checkCompleted()) {
					  if (loader.domElement != undefined) {
						  if (loader.container != undefined) {
							  loader.container.removeChild(loader.domElement);
						  } else {
							  document.body.removeChild(loader.domElement);
						  }
					  }
					  loader.oncomplete();
				  }
			  }
    };
    xobj.onprogress = function (e) {
      const asset = loader.assets[url];
      asset.loaded = e.loaded;
      asset.total = e.total;
      loader.onprogress(loader.progress);
    };
    xobj.send(null);
  }
}



  // Util function for fbx models
  function enableShadow() {
    this.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
