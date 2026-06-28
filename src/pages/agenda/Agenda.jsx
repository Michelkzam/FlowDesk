import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Calendar, Clock, User, AlertTriangle, XCircle, Users } from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  scheduled: { label: "Agendado", class: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "Em andamento", class: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Finalizado", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado", class: "bg-muted text-muted-foreground border-border" },
  overdue: { label: "Atrasado", class: "bg-red-100 text-red-700 border-red-200" },
};

const typeConfig = {
  meeting: "Reunião",
  call: "Ligação",
  support: "Suporte",
  followup: "Follow-up",
  other: "Outro",
};

export default function Agenda() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterView, setFilterView] = useState(null);
  const [formData, setFormData] = useState({
    title: "", description: "", client_name: "", operator_name: "",
    type: "support", status: "scheduled", priority: "normal",
    start_date: "", end_date: "", notes: ""
  });
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => db.entities.Appointment.list("-start_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const appt = await db.entities.Appointment.create(data);
      // Auto-create ticket
      await db.entities.Ticket.create({
        title: `[Agendamento] ${data.title}`,
        description: data.description || "",
        client_name: data.client_name || "",
        operator_name: data.operator_name || "",
        status: "open",
        priority: data.priority || "normal",
        scheduled_date: data.start_date,
        is_scheduled: true,
        channel: "portal",
      });
      return appt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setDialogOpen(false);
      setFormData({ title: "", description: "", client_name: "", operator_name: "", type: "support", status: "scheduled", priority: "normal", start_date: "", end_date: "", notes: "" });
    },
  });

  const today = appointments.filter(a => a.start_date && isToday(new Date(a.start_date)));
  const thisWeek = appointments.filter(a => a.start_date && isThisWeek(new Date(a.start_date)));
  const thisMonth = appointments.filter(a => a.start_date && isThisMonth(new Date(a.start_date)));
  const overdue = appointments.filter(a => a.start_date && isPast(new Date(a.start_date)) && a.status === "scheduled");
  const notFinished = appointments.filter(a => a.status !== "completed" && a.status !== "cancelled");
  const uniqueClients = [...new Set(appointments.map(a => a.client_name).filter(Boolean))];

  const dashItems = [
    { key: "today", label: "Eventos de Hoje", count: today.length, icon: Calendar, color: "text-blue-600 bg-blue-100", data: today },
    { key: "week", label: "Eventos da Semana", count: thisWeek.length, icon: Clock, color: "text-purple-600 bg-purple-100", data: thisWeek },
    { key: "month", label: "Eventos do Mês", count: thisMonth.length, icon: Calendar, color: "text-emerald-600 bg-emerald-100", data: thisMonth },
    { key: "overdue", label: "Atrasados", count: overdue.length, icon: AlertTriangle, color: "text-red-600 bg-red-100", data: overdue },
    { key: "unfinished", label: "Não Finalizados", count: notFinished.length, icon: XCircle, color: "text-amber-600 bg-amber-100", data: notFinished },
    { key: "clients", label: "Clientes c/ Agendamento", count: uniqueClients.length, icon: Users, color: "text-indigo-600 bg-indigo-100", data: appointments.filter(a => a.client_name) },
  ];

  const listData = filterView ? dashItems.find(d => d.key === filterView)?.data || [] : appointments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie agendamentos e tarefas</p>
        </div>
        <div className="flex gap-2">
          {filterView && (
            <Button variant="outline" onClick={() => setFilterView(null)}>Todos</Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {dashItems.map(item => {
          const Icon = item.icon;
          return (
            <Card
              key={item.key}
              className={`p-4 cursor-pointer border border-border transition-all hover:shadow-md ${filterView === item.key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilterView(filterView === item.key ? null : item.key)}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${item.color.split(" ")[1]}`}>
                <Icon className={`w-4 h-4 ${item.color.split(" ")[0]}`} />
              </div>
              <p className="text-2xl font-bold">{item.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.label}</p>
            </Card>
          );
        })}
      </div>

      {filterView && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary font-medium">
          Exibindo: {dashItems.find(d => d.key === filterView)?.label}
        </div>
      )}

      {/* Appointments list */}
      <Card className="border border-border divide-y divide-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : listData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum agendamento encontrado</p>
          </div>
        ) : listData.map(appt => {
          const st = statusConfig[appt.status] || statusConfig.scheduled;
          return (
            <div key={appt.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0 text-primary">
                <span className="text-xs font-bold">{appt.start_date ? format(new Date(appt.start_date), "dd", { locale: ptBR }) : "—"}</span>
                <span className="text-xs">{appt.start_date ? format(new Date(appt.start_date), "MMM", { locale: ptBR }) : ""}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{appt.title}</span>
                  <Badge variant="outline" className={st.class}>{st.label}</Badge>
                  {appt.type && <Badge variant="outline" className="text-xs">{typeConfig[appt.type]}</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {appt.start_date && <span>{format(new Date(appt.start_date), "HH:mm")} {appt.end_date ? `→ ${format(new Date(appt.end_date), "HH:mm")}` : ""}</span>}
                  {appt.client_name && <span><User className="w-3 h-3 inline" /> {appt.client_name}</span>}
                  {appt.operator_name && <span>Op: {appt.operator_name}</span>}
                </div>
                {appt.description && <p className="text-xs text-muted-foreground mt-1 truncate">{appt.description}</p>}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Título do agendamento" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data/Hora de Início *</Label>
                <Input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Data/Hora de Término</Label>
                <Input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={formData.client_name} onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>Operador</Label>
                <Input value={formData.operator_name} onChange={(e) => setFormData(p => ({ ...p, operator_name: e.target.value }))} placeholder="Nome do operador" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="emergency">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Detalhes do agendamento..."
              />
            </div>
            <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800">
              ✅ Um ticket de atendimento será criado automaticamente ao salvar este agendamento.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}