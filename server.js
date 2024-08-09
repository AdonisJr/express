// server.js
const express = require('express');
const next = require('next');
const { Server } = require('socket.io');
const { createServer } = require('http');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let rooms = {};

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('connected');

    socket.on('joinRoom', ({ room, name }) => {
      if (!rooms[room]) {
        rooms[room] = { players: {}, scores: {}, words: generateWords() };
      }
      rooms[room].players[socket.id] = name;
      rooms[room].scores[socket.id] = 0;
      socket.join(room);
      io.to(room).emit('updatePlayers', rooms[room].players);
    });

    socket.on('guessWord', ({ room, word }) => {
      const currentWord = rooms[room].words[0];
      if (word === currentWord) {
        rooms[room].scores[socket.id] += 1;
        rooms[room].words.shift();
        if (rooms[room].words.length === 0) {
          io.to(room).emit('gameOver', rooms[room].scores);
        } else {
          io.to(room).emit('nextWord', rooms[room].words[0]);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const room in rooms) {
        if (rooms[room].players[socket.id]) {
          delete rooms[room].players[socket.id];
          delete rooms[room].scores[socket.id];
          io.to(room).emit('updatePlayers', rooms[room].players);
          if (Object.keys(rooms[room].players).length === 0) {
            delete rooms[room];
          }
        }
      }
    });
  });

  const generateWords = () => ['apple', 'banana', 'cherry', 'date', 'fig', 'grape', 'kiwi', 'lemon', 'mango', 'orange'];

  server.all('*', (req, res) => {
    return res.json({adonis: 'wewew'})
  });


  const port = process.env.PORT || 3001;
  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
