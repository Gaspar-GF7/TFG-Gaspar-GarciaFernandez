const { Server } = require('socket.io');

let _io = null;

function initSocket(server) {
  _io = new Server(server, {
    cors: { origin: '*' },
  });

  _io.on('connection', (socket) => {
    console.log(`[socket] cliente conectado: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[socket] cliente desconectado: ${socket.id}`);
    });
  });

  return _io;
}

function getIo() {
  return _io;
}

module.exports = { initSocket, getIo };
