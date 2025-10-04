const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

const STATE = {
  WAITING_FOR_START: "Waiting for start",
  CAPTAIN_SELECTING_DF_DS: "Captain selecting DF DS",
  CAPTAIN_DF_SELECTING_CARDS: "Captain DF selecting cards",
  DS_SELECTING_CARDS: "DS selecting cards",
  WAITING_FOR_START: "Waiting for start",
  WAITING_FOR_START: "Waiting for start",
  WAITING_FOR_CAPTAIN_CHOOSE_DF_AND_DS: "Waiting for captain",
}

const GAME_ROLE = {
  DEFAULT: "Default",
  CAPTAIN: "Captain",
  DF: "Df",
  DS: "Ds"
}

const CARD_SETTING = {
  'blue-plp': 2,
  'blue-jsq': 2,
  'redd-plp': 2,
  'redd-zjq': 2,
  'redd-mry': 2,
  'redd-wyj': 2,
  'yell-cjj': 2,
  'yell-fpq': 2,
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
  voteHistory: [],
  lobby: {},
  cards: {},
}

io.on('connection', (socket) => { 
  socket.on('ToSJoinGame', (data) => {
    if(currentGame.state !== STATE.WAITING_FOR_START) return;
    currentGame.lobby[data.id] = {
      id: data.id,
      name: data.name,
      numberIWant: data.numberIWant,
      isManager: !!currentGame.lobby[data.id]?.isManager
    };

    if(!isNaN(data.name) && isWithinTwoMinutes(Number(data.name))){
      currentGame.lobby[data.id].isManager = !currentGame.lobby[data.id].isManager;
      currentGame.lobby[data.id].name = 'Manager please reset your name'
    }

    fanoutCurrentGame();
  })
  function isWithinTwoMinutes(dateNum) {
    const now = Date.now();
    const diff = Math.abs(now - dateNum);
    return diff <= 2 * 60 * 1000; // 2 minutes in ms
  }

  socket.on('ToSManagerSubmit', (data) => {
    const managerId = data.id;
    const input1 = data.input1;
    const input2 = data.input2;
    notifyEveryone(`Manager id is ${managerId}. Manager input 1 is ${input1}. Manager input 2 is ${input2}.`)
    if(!currentGame.lobby[managerId]?.isManager) {
      notifyEveryone(`A fake manager is operating`)
      return
    }
    if(data.input2 == 'startGame'){
      if(currentGame.state !== STATE.WAITING_FOR_START) {
        notifyEveryone('Manager clicked start game but game state is not waiting for start, returning')
        return
      }
      if(data.input1 !== 'ImSure') {
        notifyEveryone('Manager clicked start game but password is incorrect, returning')
        return
      }
      currentGame.state = STATE.WAITING_FOR_CAPTAIN_CHOOSE_DF_AND_DS;
      currentGame.unusedCards
  
      for(const id in currentGame.lobby){
        currentGame.lobby[id].alive = true;
        currentGame.lobby[id].gameRole = true;
        currentGame.lobby[id].guns = 3;
        currentGame.lobby[id].offDuty = false;
      }
      fanoutCurrentGame();
    } else if (data.input2 == 'captain'){
      if(!currentGame.lobby[input1]) {
        notifyEveryone(`input1 id ${input1} does not exist`)
        return
      }
      assignCaptainNowCaptainSelectingDFDS(currentGame.lobby[input1])
    } else if (data.input2 == 'mry'){
      if(!currentGame.lobby[input1]) {
        notifyEveryone(`input1 id ${input1} does not exist`)
        return
      }
      notifyMryLast3DiscardedCards(input1)
    } else if (data.input2 == 'wyj'){
      if(!currentGame.lobby[input1]) {
        notifyEveryone(`input1 id ${input1} does not exist`)
        return
      }
    } else if (data.input2 == 'minimumGuns'){
      
    } else if (data.input2 == 'xipai'){
      
    } else if (data.input2 == 'endGame'){
      if(data.input1 !== 'ImSure') {
        notifyEveryone('Manager clicked end game but password is incorrect, returning')
        return
      }
    }
  })

  socket.on('ToSFromManagerEndGameBackToLobby', (data) => {
    if(data.key !== 9872) return;
    for(const key in currentGame){
      if(key === 'lobby' || key === 'voteHistory') continue;
      else if(key === 'state') currentGame[key] = STATE.WAITING_FOR_START;
      else delete currentGame[key];
    }
  })

  socket.on('ToSFromManagerKickUser', (data) => {
    if(currentGame.state !== WAITING_FOR_START) return;
    if(data.key !== 3459) return;
    delete currentGame.lobby[data.id];
  })

  

  socket.on('disconnect', (aa, bb) => {
    // console.log(`${aa} ----------  ${bb}`) 
  });

  // console.log(socket)
  fanoutCurrentGame();

  function fanoutCurrentGame() {
    io.emit('ToCCurrentGame', currentGame)
  }
  function notifyEveryone(data) {
    io.emit('ToCNotifyEveryone', data)
  }
  function resetLinghangCards() {
    currentGame.
  }
  function assignCaptainNowCaptainSelectingDFDS(captainId) {
    for(const id in currentGame.lobby){
      if(id === captainId){
        currentGame.lobby[id].gameRole = GAME_ROLE.CAPTAIN
      } else {
        currentGame.lobby[id].gameRole = GAME_ROLE.DEFAULT
      }
    }
    currentGame.state = STATE.CAPTAIN_SELECTING_DF_DS
    fanoutCurrentGame()
  }
  function notifyMryLast3DiscardedCards(mryId) {
    if(!currentGame.discardedCards) {
      notifyEveryone('currentGame.discardedCards is undefined, returning')
      return
    }
    if(!currentGame.lobby[mryId]) {
      notifyEveryone('currentGame.lobby[mryId] is undefined, returning')
      return
    }
    if(!currentGame.secretMessage) currentGame.secretMessage = {}
    if(!currentGame.secretMessage[mryId]) currentGame.secretMessage[mryId] = []
    currentGame.secretMessage[mryId].push({type: 'mry', info: currentGame.discardedCards.slice(-3)})
    fanoutCurrentGame()
  }
  function notifyWyjNextUnusedCard(wyjId) {
    if(!currentGame.unusedCards) {
      notifyEveryone('currentGame.unusedCards is undefined, returning')
      return
    }
    if(!currentGame.lobby[wyjId]) {
      notifyEveryone('currentGame.lobby[wyjId] is undefined, returning')
      return
    }
    if(!currentGame.secretMessage) currentGame.secretMessage = {}
    if(!currentGame.secretMessage[wyjId]) currentGame.secretMessage[wyjId] = []
    currentGame.secretMessage[wyjId].push({type: 'wyj', info: currentGame.unusedCards.slice(-3)})
    fanoutCurrentGame()
  }
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})