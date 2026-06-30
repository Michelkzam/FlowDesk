import { supabase } from "@/lib/supabase";

const CHANNELS = {
  global: "flowdesk:global",
  ticket: (id) => `flowdesk:ticket:${id}`,
  typing: (id) => `flowdesk:typing:${id}`,
};

let globalChannel = null;
let ticketChannels = new Map();
let presenceState = new Map();

// --- Global channel (ticket events, online users) ---

export function connectRealtime() {
  if (globalChannel) return globalChannel;

  globalChannel = supabase.channel(CHANNELS.global, {
    config: { presence: { key: crypto.randomUUID() } },
  });

  globalChannel.on("broadcast", { event: "ticket:*" }, ({ event, payload }) => {
    const handlers = globalHandlers.get(event) || [];
    handlers.forEach((h) => h(payload));
  });

  globalChannel.on("broadcast", { event: "message:*" }, ({ event, payload }) => {
    const handlers = globalHandlers.get(event) || [];
    handlers.forEach((h) => h(payload));
  });

  globalChannel.on("presence", { event: "sync" }, () => {
    const state = globalChannel.presenceState();
    const users = [];
    for (const [key, val] of Object.entries(state)) {
      if (val && val[0]) users.push(val[0]);
    }
    presenceState.set("online", users);
    const handlers = globalHandlers.get("users:sync") || [];
    handlers.forEach((h) => h(users));
  });

  globalChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await globalChannel.track({ connected_at: Date.now() });
    }
  });

  return globalChannel;
}

export function disconnectRealtime() {
  if (globalChannel) {
    supabase.removeChannel(globalChannel);
    globalChannel = null;
  }
  for (const ch of ticketChannels.values()) {
    supabase.removeChannel(ch);
  }
  ticketChannels.clear();
}

// --- Global event handlers ---

const globalHandlers = new Map();

export function onGlobalEvent(event, handler) {
  if (!globalHandlers.has(event)) globalHandlers.set(event, new Set());
  globalHandlers.get(event).add(handler);
  return () => globalHandlers.get(event)?.delete(handler);
}

// --- Ticket-specific channels ---

export function joinTicketChannel(ticketId) {
  const key = CHANNELS.ticket(ticketId);
  if (ticketChannels.has(ticketId)) return ticketChannels.get(ticketId);

  const ch = supabase.channel(key);

  ch.on("broadcast", { event: "typing:start" }, ({ payload }) => {
    const handlers = ticketHandlers.get(`${ticketId}:typing:start`) || [];
    handlers.forEach((h) => h(payload));
  });

  ch.on("broadcast", { event: "typing:stop" }, ({ payload }) => {
    const handlers = ticketHandlers.get(`${ticketId}:typing:stop`) || [];
    handlers.forEach((h) => h(payload));
  });

  ch.subscribe();
  ticketChannels.set(ticketId, ch);
  return ch;
}

export function leaveTicketChannel(ticketId) {
  const ch = ticketChannels.get(ticketId);
  if (ch) {
    supabase.removeChannel(ch);
    ticketChannels.delete(ticketId);
  }
}

// --- Ticket event handlers ---

const ticketHandlers = new Map();

export function onTicketEvent(ticketId, event, handler) {
  const key = `${ticketId}:${event}`;
  if (!ticketHandlers.has(key)) ticketHandlers.set(key, new Set());
  ticketHandlers.get(key).add(handler);
  return () => ticketHandlers.get(key)?.delete(handler);
}

// --- Emit functions (client → server → broadcast) ---

export async function broadcastTicketEvent(event, payload) {
  if (!globalChannel) return;
  await globalChannel.send({ type: "broadcast", event, payload });
}

export async function broadcastTypingStart(ticketId, userId, userName) {
  const ch = ticketChannels.get(ticketId);
  if (!ch) return;
  await ch.send({
    type: "broadcast",
    event: "typing:start",
    payload: { ticketId, userId, userName },
  });
}

export async function broadcastTypingStop(ticketId, userId) {
  const ch = ticketChannels.get(ticketId);
  if (!ch) return;
  await ch.send({
    type: "broadcast",
    event: "typing:stop",
    payload: { ticketId, userId },
  });
}

// --- Presence helpers ---

export function getOnlineUsers() {
  return presenceState.get("online") || [];
}

export function trackPresence(userData) {
  if (!globalChannel) return;
  globalChannel.track(userData);
}

export function untrackPresence() {
  if (!globalChannel) return;
  globalChannel.untrack();
}
