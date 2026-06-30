import { io } from "socket.io-client";
import { supabase } from "@/lib/supabase";

const SOCKET_URL = import.meta.env.VITE_WS_URL || "http://localhost:3001";

let socket = null;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      auth: async (cb) => {
        const token = await getToken();
        cb({ token });
      },
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

export function setUserOnline(userData) {
  const s = getSocket();
  s.emit("user:online", userData);
}

export function setUserOffline() {
  const s = getSocket();
  s.emit("user:offline");
}

export function emitTypingStart(ticketId, userId, userName) {
  const s = getSocket();
  s.emit("typing:start", { ticketId, userId, userName });
}

export function emitTypingStop(ticketId, userId) {
  const s = getSocket();
  s.emit("typing:stop", { ticketId, userId });
}
