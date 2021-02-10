
class Keyboard {

    constructor(options) {
      this.game = options.game;
      
      const keyboard = this;
  
      // TODO: move it to player class
      // keyboard support
      if ('onkeydown' in window) {
        document.addEventListener('keydown', function(e) {
          [game.player, game.player2].filter(p => p.hp > 0).forEach((player) => {
            var action = player.keyboardMapping[e.code];
            switch (action) {
              case 'forward': player.move.forward = 0.5; break;
              case 'backward': player.move.forward = -0.5; break;
              case 'left': player.move.turn = 1.5; break;
              case 'right': player.move.turn = -1.5; break;
              case 'jump': 
                if(player.action !== 'jump') {
                  player.setAction('jump');
                }
                break;
              case 'razorLeaf': // TODO: move it to a separate function
                //var bullet = new THREE.Mesh(
                //  new THREE.SphereGeometry(10, 32, 32),
                //  new THREE.MeshBasicMaterial({color: 0xffff00})
                //),

                if((player.lastFired || 0) + 500 > Date.now()) {
                  break;
                }

                for(var i = 0; i < 10; i++) {

                  var bullet = game.models.razorLeaf.clone(),
                  scene = game.scene, 
                  position = player.model.position,
                  rY;
      
                  const speed = 20;
      
                  bullet.position.set(position.x, position.y + 20, position.z);
                  rY = player.model.rotationY;
      
                  bullet.velocity = new THREE.Vector3(
                    Math.sin(rY) * speed + (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 7 ,
                    Math.cos(rY) * speed + (Math.random() - 0.5) * 5
                  );
      
                  bullet.alive = true; 
                  setTimeout(function(bullet_) { // TODO: move it to a separate funcion
                    bullet_.alive = false;
                    scene.remove(bullet_);
                  }, 1500, bullet);
                  player.bullets.push(bullet); 
      
                  scene.add(bullet); 
                }
                player.lastFired = Date.now();
                break;
            }

            player.initAction();
            //keyboard.movePlayer(player, forward, turn); 
          });
        });
      }
  
      if ('onkeyup' in window) {
        [game.player, game.player2].forEach((player) => {
          document.addEventListener('keyup', function(e) {

            switch (player.keyboardMapping[e.code]) {
              case 'forward': player.move.forward = 0; break;
              case 'backward': player.move.forward = 0; break;
              case 'left': player.move.turn = 0; break;
              case 'right': player.move.turn = 0; break;
            }
            player.initAction();
          });
        });
      }
  
    }
  
  }
  