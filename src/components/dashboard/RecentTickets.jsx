import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink } from "lucide-react";

const statusMap = {
  open: { label: "Aberto", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "Em Andamento", class: "bg-amber-100 text-amber-700 border-amber-200" },
  waiting: { label: "Aguardando", class: "bg-purple-100 text-purple-700 border-purple-200" },
  resolved: { label: "Resolvido", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Fechado", class: "bg-muted text-muted-foreground border-border" },
};

const priorityMap = {
  low: { label: "Baixa", class: "bg-muted text-muted-foreground" },
  normal: { label: "Média", class: "bg-blue-100 text-blue-600" },
  high: { label: "Alta", class: "bg-amber-100 text-amber-600" },
  emergency: { label: "Crítica", class: "bg-red-100 text-red-600" },
};

export default function RecentTickets({ tickets }) {
  return (
    <Card className="border border-border overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Tickets Recentes</h3>
        <Link to="/chat/chats" className="text-xs text-primary hover:underline flex items-center gap-1">
          Ver todos <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhum ticket encontrado</div>
        ) : (
          tickets.slice(0, 8).map(ticket => (
            <Link
              key={ticket.id}
              to={`/chat/chats`}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ticket.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{ticket.client_name || "Sem cliente"}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Badge variant="outline" className={priorityMap[ticket.priority]?.class}>
                  {priorityMap[ticket.priority]?.label}
                </Badge>
                <Badge variant="outline" className={statusMap[ticket.status]?.class}>
                  {statusMap[ticket.status]?.label}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}