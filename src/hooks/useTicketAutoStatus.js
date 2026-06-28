import { db } from '@/api/flowdeskClient';

/**
 * Hook that checks every 2 hours for tickets "in_progress" or "open"
 * with no response for more than 24 hours and moves them to "waiting".
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useTicketAutoStatus() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const run = async () => {
      const tickets = await db.entities.Ticket.filter({ status: "open" }, "-created_date", 100)
        .catch(() => []);
      const inProgress = await db.entities.Ticket.filter({ status: "in_progress" }, "-created_date", 100)
        .catch(() => []);
      const allTickets = [...tickets, ...inProgress];
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const stale = allTickets.filter(t =>
        (!t.last_response_date
          ? new Date(t.created_date) < cutoff
          : new Date(t.last_response_date) < cutoff)
      );

      if (stale.length === 0) return;

      const results = await Promise.allSettled(
        stale.map(t => db.entities.Ticket.update(t.id, { status: "waiting" }))
      );

      const succeeded = results.filter(r => r.status === "fulfilled").length;
      if (succeeded > 0) {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }
    };

    // Delay initial run by 5 seconds to avoid startup burst
    const timeout = setTimeout(run, 5000);
    const interval = setInterval(run, 2 * 60 * 60 * 1000); // every 2 hours
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [queryClient]);
}