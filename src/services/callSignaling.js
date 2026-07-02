import { supabase } from "@/lib/supabase";

let callChannel = null;
let callHandlers = new Map();
let subscribedResolve = null;
let isSubscribed = false;

export function connectCallSignaling() {
  if (callChannel && isSubscribed) {
    console.log("[CallSignaling] Already connected")
    return callChannel;
  }

  if (callChannel) {
    console.log("[CallSignaling] Channel exists, waiting for subscription")
    return callChannel;
  }

  console.log("[CallSignaling] Creating new channel")
  callChannel = supabase.channel("flowdesk:calls", {
    config: { presence: { key: crypto.randomUUID() } },
  });

  callChannel.on("broadcast", { event: "call:*" }, ({ event, payload }) => {
    console.log("[CallSignaling] Received broadcast:", event, "payload:", payload?.targetUserId)
    const handlers = callHandlers.get(event) || [];
    handlers.forEach((h) => h(payload));
  });

  callChannel.subscribe(async (status) => {
    console.log("[CallSignaling] Subscribe status:", status)
    if (status === "SUBSCRIBED") {
      isSubscribed = true;
      await callChannel.track({ connected_at: Date.now() });
      if (subscribedResolve) {
        subscribedResolve();
        subscribedResolve = null;
      }
    }
  });

  return callChannel;
}

export function waitForSubscription() {
  if (isSubscribed) return Promise.resolve();
  return new Promise((resolve) => {
    subscribedResolve = resolve;
    connectCallSignaling();
  });
}

export function disconnectCallSignaling() {
  if (callChannel) {
    supabase.removeChannel(callChannel);
    callChannel = null;
  }
  isSubscribed = false;
  callHandlers.clear();
}

export function onCallEvent(event, handler) {
  if (!callHandlers.has(event)) callHandlers.set(event, new Set());
  callHandlers.get(event).add(handler);
  return () => callHandlers.get(event)?.delete(handler);
}

export async function broadcastCallEvent(event, payload) {
  console.log("[CallSignaling] Broadcasting event:", event, "subscribed:", isSubscribed)
  connectCallSignaling()
  await waitForSubscription()
  console.log("[CallSignaling] Channel ready, sending:", event)
  await callChannel.send({ type: "broadcast", event, payload })
  console.log("[CallSignaling] Broadcast sent:", event)
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
