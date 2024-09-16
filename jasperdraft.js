
import io from 'socket.io-client';

// const Constants = require('../shared/constants');

const socket = io(`ws://${window.location.host}`);
const connectedPromise = new Promise(resolve => {
  socket.on('connect', () => {
    console.log('Connected to server!');
    resolve();
  });
});

export const connect = onGameOver => (
  connectedPromise.then(() => {
    console.log('Connected to server!');
    // socket.on(Constants.MSG_TYPES.GAME_UPDATE, processGameUpdate);
    // socket.on(Constants.MSG_TYPES.GAME_OVER, onGameOver);
  })
);

export const play = username => {
    console.log('Connected to server!');
//   socket.emit(Constants.MSG_TYPES.JOIN_GAME, username);
};

export const updateDirection = dir => {
    console.log('Connected to server!');
//   socket.emit(Constants.MSG_TYPES.INPUT, dir);
};

function abcd(){
  console.log('ssssssssss')
  document.getElementById("demo").innerHTML = 'Ooops!'
  document.getElementById('shuqi').style.display = "block";
}


