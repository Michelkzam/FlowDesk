import { supabase } from '@/lib/supabase';

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CalendarDays, User, UserPlus, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_TYPES = [
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
  { value: "holiday", label: "Feriado" },
];
const RECURRENCES = [
  { value: 1, label: "1º" }, { value: 2, label: "2º" }, { value: 3, label: "3º" },
  { value: 4, label: "4º" }, { value: 5, label: "5º" },
];

function getOccurrenceInMonth(year, month, dayType, weekNum) {
  const dayMap = { saturday: 6, sunday: 0, holiday: 6 };
  const targetDay = dayMap[dayType];
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const matching = allDays.filter(d => getDay(d) === targetDay);
  return matching[weekNum - 1] || null;
}

export default function AgentSchedulePage() {
  const [activeTab, setActiveTab] = useState("hours");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ agent_id: "", day_type: "saturday", recurrence_week: 1, start_time: "08:00", end_time: "18:00", notes: "" });
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["work-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_schedules').select('*').order('day_of_week');
      if (error) { console.error(error); return []; }
      return data || [];
    },
  });

  const { data: onCallRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ["on-call-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from('on_call_rules').select('*').order('day_type');
      if (error) { console.error(error); return []; }
      return data || [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id, full_name, email').in('role', ['admin', 'agent']);
      if (error) return [];
      return data || [];
    },
  });

  const updateScheduleM = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('work_schedules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-schedules"] }),
  });

  const createRuleM = useMutation({
    mutationFn: async (d) => {
      const agent = agents.find(a => a.id === d.agent_id);
      const payload = { ...d, agent_name: agent?.full_name || agent?.email || "" };
      delete payload.id;
      const { data, error } = await supabase.from('on_call_rules').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["on-call-rules"] }); setRuleDialogOpen(false); },
    onError: (e) => console.error('[Escalas] Erro criar regra:', e),
  });

  const updateRuleM = useMutation({
    mutationFn: async ({ id, data }) => {
      const agent = agents.find(a => a.id === data.agent_id);
      const payload = { ...data, agent_name: agent?.full_name || agent?.email || "" };
      delete payload.id;
      delete payload.created_at;
      const { error } = await supabase.from('on_call_rules').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["on-call-rules"] }); setRuleDialogOpen(false); setEditingRule(null); },
    onError: (e) => console.error('[Escalas] Erro atualizar regra:', e),
  });

  const deleteRuleM = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('on_call_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["on-call-rules"] }),
  });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const onCallByDate = useMemo(() => {
    const map = {};
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    onCallRules.filter(r => r.status === 'active').forEach(rule => {
      const date = getOccurrenceInMonth(year, month, rule.day_type, rule.recurrence_week);
      if (date) {
        const key = format(date, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(rule);
      }
    });
    return map;
  }, [onCallRules, currentMonth]);

  const toggleScheduleDay = (schedule) => {
    updateScheduleM.mutate({ id: schedule.id, data: { is_active: !schedule.is_active } });
  };

  const updateTime = (schedule, field, value) => {
    updateScheduleM.mutate({ id: schedule.id, data: { [field]: value || null } });
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({ agent_id: rule.agent_id || "", day_type: rule.day_type, recurrence_week: rule.recurrence_week, start_time: rule.start_time, end_time: rule.end_time, notes: rule.notes || "" });
    setRuleDialogOpen(true);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleForm({ agent_id: "", day_type: "saturday", recurrence_week: 1, start_time: "08:00", end_time: "18:00", notes: "" });
    setRuleDialogOpen(true);
  };

  const handleSubmitRule = (e) => {
    e.preventDefault();
    if (!ruleForm.agent_id) return;
    if (editingRule) updateRuleM.mutate({ id: editingRule.id, data: ruleForm });
    else createRuleM.mutate(ruleForm);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Escalas de Trabalho</h1>
        <p className="text-sm text-muted-foreground">Horários de atendimento e regras de plantão</p>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === "hours" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("hours")} className="gap-1.5">
          <Clock className="w-4 h-4" /> Dias e Horários
        </Button>
        <Button variant={activeTab === "oncall" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("oncall")} className="gap-1.5">
          <CalendarDays className="w-4 h-4" /> Plantão / Rodízio
        </Button>
        <Button variant={activeTab === "calendar" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("calendar")} className="gap-1.5">
          <CalendarDays className="w-4 h-4" /> Calendário
        </Button>
      </div>

      {/* TAB: Dias e Horários */}
      {activeTab === "hours" && (
        <Card className="border border-border divide-y divide-border overflow-hidden">
          {loadingSchedules ? (
            Array(7).fill(0).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-16 w-full" /></div>)
          ) : schedules.map(schedule => (
            <div key={schedule.id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${schedule.is_active ? "bg-card" : "bg-muted/30"}`}>
              <button onClick={() => toggleScheduleDay(schedule)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all ${schedule.is_active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {schedule.is_active ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${schedule.is_active ? "text-foreground" : "text-muted-foreground"}`}>{schedule.day_name}</p>
              </div>
              {schedule.is_active ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Input type="time" value={schedule.start_time || ""} onChange={e => updateTime(schedule, 'start_time', e.target.value)} className="w-28 h-8 text-xs" />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="time" value={schedule.end_time || ""} onChange={e => updateTime(schedule, 'end_time', e.target.value)} className="w-28 h-8 text-xs" />
                  <span className="text-xs text-muted-foreground mx-1">Intervalo:</span>
                  <Input type="time" value={schedule.break_start || ""} onChange={e => updateTime(schedule, 'break_start', e.target.value)} className="w-28 h-8 text-xs" />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input type="time" value={schedule.break_end || ""} onChange={e => updateTime(schedule, 'break_end', e.target.value)} className="w-28 h-8 text-xs" />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic shrink-0">Folga</span>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* TAB: Plantão / Rodízio */}
      {activeTab === "oncall" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewRule} className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Nova Regra</Button>
          </div>
          <Card className="border border-border overflow-hidden">
            {loadingRules ? (
              <div className="p-4"><Skeleton className="h-20 w-full" /></div>
            ) : onCallRules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma regra de plantão configurada</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {onCallRules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{rule.agent_name || "Sem agente"}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {DAY_TYPES.find(d => d.value === rule.day_type)?.label || rule.day_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rule.recurrence_week}º do mês
                        </Badge>
                        <span className="text-xs text-muted-foreground">{rule.start_time} - {rule.end_time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditRule(rule)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteRuleM.mutate(rule.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB: Calendário */}
      {activeTab === "calendar" && (
        <Card className="border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="w-5 h-5" /></Button>
            <h3 className="text-sm font-semibold capitalize">{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</h3>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="w-5 h-5" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const rules = onCallByDate[key] || [];
              const inMonth = isSameMonth(day, currentMonth);
              return (
                <div key={i} className={`p-1.5 rounded-lg min-h-[60px] text-center ${inMonth ? "bg-card border border-border" : "bg-transparent text-muted-foreground/30"}`}>
                  <p className={`text-xs font-medium mb-1 ${inMonth ? "text-foreground" : ""}`}>{format(day, "d")}</p>
                  {rules.map((rule, ri) => (
                    <div key={ri} className="bg-primary/10 text-primary text-[10px] rounded px-1 py-0.5 mb-0.5 truncate font-medium">
                      {rule.agent_name?.split(" ")[0] || "—"}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Dialog Regra de Plantão */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Plantão"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitRule} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Técnico *</Label>
              <Select value={ruleForm.agent_id} onValueChange={v => setRuleForm(p => ({ ...p, agent_id: v }))} required>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dia do Plantão *</Label>
                <Select value={ruleForm.day_type} onValueChange={v => setRuleForm(p => ({ ...p, day_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAY_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ocorrência *</Label>
                <Select value={String(ruleForm.recurrence_week)} onValueChange={v => setRuleForm(p => ({ ...p, recurrence_week: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECURRENCES.map(r => <SelectItem key={r.value} value={String(r.value)}>{r.label} do mês</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horário Entrada</Label>
                <Input type="time" value={ruleForm.start_time} onChange={e => setRuleForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Horário Saída</Label>
                <Input type="time" value={ruleForm.end_time} onChange={e => setRuleForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={ruleForm.notes} onChange={e => setRuleForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={!ruleForm.agent_id || createRuleM.isPending || updateRuleM.isPending}>
                {(createRuleM.isPending || updateRuleM.isPending) ? "Salvando..." : editingRule ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
