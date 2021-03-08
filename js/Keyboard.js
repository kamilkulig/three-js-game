
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
              case 'Forward': move.forward = 0.5; break;
              case 'Backward': move.forward = -0.5; break;
              case 'Left': move.turn = 1.5; break;
              case 'Right': move.turn = -1.5; break;
              case 'Jump': 
                if(player.action !== 'jump') {
                  player.setAction('jump');
                }
                break;
              case 'Razor Leaf':
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
              case 'Forward': move.forward = 0; break;
              case 'Backward': move.forward = 0; break;
              case 'Left': move.turn = 0; break;
              case 'Right': move.turn = 0; break;
            }
            player.initAction();
          });
        });
      }
  
    }
  
  }
  