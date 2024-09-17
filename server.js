const express = require('express')
const app = express()
const http = require('http').Server(app) 
const io = require('socket.io')(http) 

const port = process.env.PORT || 8000

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', (socket) => { 
  console.log('Client connected') 
  socket.on('disconnect', () => { 
    console.log('Client disconnected') 
  }) 

  socket.on('message', (msg) => { 
    io.emit('message', msg) 
  }) 
}) 

http.listen(port, () => { 
  console.log(`App listening on port ${port}`)
})