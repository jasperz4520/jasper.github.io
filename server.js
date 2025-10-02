const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

const STATE = {
  WAITING_FOR_START: "Waiting for start",
  WAITING_FOR_CAPTAIN_CHOOSE_DF_AND_DS: "Waiting for captain",
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

function shuffleArray(array) {
    let currentIndex = array.length;
    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
}

let currentGame = {
  state: STATE.WAITING_FOR_START, 
  idToUserObj: {}, 
  voteHistory: [],
  lobby: {
    numberToUserId: new Array(30),
  }
}

io.on('connection', (socket) => { 
  socket.on('ToSJoinGame', (data) => {
    if(currentGame.state !== STATE.WAITING_FOR_START) return;
    if(currentGame.lobby[data.id] && currentGame.lobby[data.id].name && currentGame.lobby[data.id].numberIWant) return;
    currentGame.lobby[data.id] = {
      id: data.id,
      name: data.name,
      numberIWant: data.numberIWant
    };

    fanoutCurrentGame();
  })

  socket.on('ToSStartGame', (data) => {
    // if(!meetNumberRequirement()) {
    //   io.emit('ToCToEveryoneNumberDisorder', '')
    //   return;
    // }

    currentGame.state = STATE.WAITING_FOR_CAPTAIN_CHOOSE_DF_AND_DS

    for(const id in currentGame.lobby){
      currentGame.idToUserObj[id] = {
        id,
        name: currentGame.lobby[id].name,
        alive: true,
        gameRole: 'waiting',
        managerRole: 'waiting',
        guns: 0,
        offDuty: false,
      }
    }
    
    fanoutCurrentGame();
  }) 

  socket.on('ToSFromManagerEndGameBackToLobby', (data) => {
    if(data.key !== 9872) return;
    for(const key in currentGame){
      if(key === 'lobby' || key === 'voteHistory') continue;
      else if(key === 'idToUserObj') currentGame[key] = {};
      else if(key === 'state') currentGame[key] = STATE.WAITING_FOR_START;
      else delete currentGame[key];
    }
  })

  socket.on('ToSFromManagerKickUser', (data) => {
    if(currentGame.state !== WAITING_FOR_START) return;
    if(data.key !== 3459) return;
    delete currentGame.lobby[data.id];
  })

  function fanoutCurrentGame() {
    // console.log(currentGame)
    io.emit('ToCCurrentGame', currentGame)
  }

  socket.on('disconnect', (aa, bb) => {
    // console.log(`${aa} ----------  ${bb}`) 
  });

  // console.log(socket)
  console.log('Client connected') 
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})