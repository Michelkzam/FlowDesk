import { useEffect, useRef } from "react";
import { db } from "@/api/flowdeskClient";

const INACTIVITY_HOURS = {
  waiting: 120,
  in_progress: 120,
};

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useInactivityClose(queryClient) {
  const intervalRef = useRef(null);

  useEffect(() => {
    const checkInactiveTickets = async () => {
      try {
        const tickets = await db.entities.Ticket.list("-created_date", 500);

        const closableTickets = tickets.filter(t => {
          if (!["waiting", "in_progress"].includes(t.status)) return false;
          if (!t.last_user_response_date) return false;

          const hours = INACTIVITY_HOURS[t.status] || 120;
          const lastUserResponse = new Date(t.last_user_response_date);
          const now = new Date();
          const hoursSinceLastResponse = (now - lastUserResponse) / (1000 * 60 * 60);

          return hoursSinceLastResponse >= hours;
        });

        for (const ticket of closableTickets) {
          await db.entities.Ticket.update(ticket.id, {
            status: "closed",
            closed_date: new Date().toISOString(),
          });

          await db.entities.TicketMessage.create({
            ticket_id: ticket.id,
            body: `[Sistema] Ticket encerrado automaticamente por inatividade do usuário. Última interação: ${ticket.last_user_response_date ? new Date(ticket.last_user_response_date).toLocaleString("pt-BR") : "desconhecida"}.`,
            sender_type: "system",
            sender_name: "Sistema",
            type: "system",
            is_internal: false,
          });
        }

        if (closableTickets.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
        }
      } catch (error) {
        console.error("Erro ao verificar tickets inativos:", error);
      }
    };

    checkInactiveTickets();
    intervalRef.current = setInterval(checkInactiveTickets, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient]);
}
