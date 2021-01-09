
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
  