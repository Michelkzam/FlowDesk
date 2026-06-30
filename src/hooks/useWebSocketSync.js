import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

let socketMod = null;

async function loadSocket() {
  if (!socketMod) {
    socketMod = await import("@/services/socket");
  }
  return socketMod;
}

export function useWebSocketSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let cleanup = null;

    loadSocket().then(({ connectSocket, disconnectSocket, getSocketConnection, setUserOnline, setUserOffline }) => {
      const s = connectSocket();

      s.on('connect', () => setIsConnected(true));
      s.on('disconnect', () => setIsConnected(false));
      s.on('connect_error', () => setIsConnected(false));

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

      cleanup = () => {
        try { setUserOffline(); } catch (e) {}
        s.off("ticket:created", handleTicketCreated);
        s.off("ticket:updated", handleTicketUpdated);
        s.off("ticket:claimed", handleTicketClaimed);
        s.off("ticket:transferred", handleTicketTransferred);
        s.off("ticket:auto-closed", handleTicketAutoClosed);
        s.off("message:created", handleMessageCreated);
        s.off("users:online", handleUsersOnline);
        try { disconnectSocket(); } catch (e) {}
      };
    }).catch(e => {
      console.warn('[WS] Falha ao conectar:', e.message);
    });

    return () => { if (cleanup) cleanup(); };
  }, [isAuthenticated, user, queryClient]);

  const joinTicket = useCallback((ticketId) => {
    loadSocket().then(({ getSocketConnection }) => {
      getSocketConnection().emit("join:ticket", ticketId);
    }).catch(() => {});
  }, []);

  const leaveTicket = useCallback((ticketId) => {
    loadSocket().then(({ getSocketConnection }) => {
      getSocketConnection().emit("leave:ticket", ticketId);
    }).catch(() => {});
  }, []);

  return {
    isConnected,
    joinTicket,
    leaveTicket,
    onlineUsers,
  };
}
