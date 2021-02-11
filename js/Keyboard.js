
class Keyboard {

    constructor(game) {
      const keyboard = this;
      this.game = game;

      // Assign actions to keys
      if ('onkeydown' in window) {
        document.addEventListener('keydown', function(e) {
          // Only alive players can move
          game.players.filter(p => p.hp > 0).forEach((player) => {
            var action = player.keyboardMapping[e.code],
              move = player.move;

            switch (action) {
              case 'forward': move.forward = 0.5; break;
              case 'backward': move.forward = -0.5; break;
              case 'left': move.turn = 1.5; break;
              case 'right': move.turn = -1.5; break;
              case 'jump': 
                if(player.action !== 'jump') {
                  player.setAction('jump');
                }
                break;
              case 'razorLeaf':
                player.razorLeaf();
                break;
            }

            player.initAction();
          });
        });
      }
  
      if ('onkeyup' in window) {
        game.players.forEach((player) => {
          var move = player.move;
          document.addEventListener('keyup', function(e) {

            switch (player.keyboardMapping[e.code]) {
              case 'forward': move.forward = 0; break;
              case 'backward': move.forward = 0; break;
              case 'left': move.turn = 0; break;
              case 'right': move.turn = 0; break;
            }
            player.initAction();
          });
        });
      }
  
    }
  
  }
  