const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', socket.id);
    });

    socket.on('offer', (data) => {
      socket.to(data.target).emit('offer', { offer: data.offer, from: socket.id });
    });

    socket.on('answer', (data) => {
      socket.to(data.target).emit('answer', { answer: data.answer, from: socket.id });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});