const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

const currentUsers = {}
const arr = [
    {roleId: 'ml', role: '兔梅林', desc: ''},
    {roleId: 'pai', role: '小兔派', desc: ''},
    {roleId: 'mgn', role: '兔甘娜', desc: ''},
    // {roleId: 'zc', role: '兔忠臣', desc: ''},
    {roleId: 'abl', role: '兔奥伯伦', desc: ''},
    // {roleId: 'zy', role: '兔爪牙', desc: ''},
    // {roleId: 'mdld', role: '兔莫德雷德', desc: ''},
    {roleId: 'ck', role: '兔刺客', desc: ''}]

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

let roster = {}

io.on('connection', (socket) => { 
  console.log(socket)
  console.log('Client connected') 

  // socket.on('ToSMessage', (msg) => { 
  //   io.emit('ToCMessage', `${currentUsers[msg.fromId]}说: ${msg.msg}`) 
  // }) 

  socket.on('ToSChangeName', (data) => { 
    const {newName, myId} = data;
    currentUsers[myId] = newName
    io.emit('ToCSomeonesNameChanged', data) 
    notifyCCurrentUserNames()
  }) 

  socket.on('ToSQueryButtonClicked', (msg) => { 
    io.emit('ToCQueryButtonClickedResponse', msg) 
  }) 

  socket.on('ToSStartGameButtonClicked', (msg) => { 
    shuffleArray(arr)
    let i = 0;
    roster = {roleToName: {}}
    for(const userId in currentUsers) {
        roster[userId] = arr[i++];
        const role = roster[userId].roleId;
        roster.roleToName[role] = currentUsers[userId]
    }
    fanoutRoster(roster)
  }) 

  socket.on('disconnect', (aa, bb) => {
    console.log(`${aa} ----------  ${bb}`) 
  });

  function notifyCCurrentUserNames () {
    io.emit('notifyCCurrentUserNames', Object.values(currentUsers))
  }

  function fanoutRoster(roster) {
    console.log(roster)
    io.emit('ToCRosterUpdate', roster)
  }

  notifyCCurrentUserNames()
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})