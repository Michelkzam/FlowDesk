import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket, disconnectSocket, getSocketConnection, setUserOnline, setUserOffline } from "@/services/socket";
import { useAuth } from "@/lib/AuthContext";

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let s;
    try {
      s = connectSocket();
    } catch (e) {
      console.warn('[WS] Falha ao conectar:', e.message);
      return;
    }

    s.on("connect", () => {
      setUserOnline({
        id: user.id,
        name: user.full_name || user.email,
        role: user.role,
      });
    });

    const handleTicketCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketUpdated = (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      if (data?.id) queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
    };

    const handleTicketClaimed = () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketTransferred = () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketAutoClosed = () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleMessageCreated = (data) => {
      if (data?.ticket_id) queryClient.invalidateQueries({ queryKey: ["ticket-messages", data.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleUsersOnline = (users) => {
      setOnlineUsers(users);
    };

    s.on("ticket:created", handleTicketCreated);
    s.on("ticket:updated", handleTicketUpdated);
    s.on("ticket:claimed", handleTicketClaimed);
    s.on("ticket:transferred", handleTicketTransferred);
    s.on("ticket:auto-closed", handleTicketAutoClosed);
    s.on("message:created", handleMessageCreated);
    s.on("users:online", handleUsersOnline);

    return () => {
      setUserOffline();
      s.off("ticket:created", handleTicketCreated);
      s.off("ticket:updated", handleTicketUpdated);
      s.off("ticket:claimed", handleTicketClaimed);
      s.off("ticket:transferred", handleTicketTransferred);
      s.off("ticket:auto-closed", handleTicketAutoClosed);
      s.off("message:created", handleMessageCreated);
      s.off("users:online", handleUsersOnline);
      try { disconnectSocket(); } catch (e) {}
    };
  }, [isAuthenticated, user, queryClient]);

  const joinTicket = useCallback((ticketId) => {
    try {
      const s = getSocketConnection();
      s.emit("join:ticket", ticketId);
    } catch (e) {}
  }, []);

  const leaveTicket = useCallback((ticketId) => {
    try {
      const s = getSocketConnection();
      s.emit("leave:ticket", ticketId);
    } catch (e) {}
  }, []);

  return {
    isConnected: (() => { try { return getSocketConnection()?.connected || false; } catch { return false; } })(),
    joinTicket,
    leaveTicket,
    onlineUsers,
  };
}
