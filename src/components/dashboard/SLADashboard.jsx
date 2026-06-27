import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/api/flowdeskClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Timer, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { openTicketWindow } from "@/lib/ticketWindow";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SLA_HOURS = {
  emergency: 2,
  high: 8,
  normal: 24,
  low: 48,
};

const PRIORITY_COLORS = {
  emergency: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  normal: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const PRIORITY_LABELS = {
  emergency: "Crítica",
  high: "Alta",
  normal: "Média",
  low: "Baixa",
};

const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  waiting: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  pending_approval: "Pendente",
  resolved: "Resolvido",
  closed: "Fechado",
};

function calculateSLAStatus(ticket, slaPlan) {
  if (["resolved", "closed"].includes(ticket.status)) {
    return { status: "completed", label: "Cumprido" };
  }

  const priorityHours = slaPlan
    ? (ticket.priority === "emergency" ? slaPlan.emergency_hours :
       ticket.priority === "high" ? slaPlan.high_hours :
       ticket.priority === "normal" ? slaPlan.normal_hours :
       slaPlan.low_hours) || SLA_HOURS[ticket.priority] || SLA_HOURS.normal
    : SLA_HOURS[ticket.priority] || SLA_HOURS.normal;

  const created = new Date(ticket.created_date);
  const deadline = new Date(created.getTime() + priorityHours * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline - now;

  if (diff <= 0) {
    const overdueHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    return { status: "overdue", label: "Vencido", hours: overdueHours };
  }

  const remainingHours = Math.floor(diff / (1000 * 60 * 60));
  if (remainingHours < 3) {
    return { status: "critical", label: "Crítico", hours: remainingHours };
  }

  return { status: "ok", label: "No prazo", hours: remainingHours };
}

export default function SLADashboard() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 500),
  });

  const { data: slaPlans = [] } = useQuery({
    queryKey: ["sla-plans"],
    queryFn: () => db.entities.SLAPlan.list(),
  });

  const slaPlan = slaPlans.find(p => p.is_default && p.status === "active") || slaPlans.find(p => p.status === "active");

  const slaMetrics = useMemo(() => {
    const overdueTickets = [];
    const criticalTickets = [];
    const onTrackTickets = [];
    let completedOnTime = 0;
    let completedLate = 0;

    tickets.forEach(ticket => {
      const sla = calculateSLAStatus(ticket, slaPlan);
      if (sla.status === "overdue") overdueTickets.push(ticket);
      else if (sla.status === "critical") criticalTickets.push(ticket);
      else if (sla.status === "ok" && !["resolved", "closed"].includes(ticket.status)) onTrackTickets.push(ticket);
      else if (sla.status === "completed") {
        const created = new Date(ticket.created_date);
        const closed = new Date(ticket.closed_date || ticket.created_date);
        const priorityHours = slaPlan
          ? (ticket.priority === "emergency" ? slaPlan.emergency_hours :
             ticket.priority === "high" ? slaPlan.high_hours :
             ticket.priority === "normal" ? slaPlan.normal_hours :
             slaPlan.low_hours) || SLA_HOURS[ticket.priority] || SLA_HOURS.normal
          : SLA_HOURS[ticket.priority] || SLA_HOURS.normal;
        const deadline = new Date(created.getTime() + priorityHours * 60 * 60 * 1000);
        if (closed <= deadline) completedOnTime++;
        else completedLate++;
      }
    });

    const totalResolved = completedOnTime + completedLate;
    const complianceRate = totalResolved > 0 ? Math.round((completedOnTime / totalResolved) * 100) : 100;

    return {
      active: tickets.filter(t => !["resolved", "closed"].includes(t.status)).length,
      overdue: overdueTickets.length,
      critical: criticalTickets.length,
      onTrack: onTrackTickets.length,
      overdueTickets,
      criticalTickets,
      onTrackTickets,
      completedOnTime,
      completedLate,
      complianceRate,
    };
  }, [tickets, slaPlan]);

  const filteredTickets = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === "overdue") return slaMetrics.overdueTickets;
    if (selectedCategory === "critical") return slaMetrics.criticalTickets;
    if (selectedCategory === "onTrack") return slaMetrics.onTrackTickets;
    if (selectedCategory === "compliant") return tickets.filter(t => ["resolved", "closed"].includes(t.status) && calculateSLAStatus(t, slaPlan).status === "completed");
    return [];
  }, [selectedCategory, slaMetrics, tickets, slaPlan]);

  const categoryLabels = {
    overdue: "Tickets Vencidos",
    critical: "Próximos ao Vencimento",
    onTrack: "No Prazo",
    compliant: "Resolvidos no Prazo",
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("overdue")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Tickets Vencidos</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{slaMetrics.overdue}</p>
                <p className="text-xs text-muted-foreground mt-1">SLA expirado</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("critical")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Próximos ao Vencimento</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{slaMetrics.critical}</p>
                <p className="text-xs text-muted-foreground mt-1">Menos de 3 horas</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                <Timer className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("onTrack")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">No Prazo</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{slaMetrics.onTrack}</p>
                <p className="text-xs text-muted-foreground mt-1">Tickets ativos dentro do prazo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedCategory("compliant")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Taxa de Conformidade</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{slaMetrics.complianceRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{slaMetrics.completedOnTime} de {slaMetrics.completedOnTime + slaMetrics.completedLate} resolvidos no prazo</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {slaMetrics.overdue > 0 && (
        <Card className="border border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Tickets com SLA Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              Existem <strong>{slaMetrics.overdue}</strong> ticket{slaMetrics.overdue !== 1 ? "s" : ""} com SLA vencido que necessitam de atenção imediata.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{categoryLabels[selectedCategory] || ""} ({filteredTickets.length})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket nesta categoria.</p>
            ) : (
              filteredTickets.map(ticket => (
                <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{ticket.number || ticket.id?.slice(0, 8)}</span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[ticket.priority])}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[ticket.status])}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    {ticket.user_name && <p className="text-xs text-muted-foreground">{ticket.user_name}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => { setSelectedCategory(null); openTicketWindow(ticket.id); }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
