import { useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { onGlobalEvent } from "@/services/realtime";

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

    const unsubs = [
      onGlobalEvent("ticket:claimed", (data) => {
        if (data.agent_id === currentUser?.id) return;
        toast({ title: "Ticket Assumido", description: `O ticket foi assumido por ${data.agent_name || "um técnico"}`, variant: "info" });
        playNotificationSound();
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("ticket:updated", (data) => {
        if (data.status === "resolved" || data.status === "closed") {
          if (data.agent_id === currentUser?.id) return;
          toast({ title: "Ticket Finalizado", description: `O ticket ${data.number || ""} foi finalizado`, variant: "success" });
        }
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        if (data.id) queryClient.invalidateQueries({ queryKey: ["ticket", data.id] });
      }),
      onGlobalEvent("ticket:transferred", (data) => {
        if (data.to_agent_id !== currentUser?.id) return;
        toast({ title: "Ticket Transferido", description: `Você recebeu um ticket de ${data.from_agent_name || "um colega"}`, variant: "info" });
        playNotificationSound();
        sendBrowserNotification("Ticket Transferido", `Você recebeu um ticket de ${data.from_agent_name || "um colega"}`, `/tickets/${data.ticketId || ""}`);
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("message:created", (data) => {
        if (data.sender_type === "agent") return;
        const body = `${data.sender_name || "Usuário"}: ${(data.body || "").substring(0, 50)}${(data.body || "").length > 50 ? "..." : ""}`;
        toast({ title: "Nova Mensagem", description: body, variant: "default" });
        playNotificationSound();
        sendBrowserNotification("Nova Mensagem", body, `/tickets/${data.ticket_id}`);
        queryClient.invalidateQueries({ queryKey: ["ticket-messages", data.ticket_id] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
      onGlobalEvent("ticket:auto-closed", (data) => {
        toast({ title: "Ticket Auto-fechado", description: `O ticket ${data.number || ""} foi encerrado por inatividade`, variant: "warning" });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [currentUser, toast, playNotificationSound, sendBrowserNotification, queryClient]);

  return {};
}
