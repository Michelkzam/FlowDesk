import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { CheckCircle2, XCircle, Eye, Clock, User, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { openTicketWindow } from "@/lib/ticketWindow";
import { ptBR } from "date-fns/locale";

export default function ApprovalQueue() {
  const queryClient = useQueryClient();
  const [rejectTicket, setRejectTicket] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets-pending-approval"],
    queryFn: () => db.entities.Ticket.filter({ status: "pending_approval" }, "-created_date", 100),
    refetchInterval: 300000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Ticket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets-pending-approval"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setRejectTicket(null);
      setRejectReason("");
    }
  });

  const handleApprove = (ticket) => {
    updateMutation.mutate({
      id: ticket.id,
      data: {
        status: "resolved",
        closed_date: new Date().toISOString(),
      }
    });
  };

  const handleReject = () => {
    if (!rejectTicket) return;
    updateMutation.mutate({
      id: rejectTicket.id,
      data: {
        status: "in_progress",
        description: rejectReason
          ? `${rejectTicket.description || ""}\n\n[Reprovado pelo supervisor: ${rejectReason}]`
          : rejectTicket.description,
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-3">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fila de Aprovação</h1>
          <p className="text-sm text-muted-foreground">Tickets aguardando aprovação do supervisor</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5 gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {tickets.length} pendente{tickets.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {tickets.length === 0 ? (
        <Card className="border border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-3" />
            <p className="text-lg font-medium text-foreground">Nenhum ticket pendente</p>
            <p className="text-sm mt-1">Todos os tickets foram aprovados. Bom trabalho!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.number}</span>
                      <PriorityBadge value={ticket.priority} />
                      <StatusBadge value={ticket.status} />
                      {ticket.department_name && (
                        <Badge variant="outline" className="text-xs">{ticket.department_name}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{ticket.title}</h3>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ticket.user_name || "—"}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> Técnico: {ticket.agent_name || "—"}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ticket.created_date ? format(new Date(ticket.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</span>
                      <button onClick={() => openTicketWindow(ticket.id)} className="flex items-center gap-1 text-primary hover:underline ml-auto">
                        <Eye className="w-3 h-3" /> Ver detalhes
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setRejectTicket(ticket)}
                      disabled={updateMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reprovar
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(ticket)}
                      disabled={updateMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectTicket} onOpenChange={() => { setRejectTicket(null); setRejectReason(""); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Reprovar Ticket
            </DialogTitle>
            <DialogDescription>
              O ticket <strong>{rejectTicket?.title}</strong> será devolvido ao técnico com status "Em Andamento".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Motivo da reprovação (opcional)</label>
            <Textarea
              placeholder="Descreva o motivo pelo qual o ticket não foi aprovado..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="h-24"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTicket(null); setRejectReason(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateMutation.isPending}
              className="gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}