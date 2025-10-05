const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

// Const used in both client and server START
const STATE = {
  WAITING_FOR_START: "Waiting for start",
  MANAGER_SELECTING_CAPTAIN: "Manager selecting captain",
  // CAPTAIN_SELECTING_DF_DS: "Captain selecting DF DS",
  MANAGER_SELECTING_DF_DS: "Manager selecting DF DS",
  WAITING_FOR_VOTE: "Waiting for vote",
  CAPTAIN_DF_SELECTING_CARDS: "Captain DF selecting cards",
  DS_SELECTING_CARDS: "DS selecting cards",
  MANAGER_CONFIRMING_MAP_ACTION: "Manager confirming map action",
  MANAGER_CONFIRMING_CARD_ACTION: "Manager confirming card action",
  WAITING_FOR_WYJ_KEEP_OR_DISCARD_CARD: "Waiting for wyj",
}

const GAME_ROLE = {
  DEFAULT: "Default",
  CAPTAIN_SELECTING_PEOPLE: "CaptainSelectingPeople",
  CAPTAIN_SELECTING_CARDS: "CaptainSelectingCards",
  DF: "Df",
  DS: "Ds",
  MRY: "Mry",
  WYJ: "Wyj",
  JZCJ: "Jzcj",
  JZFQ: "Jzfq",
  VOTER: "Voter",
}

const MESSAGE = {
  MRY_START: 'You are mei ren yu. Here are the 3 discarded cards (already shuffled) in this round: ',
  WYJ_START: 'You are wang yuan jing. Here is the next card to be used in the unused card pool: ',

}
// Const used in both client and server END

const CARD_SETTING = {
  'blue-plp': 2,
  'blue-jsq': 2,
  'redd-plp': 2,
  'redd-zjq': 2,
  'redd-mry': 2,
  'redd-wyj': 2,
  'yell-aaa': 5,
}
const YELLOW_CARD_SETTING = {
  'yell-cjj': 3,
  'yell-fpq': 2,
}
const COLOR_ROLE_SETTING = {
  'blue': 3,
  'red0': 2,
  'jz30': 1,
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); 
    [arr[i], arr[j]] = [arr[j], arr[i]]; // swap
  }
  return arr;
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
      isManager: true,
      gameRole : GAME_ROLE.DEFAULT,
      gameRole2 : GAME_ROLE.DEFAULT,
    };
    //isManager: !!currentGame.lobby[data.id]?.isManager !!!!!!!!!

    if(!isNaN(data.name) && isWithinTwoMinutes(Number(data.name))){
      currentGame.lobby[data.id].isManager = !currentGame.lobby[data.id].isManager;
      currentGame.lobby[data.id].name = 'Please reset your name'
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
      if(data.input1 !== "1") {
        notifyEveryone(data.input1)
        notifyEveryone('Manager clicked start game but password is incorrect, returning')
        return
      }
      
      // resetDirectionCards();
      // resetYellowCards();
      const colorRoleArray = []
      for(const colorRoleName in COLOR_ROLE_SETTING){
        for(let i = 0; i < COLOR_ROLE_SETTING[colorRoleName]; i++){
          colorRoleArray.push(colorRoleName)
        }
      }
      shuffleArray(colorRoleArray)
  
      currentGame.numberToId = {}
      let howManyUsers = 0;
      for(const id in currentGame.lobby){
        howManyUsers++
        currentGame.lobby[id].alive = true;
        currentGame.lobby[id].gameRole = GAME_ROLE.DEFAULT;
        currentGame.lobby[id].gameRole2 = GAME_ROLE.DEFAULT;
        currentGame.lobby[id].colorRole = colorRoleArray.shift()
        currentGame.lobby[id].guns = 3;
        currentGame.lobby[id].offDuty = false;
        currentGame.numberToId[currentGame.lobby[id].numberIWant] = id;
      }
      currentGame.howManyUsers = howManyUsers;
      // if (colorRoleArray.length !== 0) {
      //   notifyEveryone('colorRoleArray.length !== 0, returning')
      //   return
      // }
      updateGameState(STATE.MANAGER_SELECTING_CAPTAIN)
    } else if (data.input2 == 'captain'){
      const id = currentGame.numberToId[input1]
      if(!currentGame.lobby[id]) {
        notifyEveryone(`id does not exist`)
        return
      }
      assignCaptainNowCaptainSelectingDFDS(id)
    } else if (data.input2 == 'mry'){
      const id = currentGame.numberToId[input1]
      if(!currentGame.lobby[id]) {
        notifyEveryone(`id does not exist`)
        return
      }
      notifyMryLast3DiscardedDirectionCards(input1)
    } else if (data.input2 == 'wyj'){
      const id = currentGame.numberToId[input1]
      if(!currentGame.lobby[id]) {
        notifyEveryone(`id does not exist`)
        return
      }
    } else if (data.input2 == 'minimumGuns'){
      
    } else if (data.input2 == 'xipai'){
      if(data.input1 !== "1") {
        notifyEveryone('Manager clicked xipai but password is incorrect, returning')
        return
      }
      resetDirectionCards();
    } else if (data.input2 == 'endGame'){
      if(data.input1 !== "1") {
        notifyEveryone('Manager clicked end game but password is incorrect, returning')
        return
      }
    } else if (data.input2 == 'df-ds'){
      if(!data.input1) {
        notifyEveryone('!data.input1, returning')
        return
      }
      const dfdsArray = input1.split("-");
      const df = dfdsArray[0]
      const ds = dfdsArray[1]
      if(!df || !ds){
        notifyEveryone('!dfdsArray[0] || !dfdsArray[1], returning')
        return
      }
      const dfid = currentGame.numberToId[df]
      const dsid = currentGame.numberToId[ds]
      if(!currentGame.lobby[dfid] || !currentGame.lobby[dsid]) {
        notifyEveryone(`!currentGame.lobby[dfid] || !currentGame.lobby[dsid], returning`)
        return
      }
      setUserGameRole(dfid, GAME_ROLE.DF, 1)
      setUserGameRole(dsid, GAME_ROLE.DS, 1)
      currentGame.dfId = dfid;
      currentGame.dsId = dsid;
      updateGameState(STATE.WAITING_FOR_VOTE)
      currentGame.voteRecord = {}
      currentGame.votedNumber = 0;
    }
    fanoutCurrentGame()
  })

  socket.on('ToSOperatorSubmit', (data) => {
    const {operatorPanelType, id, input1, input2, input3} = data
    const userGameRole = currentGame.lobby[id].gameRole
    const userGameRole2 = currentGame.lobby[id].gameRole2
    if(operatorPanelType === GAME_ROLE.WYJ){
      operatorPanelInfo.innerHTML = `wyjstart${userProile.gameRoleDetailsArray[0]}. Type keep to keep it. Type discard to discard it.`
      if(input1 !== 'keep' && input1 !== 'discard'){
        notifyEveryone('wyj input incorrect, returning')
        return
      }
      if(!currentGame.lobby[id].gameRoleDetailsArray || currentGame.lobby[id].gameRoleDetailsArray.length !== 1){
        notifyEveryone('currentGame.lobby[id].gameRoleDetailsArray is undefined or length is not 1, returning')
        return
      }
      if(input1 === 'keep'){
        currentGame.unusedDirectionCards.unshift(currentGame.lobby[id].gameRoleDetailsArray.shift())
      }else {
        currentGame.unusedDirectionCards.push(currentGame.lobby[id].gameRoleDetailsArray.shift())
      }
      updateGameState(STATE.MANAGER_SELECTING_CAPTAIN)
    } else if(operatorPanelType === GAME_ROLE.MRY){
      // should not be here
      updateGameState(STATE.MANAGER_SELECTING_CAPTAIN)
    } else if(operatorPanelType === GAME_ROLE.JZCJ){
      const userId = currentGame.numberToId[input1]
      if(!input1 || !currentGame.lobby[userId]){
        notifyEveryone('invalid input1 or currentGame.lobby[userId] is undefined, returning')
        return
      }
      if(id === input1){
        notifyEveryone('id === input1, returning')
        return
      }
      sendSecretMessageTo(id, `Number ${input1}'s original color role is ${currentGame.lobby[userId].colorRole}. Now changed to jt40`)
      sendSecretMessageTo(userId, `Number ${currentGame.lobby[id].numberIWant} is jiaozhu. He selected you. Now you are jt40. You don't know other jt40`)
      currentGame.lobby[userId].colorRole = 'jt40'
      updateGameState(STATE.MANAGER_SELECTING_CAPTAIN)
    } else if(operatorPanelType === GAME_ROLE.JZFQ){
      const userId1 = currentGame.numberToId[input1]
      const userId2 = currentGame.numberToId[input2]
      const userId3 = currentGame.numberToId[input3]
      if(!userId1 || !currentGame.lobby[userId1]){
        notifyEveryone('invalid userId1, returning')
        return
      }
      if(!userId2 || !currentGame.lobby[userId2]){
        notifyEveryone('invalid userId2, returning')
        return
      }
      if(!userId3 || !currentGame.lobby[userId3]){
        notifyEveryone('invalid userId3, returning')
        return
      }
      currentGame.lobby[userId1]++
      currentGame.lobby[userId2]++
      currentGame.lobby[userId3]++
      notifyEveryone('[System] Jiaozhu dispensed 3 guns')
      updateGameState(STATE.MANAGER_SELECTING_CAPTAIN)
    } else if(operatorPanelType === GAME_ROLE.CAPTAIN_SELECTING_CARDS || operatorPanelType === GAME_ROLE.DF || operatorPanelType === GAME_ROLE.DS){
      if(!id || !currentGame.lobby[id]){
        notifyEveryone('!id || !currentGame.lobby[id], returning')
        return
      }
      if(!input1 || (input1 !== currentGame.lobby[id].gameRoleDetailsArray[0] && input1 !== currentGame.lobby[id].gameRoleDetailsArray[1])){
        notifyEveryone('!input1 || (input1 !== currentGame.lobby[id].gameRoleDetailsArray[0] && input1 !== currentGame.lobby[id].gameRoleDetailsArray[1]), returning')
        return
      }
      if(operatorPanelType === GAME_ROLE.CAPTAIN_SELECTING_CARDS || operatorPanelType === GAME_ROLE.DF){
        if(!currentGame.captainAndDfSubmittedCards) currentGame.captainAndDfSubmittedCards = []
        currentGame.captainAndDfSubmittedCards.push(input1)
        if(currentGame.captainAndDfSubmittedCards.length === 2){
          updateGameState(STATE.DS_SELECTING_CARDS)
          currentGame.lobby[currentGame.dsId].gameRoleDetailsArray = currentGame.captainAndDfSubmittedCards;
          currentGame.captainAndDfSubmittedCards = []
        }
      } else {
        notifyEveryone(`Duoshou (Number ${currentGame.lobby[id].numberIWant}) revealed this card: ${input1}`)
        updateGameState(STATE.MANAGER_CONFIRMING_MAP_ACTION)
      }
    } else if(operatorPanelType === GAME_ROLE.DS){
    } else if(operatorPanelType === GAME_ROLE.VOTER){
      if(input1 > currentGame.lobby[id].guns) notifyEveryone(`Number used ${input1} guns, which is more than what he has`)
      if(!currentGame.voteRecord) currentGame.voteRecord = {}
      currentGame.voteRecord[id] = input1
      currentGame.votedNumber++
      if(currentGame.howManyUsers === currentGame.votedNumber){
        
      }
    } else if(operatorPanelType === GAME_ROLE.CAPTAIN_SELECTING_PEOPLE){
      // operatorPanelInfo.innerHTML = `You are captain. Choose 2 people. Type user's number below. 1st one is Dafu. 2nd is Duoshou`
      // operatorPanelInput1.style.display = 'block';
      // operatorPanelInput2.style.display = 'block';
      // operatorPanelInput3.style.display = 'none';
    } 
    // const {operatorPanelType, id, input1, input2, input3} = data
    fanoutCurrentGame()
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

  function updateGameState(newState) {
    notifyEveryone(`Game state updated to: ${newState}`)
    currentGame.state = newState
  }
  function fanoutCurrentGame() {
    io.emit('ToCCurrentGame', currentGame)
  }
  function notifyEveryone(message) {
    if(!currentGame.systemNotification) currentGame.systemNotification = []
    currentGame.systemNotification.push(message)
    fanoutCurrentGame()
  }
  function resetDirectionCards() {
    currentGame.unusedDirectionCards = [];
    currentGame.discardedDirectionCards = [];
    for(const cardName in CARD_SETTING){
      for(let i = 0; i < CARD_SETTING[cardName]; i++){
        currentGame.unusedDirectionCards.push(cardName);
      }
    }
    shuffleArray(currentGame.unusedDirectionCards)
  }
  function resetYellowCards() {
    currentGame.unusedYellowCards = [];
    currentGame.discardedYellowCards = [];
    for(const cardName in YELLOW_CARD_SETTING){
      for(let i = 0; i < YELLOW_CARD_SETTING[cardName]; i++){
        currentGame.unusedYellowCards.push(cardName);
      }
    }
    shuffleArray(currentGame.unusedYellowCards)
  }
  function assignCaptainNowCaptainSelectingDFDS(captainId) {
    for(const id in currentGame.lobby){
      if(id === captainId){
        currentGame.lobby[id].gameRole = GAME_ROLE.CAPTAIN_SELECTING_PEOPLE
      } else {
        currentGame.lobby[id].gameRole = GAME_ROLE.DEFAULT
      }
    }
    currentGame.captainId = captainId;
    currentGame.dfId = '';
    currentGame.dsId = '';
    updateGameState(STATE.MANAGER_SELECTING_DF_DS)
    fanoutCurrentGame()
  }

  // mry only uses secret message, without operatorPanel
  function notifyMryLast3DiscardedDirectionCards(mryId) {
    if(!currentGame.discardedDirectionCards) {
      notifyEveryone('currentGame.discardedDirectionCards is undefined, returning')
      return
    }
    if(!currentGame.lobby[mryId]) {
      notifyEveryone('currentGame.lobby[mryId] is undefined, returning')
      return
    }
    sendSecretMessageTo(mryId, `${MESSAGE.MRY_START}${shuffleArray(currentGame.discardedDirectionCards.slice(-3)).join(",")}`, false, GAME_ROLE.MRY)
    setUserGameRole(mryId, GAME_ROLE.MRY, 2)
    fanoutCurrentGame()
  }
  
  function notifyWyjNextUnusedCard(wyjId) {
    if(!currentGame.unusedDirectionCards) {
      notifyEveryone('currentGame.unusedDirectionCards is undefined, returning')
      return
    }
    if(!currentGame.lobby[wyjId]) {
      notifyEveryone('currentGame.lobby[wyjId] is undefined, returning')
      return
    }
    sendSecretMessageTo(wyjId, `${MESSAGE.WYJ_START}${currentGame.unusedDirectionCards.shift()}`, false, GAME_ROLE.WYJ)
    setUserGameRole(wyjId, GAME_ROLE.WYJ, 2)
    currentGame.state = STATE.WAITING_FOR_WYJ_KEEP_OR_DISCARD_CARD
    // wyj sends back card
    fanoutCurrentGame()
  }

  function sendSecretMessageTo(userId, message, hideUserNumber, gameRole){
    if(!currentGame.secretMessage) currentGame.secretMessage = {}
    if(!currentGame.secretMessage[userId]) currentGame.secretMessage[userId] = []
    if(!currentGame.lobby[userId]){
      notifyEveryone(`${currentGame.lobby[userId]} is undefined, returning`)
      return
    }
    currentGame.secretMessage[userId].push(message)
    const userNum = hideUserNumber? 'xxx' : currentGame.lobby[userId].numberIWant;
    notifyEveryone(`[System]System sent a secret message to ${gameRole}: ${userNum}`)
    fanoutCurrentGame()
  }
  function setUserGameRole(userId, gameRoleToBeSet, roleNumber){
    if(!currentGame.lobby[userId]){
      notifyEveryone('setUserGameRole !currentGame.lobby[userId], returning')
      return
    }
    if(roleNumber === 1) currentGame.lobby[userId].gameRole = gameRoleToBeSet
    else if(roleNumber === 2) currentGame.lobby[userId].gameRole2 = gameRoleToBeSet
  }

  function returnNextCaptainId(){
    
  }
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})