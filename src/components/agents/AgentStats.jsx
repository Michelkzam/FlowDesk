import { db } from '@/api/flowdeskClient';

import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default function AgentStats({ agentId, agentName }) {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["agent-tickets", agentId],
    queryFn: () => db.entities.Ticket.filter({ agent_id: agentId }, "-created_date", 500),
    enabled: !!agentId,
  });

  const resolved = tickets.filter(t => ["resolved", "closed"].includes(t.status));

  // Average resolution time in hours
  const avgHours = (() => {
    const with_dates = resolved.filter(t => t.created_date && t.closed_date);
    if (!with_dates.length) return null;
    const total = with_dates.reduce((acc, t) => {
      return acc + (new Date(t.closed_date) - new Date(t.created_date));
    }, 0);
    return Math.round((total / with_dates.length) / (1000 * 60 * 60));
  })();

  const open = tickets.filter(t => ["open", "in_progress", "waiting"].includes(t.status)).length;

  if (isLoading) return <div className="text-xs text-muted-foreground">Carregando estatísticas...</div>;

  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      <Card className="p-3 text-center">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
        <p className="text-xl font-bold">{resolved.length}</p>
        <p className="text-xs text-muted-foreground">Resolvidos</p>
      </Card>
      <Card className="p-3 text-center">
        <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
        <p className="text-xl font-bold">{open}</p>
        <p className="text-xs text-muted-foreground">Em aberto</p>
      </Card>
      <Card className="p-3 text-center">
        <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
        <p className="text-xl font-bold">{avgHours !== null ? `${avgHours}h` : "—"}</p>
        <p className="text-xs text-muted-foreground">Tempo médio</p>
      </Card>
    </div>
  );
}