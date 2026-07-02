import { supabase } from "@/lib/supabase";

let callChannel = null;
let callHandlers = new Map();

export function connectCallSignaling() {
  if (callChannel) return callChannel;

  callChannel = supabase.channel("flowdesk:calls", {
    config: { presence: { key: crypto.randomUUID() } },
  });

  callChannel.on("broadcast", { event: "call:*" }, ({ event, payload }) => {
    const handlers = callHandlers.get(event) || [];
    handlers.forEach((h) => h(payload));
  });

  callChannel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await callChannel.track({ connected_at: Date.now() });
    }
  });

  return callChannel;
}

export function disconnectCallSignaling() {
  if (callChannel) {
    supabase.removeChannel(callChannel);
    callChannel = null;
  }
  callHandlers.clear();
}

export function onCallEvent(event, handler) {
  if (!callHandlers.has(event)) callHandlers.set(event, new Set());
  callHandlers.get(event).add(handler);
  return () => callHandlers.get(event)?.delete(handler);
}

export async function broadcastCallEvent(event, payload) {
  if (!callChannel) {
    connectCallSignaling();
  }
  await callChannel.send({ type: "broadcast", event, payload });
}

export function sendCallOffer(targetUserId, offer, callerInfo) {
  return broadcastCallEvent("call:offer", {
    targetUserId,
    offer,
    caller: callerInfo,
  });
}

export function sendCallAnswer(targetUserId, answer) {
  return broadcastCallEvent("call:answer", {
    targetUserId,
    answer,
  });
}

export function sendIceCandidate(targetUserId, candidate) {
  return broadcastCallEvent("call:ice-candidate", {
    targetUserId,
    candidate,
  });
}

export function sendCallReject(targetUserId) {
  return broadcastCallEvent("call:reject", {
    targetUserId,
  });
}

export function sendCallHangup(targetUserId) {
  return broadcastCallEvent("call:hangup", {
    targetUserId,
  });
}
