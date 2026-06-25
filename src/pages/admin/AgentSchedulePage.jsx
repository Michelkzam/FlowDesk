import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";

const DAYS = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const DAY_PT = { monday: "Seg", tuesday: "Ter", wednesday: "Qua", thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom" };

const defaultForm = { name: "", day_of_week: "monday", start_time: "08:00", pause_time: "", return_time: "", end_time: "18:00", status: "active" };

export default function AgentSchedulePage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["business-hours"],
    queryFn: () => db.entities.BusinessHours.list("-created_date", 200),
  });

  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: () => db.entities.Team.list() });

  const createM = useMutation({ mutationFn: d => db.entities.BusinessHours.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["business-hours"] }); closeDialog(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.BusinessHours.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["business-hours"] }); closeDialog(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.BusinessHours.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business-hours"] }) });

  const closeDialog = () => { setOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setOpen(true); };
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  // Group by name (schedule name = team/group)
  const grouped = schedules.reduce((acc, s) => {
    const key = s.name || "Sem nome";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Escala de Trabalho</h1>
          <p className="text-sm text-muted-foreground">Configure os horários de turno por equipe</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Novo Turno
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border border-border">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma escala cadastrada</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-1.5"><Plus className="w-4 h-4" />Criar escala</Button>
        </Card>
      ) : (
        Object.entries(grouped).map(([name, entries]) => (
          <Card key={name} className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> {name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Dia</th>
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Início</th>
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Pausa</th>
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Retorno</th>
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Fim</th>
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.sort((a, b) => DAYS.findIndex(d => d.value === a.day_of_week) - DAYS.findIndex(d => d.value === b.day_of_week)).map(entry => (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-medium">{DAY_PT[entry.day_of_week] || entry.day_of_week}</td>
                        <td className="py-2.5 text-emerald-600 font-mono">{entry.start_time || "—"}</td>
                        <td className="py-2.5 text-amber-600 font-mono">{entry.pause_time || "—"}</td>
                        <td className="py-2.5 text-blue-600 font-mono">{entry.return_time || "—"}</td>
                        <td className="py-2.5 text-red-500 font-mono">{entry.end_time || "—"}</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {entry.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(entry)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteM.mutate(entry.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={() => { setForm({ ...defaultForm, name }); setEditing(null); setOpen(true); }}>
                <Plus className="w-3.5 h-3.5" /> Adicionar dia
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turno" : "Novo Turno"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome da Escala / Equipe</label>
              <Input placeholder="Ex: Suporte N1, Equipe A" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Dia da Semana</label>
              <Select value={form.day_of_week} onValueChange={v => set("day_of_week", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Início do turno</label>
                <Input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fim do turno</label>
                <Input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Pausa (opcional)</label>
                <Input type="time" value={form.pause_time} onChange={e => set("pause_time", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Retorno (opcional)</label>
                <Input type="time" value={form.return_time} onChange={e => set("return_time", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={createM.isPending || updateM.isPending}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}