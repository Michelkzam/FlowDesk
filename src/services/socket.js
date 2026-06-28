import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_WS_URL || "http://localhost:3001";

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  const s = getSocket();
  s.disconnect();
  socket = null;
}

export function getSocketConnection() {
  return getSocket();
}

export function emitToTicket(ticketId, event, data) {
  const s = getSocket();
  s.emit("join:ticket", ticketId);
  s.emit(event, data);
}

export function emitToAll(event, data) {
  const s = getSocket();
  s.emit(event, data);
}
