import { useEffect, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const CHANNEL_NAME = "flowdesk-realtime";
let broadcastChannel = null;

function getBroadcastChannel() {
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch (e) {
      console.warn("BroadcastChannel não suportado");
    }
  }
  return broadcastChannel;
}

export function broadcastTicketUpdate(ticketId, updateType, data) {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: "TICKET_UPDATE",
      ticketId,
      updateType,
      data,
      timestamp: Date.now(),
    });
  }
}

export function broadcastMessageUpdate(ticketId, message) {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: "MESSAGE_UPDATE",
      ticketId,
      message,
      timestamp: Date.now(),
    });
  }
}

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const channel = getBroadcastChannel();
    if (!channel) return;

    const handleMessage = (event) => {
      const { type, ticketId, timestamp } = event.data;

      if (timestamp <= lastUpdateRef.current) return;
      lastUpdateRef.current = timestamp;

      if (type === "TICKET_UPDATE") {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        if (ticketId) {
          queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
        }
      }

      if (type === "MESSAGE_UPDATE" && ticketId) {
        queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }
    };

    channel.addEventListener("message", handleMessage);
    return () => channel.removeEventListener("message", handleMessage);
  }, [queryClient]);
}

export function useSmartPolling(queryKey, fetchFn, options = {}) {
  const { enabled = true, baseInterval = 10000, activeInterval = 2000 } = options;
  const intervalRef = useRef(baseInterval);
  const lastDataRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: fetchFn,
    enabled,
    refetchInterval: intervalRef.current,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data && lastDataRef.current) {
      const hasChanged = JSON.stringify(data) !== JSON.stringify(lastDataRef.current);
      if (hasChanged) {
        intervalRef.current = activeInterval;
      } else {
        intervalRef.current = baseInterval;
      }
    }
    lastDataRef.current = data;
  }, [data, baseInterval, activeInterval]);

  return { data, isLoading };
}
