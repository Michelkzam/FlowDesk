import { useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { wsService } from "@/services/websocket";

const NOTIFICATION_TYPES = {
  TICKET_ASSUMED: "ticket:assumed",
  TICKET_TRANSFERRED: "ticket:transferred",
  TICKET_FINALIZED: "ticket:finalized",
  TICKET_REOPENED: "ticket:reopened",
  MESSAGE_RECEIVED: "message:received",
};

export function useNotifications(currentUser) {
  const { toast } = useToast();
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
        icon: "/favicon.ico",
        tag: "flowdesk-notification",
      });

      notification.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
        notification.close();
      };
    }
  }, []);

  const handleTicketAssumed = useCallback((data) => {
    if (data.agentId === currentUser?.id) return;

    const title = "Ticket Assumido";
    const body = `${data.agentName || "Um técnico"} assumiu o ticket ${data.ticketNumber || ""}`;

    toast({
      title,
      description: body,
      variant: "info",
    });

    playNotificationSound();
    sendBrowserNotification(title, body, `/tickets/${data.ticketId}`);
  }, [currentUser, toast, playNotificationSound, sendBrowserNotification]);

  const handleTicketTransferred = useCallback((data) => {
    if (data.toAgentId !== currentUser?.id) return;

    const title = "Ticket Transferido";
    const body = `Você recebeu o ticket ${data.ticketNumber || ""} de ${data.fromAgentName || "um colega"}`;

    toast({
      title,
      description: body,
      variant: "info",
    });

    playNotificationSound();
    sendBrowserNotification(title, body, `/tickets/${data.ticketId}`);
  }, [currentUser, toast, playNotificationSound, sendBrowserNotification]);

  const handleTicketFinalized = useCallback((data) => {
    if (data.agentId === currentUser?.id) return;

    const title = "Ticket Finalizado";
    const body = `O ticket ${data.ticketNumber || ""} foi finalizado por ${data.agentName || "um técnico"}`;

    toast({
      title,
      description: body,
      variant: "success",
    });
  }, [currentUser, toast]);

  const handleTicketReopened = useCallback((data) => {
    if (data.agentId !== currentUser?.id) return;

    const title = "Ticket Reaberto";
    const body = `O ticket ${data.ticketNumber || ""} foi reaberto pelo usuário`;

    toast({
      title,
      description: body,
      variant: "warning",
    });

    playNotificationSound();
    sendBrowserNotification(title, body, `/tickets/${data.ticketId}`);
  }, [currentUser, toast, playNotificationSound, sendBrowserNotification]);

  const handleMessageReceived = useCallback((data) => {
    if (data.senderType === "agent") return;

    const title = "Nova Mensagem";
    const body = `${data.senderName || "Usuário"}: ${data.message?.substring(0, 50) || ""}${data.message?.length > 50 ? "..." : ""}`;

    toast({
      title,
      description: body,
      variant: "default",
    });

    playNotificationSound();
    sendBrowserNotification(title, body, `/tickets/${data.ticketId}`);
  }, [toast, playNotificationSound, sendBrowserNotification]);

  useEffect(() => {
    const unsubAssumed = wsService.on(NOTIFICATION_TYPES.TICKET_ASSUMED, handleTicketAssumed);
    const unsubTransferred = wsService.on(NOTIFICATION_TYPES.TICKET_TRANSFERRED, handleTicketTransferred);
    const unsubFinalized = wsService.on(NOTIFICATION_TYPES.TICKET_FINALIZED, handleTicketFinalized);
    const unsubReopened = wsService.on(NOTIFICATION_TYPES.TICKET_REOPENED, handleTicketReopened);
    const unsubMessage = wsService.on(NOTIFICATION_TYPES.MESSAGE_RECEIVED, handleMessageReceived);

    return () => {
      unsubAssumed();
      unsubTransferred();
      unsubFinalized();
      unsubReopened();
      unsubMessage();
    };
  }, [handleTicketAssumed, handleTicketTransferred, handleTicketFinalized, handleTicketReopened, handleMessageReceived]);

  return {
    NOTIFICATION_TYPES,
  };
}
