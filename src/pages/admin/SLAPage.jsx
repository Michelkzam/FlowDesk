import { supabase } from '@/lib/supabase';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";

const defaultForm = {
  name: "",
  description: "",
  emergency_hours: 2,
  high_hours: 8,
  normal_hours: 24,
  low_hours: 48,
  grace_period: 0,
  is_default: false,
  status: "active",
  notes: "",
};

export default function SLAPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sla-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from('sla_plans').select('*').order('name');
      if (error) { console.error('[SLA] Erro query:', error); return []; }
      return data || [];
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from('schedules').select('*').order('name');
      if (error) return [];
      return data || [];
    },
  });

  const createM = useMutation({
    mutationFn: async (d) => {
      if (d.is_default) await supabase.from('sla_plans').update({ is_default: false }).eq('is_default', true);
      const { data, error } = await supabase.from('sla_plans').insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla-plans"] }); setDialogOpen(false); setEditing(null); setForm(defaultForm); toast({ title: "Sucesso", description: "Plano de SLA criado com sucesso!" }); },
    onError: (e) => { console.error('[SLA] Erro criar:', e); toast({ title: "Erro", description: "Erro ao criar plano: " + (e.message || "Verifique os dados."), variant: "destructive" }); },
  });

  const updateM = useMutation({
    mutationFn: async ({ id, data }) => {
      if (data.is_default) await supabase.from('sla_plans').update({ is_default: false }).eq('is_default', true).neq('id', id);
      const { error } = await supabase.from('sla_plans').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla-plans"] }); setDialogOpen(false); setEditing(null); setForm(defaultForm); toast({ title: "Sucesso", description: "Plano de SLA atualizado com sucesso!" }); },
    onError: (e) => { console.error('[SLA] Erro atualizar:', e); toast({ title: "Erro", description: "Erro ao atualizar plano: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });

  const deleteM = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('sla_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla-plans"] }); toast({ title: "Sucesso", description: "Plano excluído com sucesso!" }); },
    onError: (e) => { console.error('[SLA] Erro excluir:', e); toast({ title: "Erro", description: "Erro ao excluir plano: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });

  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item); setDialogOpen(true); };
  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "Campo obrigatório", description: "Preencha o nome do plano.", variant: "destructive" });
      return;
    }
    if (editing) updateM.mutate({ id: editing.id, data: form });
    else createM.mutate(form);
  };

  const columns = [
    { key: "name", label: "Plano de SLA" },
    { key: "emergency_hours", label: "Crítica", render: v => <span className="text-xs">{v || 2}h</span> },
    { key: "high_hours", label: "Alta", render: v => <span className="text-xs">{v || 8}h</span> },
    { key: "normal_hours", label: "Média", render: v => <span className="text-xs">{v || 24}h</span> },
    { key: "low_hours", label: "Baixa", render: v => <span className="text-xs">{v || 48}h</span> },
    { key: "is_default", label: "Padrão", render: v => <span className="text-xs">{v ? "Sim" : "Não"}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  const fields = [
    { key: "name", label: "Nome do Plano", required: true },
    { key: "description", label: "Descrição", type: "textarea" },
    { key: "is_default", label: "Plano Padrão", type: "checkbox", checkLabel: "Usar este plano como padrão para todos os tickets" },
    { key: "emergency_hours", label: "Prazo Crítica (horas)", type: "number", required: true, hint: "Sistema fora do ar" },
    { key: "high_hours", label: "Prazo Alta (horas)", type: "number", required: true, hint: "Trabalho muito impactado" },
    { key: "normal_hours", label: "Prazo Média (horas)", type: "number", required: true, hint: "Problemas pontuais/Dúvidas" },
    { key: "low_hours", label: "Prazo Baixa (horas)", type: "number", required: true, hint: "Solicitações de rotina/Melhorias" },
    { key: "grace_period", label: "Período de Tolerância (horas)", type: "number", hint: "Tempo extra antes de marcar como atrasado" },
    { key: "schedule_id", label: "Cronograma", type: "select", options: [{ value: "", label: "Sem cronograma" }, ...schedules.map(s => ({ value: s.id, label: s.name }))] },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Planos de SLA" subtitle="Acordos de nível de serviço" action={openCreate} actionLabel="Novo Plano" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Plano de SLA" : "Novo Plano de SLA"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}
