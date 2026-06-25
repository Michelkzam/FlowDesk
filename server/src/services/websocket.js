import { Server } from 'socket.io';

let io = null;

export function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('[WS] Cliente conectado:', socket.id);

    socket.on('join:ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`[WS] ${socket.id} entrou na sala ticket:${ticketId}`);
    });

    socket.on('leave:ticket', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`[WS] ${socket.id} saiu da sala ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      console.log('[WS] Cliente desconectado:', socket.id);
    });
  });

  console.log('[WS] WebSocket server inicializado');
  return io;
}

export function getIO() {
  return io;
}

export function emitToTicket(ticketId, event, data) {
  if (io) {
    io.to(`ticket:${ticketId}`).emit(event, data);
  }
}

export function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}
