import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

const defaultForm = { name: "", status: "active", target: "any", match_type: "all", execution_order: 1, rules: [], actions: {}, notes: "" };

export default function FiltersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["ticket-filters"], queryFn: () => db.entities.TicketFilter.list("execution_order") });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list() });

  const createM = useMutation({ mutationFn: d => db.entities.TicketFilter.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ticket-filters"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.TicketFilter.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ticket-filters"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.TicketFilter.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-filters"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm({ ...defaultForm, ...item, rules: item.rules || [], actions: item.actions || {} }); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setAction = (k, v) => setForm(p => ({ ...p, actions: { ...p.actions, [k]: v } }));

  const addRule = () => setForm(p => ({ ...p, rules: [...p.rules, { field: "email", condition: "contains", value: "" }] }));
  const removeRule = idx => setForm(p => ({ ...p, rules: p.rules.filter((_, i) => i !== idx) }));
  const updateRule = (idx, key, val) => setForm(p => ({ ...p, rules: p.rules.map((r, i) => i === idx ? { ...r, [key]: val } : r) }));

  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "execution_order", label: "Ordem", render: v => <span className="font-mono text-xs">{v}</span> },
    { key: "name", label: "Filtro" },
    { key: "target", label: "Destino", render: v => <span className="text-xs capitalize">{v}</span> },
    { key: "match_type", label: "Correspondência", render: v => <span className="text-xs">{v === "all" ? "Todas" : "Qualquer"}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Filtros de Tickets" subtitle='Regras automáticas "se ... então ..."' action={openCreate} actionLabel="Novo Filtro" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />

      <Dialog open={dialogOpen} onOpenChange={close}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Filtro" : "Novo Filtro de Ticket"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nome *</Label><Input required value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Ordem</Label><Input type="number" value={form.execution_order} onChange={e => set("execution_order", parseInt(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Destino</Label>
                <Select value={form.target} onValueChange={v => set("target", v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Qualquer</SelectItem><SelectItem value="web">Formulários Web</SelectItem><SelectItem value="email">E-mails</SelectItem><SelectItem value="api">API</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Correspondência</Label>
                <Select value={form.match_type} onValueChange={v => set("match_type", v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Todas as regras</SelectItem><SelectItem value="any">Qualquer regra</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Regras de Filtro</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRule} className="h-7 text-xs gap-1"><Plus className="w-3 h-3" />Adicionar</Button>
              </div>
              {form.rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input className="text-xs h-8" placeholder="Campo (ex: email)" value={rule.field} onChange={e => updateRule(idx, "field", e.target.value)} />
                  <Input className="text-xs h-8" placeholder="Condição" value={rule.condition} onChange={e => updateRule(idx, "condition", e.target.value)} />
                  <Input className="text-xs h-8" placeholder="Valor" value={rule.value} onChange={e => updateRule(idx, "value", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRule(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
              {form.rules.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma regra adicionada</p>}
            </div>

            {/* Actions */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <Label>Ações (quando regras forem atendidas)</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!form.actions?.reject} onChange={e => setAction("reject", e.target.checked)} className="rounded" />
                  Rejeitar ticket
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!form.actions?.disable_auto_response} onChange={e => setAction("disable_auto_response", e.target.checked)} className="rounded" />
                  Desativar resposta automática
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1"><Label className="text-xs">Definir Departamento</Label>
                  <Select value={form.actions?.set_department_id || ""} onValueChange={v => setAction("set_department_id", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Não alterar" /></SelectTrigger>
                    <SelectContent><SelectItem value={null}>Não alterar</SelectItem>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Definir Prioridade</Label>
                  <Select value={form.actions?.set_priority || ""} onValueChange={v => setAction("set_priority", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Não alterar" /></SelectTrigger>
                    <SelectContent><SelectItem value={null}>Não alterar</SelectItem><SelectItem value="low">Baixa</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="emergency">Emergência</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}