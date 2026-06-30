import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import {
  connectRealtime,
  onGlobalEvent,
  trackPresence,
  untrackPresence,
} from "@/services/realtime";

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const ch = connectRealtime();
    setIsConnected(!!ch);

    trackPresence({
      id: user.id,
      name: user.full_name || user.email,
      role: user.role,
    });

    const unsubs = [
      onGlobalEvent("ticket:created", () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("ticket:updated", (data) => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        if (data?.id) queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
      }),
      onGlobalEvent("ticket:claimed", () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("ticket:transferred", () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("ticket:auto-closed", () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("message:created", (data) => {
        if (data?.ticket_id) queryClient.invalidateQueries({ queryKey: ["ticket-messages", data.ticket_id] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("users:sync", (users) => {
        setOnlineUsers(users);
      }),
    ];

    return () => {
      unsubs.forEach((fn) => fn());
      untrackPresence();
    };
  }, [isAuthenticated, user, queryClient]);

  const joinTicket = useCallback((_ticketId) => {}, []);
  const leaveTicket = useCallback((_ticketId) => {}, []);

  return { isConnected, joinTicket, leaveTicket, onlineUsers };
}
