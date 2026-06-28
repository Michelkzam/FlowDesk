import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const channelIcons = {
  whatsapp: "🟢",
  telegram: "🔵",
  email: "📧",
  phone: "📞",
  portal: "🌐",
};

export default function ChatTicketCard({ ticket, onClick }) {
  return (
    <Card
      onClick={() => onClick?.(ticket)}
      className="p-4 border border-border hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          #{ticket.id?.slice(-6)}
        </span>
        <span className="text-lg">{channelIcons[ticket.channel] || "🌐"}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{ticket.client_name || "Sem cliente"}</span>
        </div>

        {ticket.title && (
          <p className="text-xs text-muted-foreground truncate">{ticket.title}</p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {ticket.operator_name && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {ticket.operator_name}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(ticket.created_date), "dd/MM HH:mm", { locale: ptBR })}
          </span>
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}