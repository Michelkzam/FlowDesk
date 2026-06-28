import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeColors = {
  meeting: "bg-blue-100 text-blue-700 border-blue-200",
  call: "bg-emerald-100 text-emerald-700 border-emerald-200",
  task: "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-purple-100 text-purple-700 border-purple-200",
};

const typeLabels = { meeting: "Reunião", call: "Ligação", task: "Tarefa", other: "Outro" };

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", type: "meeting", description: "", responsible: "" });
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => db.entities.Appointment.list(),
  });

  const createM = useMutation({
    mutationFn: data => db.entities.Appointment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); setDialogOpen(false); setForm({ title: "", date: "", time: "", type: "meeting", description: "", responsible: "" }); },
  });

  const deleteM = useMutation({
    mutationFn: id => db.entities.Appointment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const getAppointmentsForDay = (day) =>
    appointments.filter(a => a.date && isSameDay(parseISO(a.date), day));

  const openNew = (day) => {
    setSelectedDay(day);
    setForm(f => ({ ...f, date: format(day, "yyyy-MM-dd") }));
    setDialogOpen(true);
  };

  const dayAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Calendário de compromissos e tarefas</p>
        </div>
        <Button onClick={() => { setSelectedDay(new Date()); setForm(f => ({ ...f, date: format(new Date(), "yyyy-MM-dd") })); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-4 border border-border">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold capitalize">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(w => (
                <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-1">{w}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map(day => {
                const dayApps = getAppointmentsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                const inMonth = isSameMonth(day, currentDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => openNew(day)}
                    className={cn(
                      "min-h-[72px] p-1.5 rounded-lg text-left transition-all border",
                      isSelected ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted/50",
                      !inMonth && "opacity-40"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayApps.slice(0, 2).map(a => (
                        <div key={a.id} className={cn("text-xs px-1 py-0.5 rounded truncate border", typeColors[a.type] || typeColors.other)}>
                          {a.time && <span className="mr-1">{a.time}</span>}{a.title}
                        </div>
                      ))}
                      {dayApps.length > 2 && <div className="text-xs text-muted-foreground pl-1">+{dayApps.length - 2}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Day detail */}
        <div>
          <Card className="p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                {selectedDay
                  ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR })
                  : "Selecione um dia"}
              </h3>
              {selectedDay && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openNew(selectedDay)}>
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              )}
            </div>
            {!selectedDay ? (
              <p className="text-sm text-muted-foreground text-center py-8">Clique em um dia para ver os agendamentos</p>
            ) : dayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento neste dia</p>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map(a => (
                  <div key={a.id} className={cn("p-3 rounded-lg border text-sm", typeColors[a.type] || typeColors.other)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                          {a.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.time}</span>}
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{typeLabels[a.type]}</span>
                        </div>
                        {a.responsible && <p className="text-xs mt-1 flex items-center gap-1 opacity-80"><User className="w-3 h-3" />{a.responsible}</p>}
                        {a.description && <p className="text-xs mt-1 opacity-70">{a.description}</p>}
                      </div>
                      <button onClick={() => deleteM.mutate(a.id)} className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Novo Agendamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createM.mutate(form); }} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Descrição do agendamento" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Nome do responsável" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Observações..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createM.isPending}>
                {createM.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}