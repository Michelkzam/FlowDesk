import { Server } from 'socket.io';

let io = null;
const onlineUsers = new Map();

export function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('[WS] Cliente conectado:', socket.id);

    socket.on('user:online', (userData) => {
      onlineUsers.set(socket.id, { ...userData, socketId: socket.id });
      io.emit('users:online', Array.from(onlineUsers.values()));
      console.log(`[WS] Usuário online: ${userData.name || userData.id}`);
    });

    socket.on('user:offline', () => {
      onlineUsers.delete(socket.id);
      io.emit('users:online', Array.from(onlineUsers.values()));
    });

    socket.on('join:ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`[WS] ${socket.id} entrou na sala ticket:${ticketId}`);
    });

    socket.on('leave:ticket', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`[WS] ${socket.id} saiu da sala ticket:${ticketId}`);
    });

    socket.on('typing:start', (data) => {
      if (data?.ticketId) {
        socket.to(`ticket:${data.ticketId}`).emit('typing:start', {
          userId: data.userId,
          userName: data.userName,
          ticketId: data.ticketId,
        });
      }
    });

    socket.on('typing:stop', (data) => {
      if (data?.ticketId) {
        socket.to(`ticket:${data.ticketId}`).emit('typing:stop', {
          userId: data.userId,
          ticketId: data.ticketId,
        });
      }
    });

    socket.on('intercom:message', (data) => {
      io.emit('intercom:message', data);
      console.log(`[WS] Intercom message de ${data?.user}`);
    });

    socket.on('intercom:typing', (data) => {
      socket.broadcast.emit('intercom:typing', data);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('users:online', Array.from(onlineUsers.values()));
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
