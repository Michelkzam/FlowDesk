import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { useAuth } from "@/lib/AuthContext";

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

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const s = getSocket();

    if (!s.connected) {
      s.connect();
    }

    const handleTicketCreated = (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketUpdated = (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
    };

    const handleTicketClaimed = (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketTransferred = (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketAutoClosed = (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleMessageCreated = (data) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", data.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    s.on("ticket:created", handleTicketCreated);
    s.on("ticket:updated", handleTicketUpdated);
    s.on("ticket:claimed", handleTicketClaimed);
    s.on("ticket:transferred", handleTicketTransferred);
    s.on("ticket:auto-closed", handleTicketAutoClosed);
    s.on("message:created", handleMessageCreated);

    return () => {
      s.off("ticket:created", handleTicketCreated);
      s.off("ticket:updated", handleTicketUpdated);
      s.off("ticket:claimed", handleTicketClaimed);
      s.off("ticket:transferred", handleTicketTransferred);
      s.off("ticket:auto-closed", handleTicketAutoClosed);
      s.off("message:created", handleMessageCreated);
    };
  }, [isAuthenticated, user, queryClient]);

  const joinTicket = useCallback((ticketId) => {
    const s = getSocket();
    s.emit("join:ticket", ticketId);
  }, []);

  const leaveTicket = useCallback((ticketId) => {
    const s = getSocket();
    s.emit("leave:ticket", ticketId);
  }, []);

  return {
    isConnected: socket?.connected || false,
    joinTicket,
    leaveTicket,
  };
}
