const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

const currentUserNames = {}
const arr = ['兔梅林', '小兔派', '兔甘娜']
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

let num = 0;
io.on('connection', (socket) => { 
  console.log('Client connected') 
  io.emit('notifyCCurrentUserCount', `${++num}`)

  socket.on('ToSMessage', (msg) => { 
    io.emit('ToCMessage', `${currentUserNames[msg.fromId]}说: ${msg.msg}`) 
  }) 

  socket.on('ToSChangeName', (data) => { 
    const {newName, myId} = data;
    currentUserNames[myId] = newName
    io.emit('ToCYourNameChanged', `${newName}`) 
    notifyCCurrentUserNames()
  }) 

  socket.on('ToSQueryButtonClicked', (msg) => { 
    io.emit('ToCQueryButtonClickedResponse', msg) 
  }) 

  socket.on('disconnect', (aa) => {
    io.emit('notifyCCurrentUserCount', `${--num}`)
    console.log('Client disconnected') 
  });

  function notifyCCurrentUserNames () {
    io.emit('notifyCCurrentUserNames', Object.values(currentUserNames))
  }
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})