const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

const arr = [
  {roleId: 'ml', roleName: '兔梅林', desc: ''},
  {roleId: 'pai', roleName: '小兔派', desc: ''},
  {roleId: 'mgn', roleName: '兔甘娜', desc: ''},
  {roleId: 'zc', roleName: '兔忠臣', desc: ''},
  // {roleId: 'abl', roleName: '兔奥伯伦', desc: ''},
  // {roleId: 'zy', roleName: '兔爪牙', desc: ''},
  // {roleId: 'mdld', roleName: '兔莫德雷德', desc: ''},
  {roleId: 'ck', roleName: '兔刺客', desc: ''}
]

const STATE = {
  WAITING_FOR_START: "Waiting for start",
  GAME_STARTED: "Game Started",
  VOTE_IN_PROGRESS: "Vote inprogress",
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

let currentGame = {state: STATE.WAITING_FOR_START, roster: {}, roleIdToUserInfo: {}, leaderId: '', selectedUserIds: {}, userInfoArr: []}
let enableSelectingUsers = true;
let voteResult = {};
let pastResults = []

io.on('connection', (socket) => { 
  socket.on('ToSChangeName', (userInfo) => { 
    console.log('qqq')
    if(!currentGame.roster[userInfo.id]){
      console.log('ttt')
      if(currentGame.state !== STATE.WAITING_FOR_START) return;
      else{
        console.log('addeddddddddddddd')
        currentGame.roster[userInfo.id] = {};
        currentGame.userInfoArr.push(userInfo)
      }
    }
    currentGame.roster[userInfo.id].userInfo = userInfo
    fanoutRoster()
  }) 

  socket.on('ToSSelectUser', (userId) => { 
    if(!enableSelectingUsers) return
    console.log('select uesr')
    if(currentGame.selectedUserIds[userId]) delete currentGame.selectedUserIds[userId]
    else currentGame.selectedUserIds[userId] = true
    fanoutRoster()
  }) 

  socket.on('ToSFache', (data) => { 
    enableSelectingUsers = false
    voteResult = {}
    console.log(currentGame.selectedUserIds)
    currentGame.state = STATE.VOTE_IN_PROGRESS
    fanoutRoster()
  }) 

  socket.on('ToSSubmitVote', (data) => { 
    voteResult[data.fromId] = data.decision;
    if(Object.keys(voteResult).length === Object.keys(currentGame.selectedUserIds).length) {
      let suc = 0, fai = 0;
      Object.values(voteResult).forEach((res) => {
        if(res == 'success') suc++;
        else if(res == 'failure') fai++;
        else throw new Error('invalid vote result')
      })
      const result = `Success count: ${suc}, failure count: ${fai}`
      io.emit('ToCVoteComplete', result)
      currentGame.state = 'Vote complete. Waiting for next round'
      currentGame.selectedUserIds = {};
      enableSelectingUsers = true;
      // next leader
      fanoutRoster()
    }
  }) 

  // [].slice.call(document.getElementsByClassName('bg-secondary')).forEach((a)=>{a.style.display = 'none'})
  // [].slice.call(document.getElementsByClassName('bg-secondary')).forEach((a)=>{
  //   const dd = a.parentNode
  //   if(dd == dd.parentNode.children[9]){
  //     dd.parentNode.style.display = 'none'
  //   }
  //   console.log(a.parentNode.parentNode.children.length)
  // })

  socket.on('ToSButtonClicked', (data) => { 
    if(data === 'startGameButton'){
      shuffleArray(arr)
      currentGame.state = STATE.GAME_STARTED
      
      let i = 0;
      for(const userId in currentGame.roster) {
        shuffleArray(currentGame.userInfoArr)
        currentGame.leaderId = currentGame.userInfoArr[0].id
        currentGame.roster[userId].roleInfo = arr[i++];
        const roleId = currentGame.roster[userId].roleInfo.roleId
        currentGame.roleIdToUserInfo[roleId] = currentGame.roster[userId].userInfo
      }
      fanoutRoster()
    } else if(data === 'resetGameButton'){
      currentGame.state = STATE.WAITING_FOR_START

    }
  }) 
  
  function fanoutRoster() {
    // console.log(currentGame)
    io.emit('ToCCurrentGameRoster', currentGame)
  }

  socket.on('disconnect', (aa, bb) => {
    // console.log(`${aa} ----------  ${bb}`) 
  });

  fanoutRoster()
  // console.log(socket)
  console.log('Client connected') 
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})