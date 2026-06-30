import { useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket } from "@/services/socket";

export function useNotifications(currentUser) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
      audioRef.current.volume = 0.3;
    }
    audioRef.current.play().catch(() => {});
  }, []);

  const sendBrowserNotification = useCallback((title, body, url) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        tag: "flowdesk-notification",
      });
      notification.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
        notification.close();
      };
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let s;
    try {
      s = connectSocket();
    } catch (e) {
      console.warn('[Notifications] Falha ao conectar:', e.message);
      return;
    }

    const handleTicketClaimed = (data) => {
      if (data.agent_id === currentUser?.id) return;
      const title = "Ticket Assumido";
      const body = `O ticket foi assumido por ${data.agent_name || "um técnico"}`;
      toast({ title, description: body, variant: "info" });
      playNotificationSound();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketUpdated = (data) => {
      if (data.status === "resolved" || data.status === "closed") {
        if (data.agent_id === currentUser?.id) return;
        const title = "Ticket Finalizado";
        const body = `O ticket ${data.number || ""} foi finalizado`;
        toast({ title, description: body, variant: "success" });
      }
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      if (data.id) queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
    };

    const handleTicketTransferred = (data) => {
      if (data.to_agent_id !== currentUser?.id) return;
      const title = "Ticket Transferido";
      const body = `Você recebeu um ticket de ${data.from_agent_name || "um colega"}`;
      toast({ title, description: body, variant: "info" });
      playNotificationSound();
      sendBrowserNotification(title, body, `/tickets/${data.ticketId || ""}`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleMessageCreated = (data) => {
      if (data.sender_type === "agent") return;
      const title = "Nova Mensagem";
      const body = `${data.sender_name || "Usuário"}: ${(data.body || "").substring(0, 50)}${(data.body || "").length > 50 ? "..." : ""}`;
      toast({ title, description: body, variant: "default" });
      playNotificationSound();
      sendBrowserNotification(title, body, `/tickets/${data.ticket_id}`);
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", data.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    const handleTicketAutoClosed = (data) => {
      const title = "Ticket Auto-fechado";
      const body = `O ticket ${data.number || ""} foi encerrado por inatividade`;
      toast({ title, description: body, variant: "warning" });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    };

    s.on("ticket:claimed", handleTicketClaimed);
    s.on("ticket:updated", handleTicketUpdated);
    s.on("ticket:transferred", handleTicketTransferred);
    s.on("message:created", handleMessageCreated);
    s.on("ticket:auto-closed", handleTicketAutoClosed);

    return () => {
      s.off("ticket:claimed", handleTicketClaimed);
      s.off("ticket:updated", handleTicketUpdated);
      s.off("ticket:transferred", handleTicketTransferred);
      s.off("message:created", handleMessageCreated);
      s.off("ticket:auto-closed", handleTicketAutoClosed);
    };
  }, [currentUser, toast, playNotificationSound, sendBrowserNotification, queryClient]);

  return {};
}
