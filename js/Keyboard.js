
class Keyboard {

    constructor(options) {
      this.game = options.game;
      
      const keyboard = this;
  
  
      // keyboard support
      if ('onkeydown' in window) {
        document.addEventListener('keydown', function(e) {
          [game.player, game.player2].forEach((player) => {
            var action = player.keyboardMapping[e.code];
            switch (action) {
              case 'forward': player.move.forward = 0.5; break;
              case 'backward': player.move.forward = -0.5; break;
              case 'left': player.move.turn = 1; break;
              case 'right': player.move.turn = -1; break;
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
    
                var bullet = game.models.razorLeaf.clone(),
                scene = game.scene, 
                position = player.model.position,
                rY;
    
                const speed = 20;
    
                bullet.position.set(position.x, position.y + 20, position.z);
                rY = player.model.rotationY;
    
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
                player.bullets.push(bullet); 
    
                scene.add(bullet); 
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
  