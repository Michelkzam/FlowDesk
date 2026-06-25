import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  const { data: items = [], isLoading } = useQuery({ queryKey: ["sla-plans"], queryFn: () => db.entities.SLAPlan.list() });
  const { data: schedules = [] } = useQuery({ queryKey: ["schedules"], queryFn: () => db.entities.Schedule.list() });

  const createM = useMutation({ mutationFn: d => db.entities.SLAPlan.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla-plans"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.SLAPlan.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla-plans"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.SLAPlan.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sla-plans"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

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