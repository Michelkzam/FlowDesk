import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";

const defaultForm = { name: "", type: "public", department_id: "", priority: "normal", status: "active", disable_auto_response: false, notes: "" };

export default function HelpTopicsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["help-topics"], queryFn: () => db.entities.HelpTopic.list() });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });
  const { data: slas = [] } = useQuery({ queryKey: ["sla-plans"], queryFn: () => db.entities.SLAPlan.list() });

  const createM = useMutation({ mutationFn: d => db.entities.HelpTopic.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["help-topics"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.HelpTopic.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["help-topics"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.HelpTopic.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["help-topics"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "name", label: "Tópico" },
    { key: "parent_name", label: "Tópico Pai" },
    { key: "department_name", label: "Departamento" },
    { key: "priority", label: "Prioridade", render: v => <PriorityBadge value={v} /> },
    { key: "type", label: "Tipo", render: v => <span className="text-xs capitalize">{v === "public" ? "Público" : "Privado"}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  const parentTopics = items.filter(i => !editing || i.id !== editing.id);
  const fields = [
    { key: "name", label: "Nome do Tópico", required: true },
    { key: "parent_id", label: "Tópico Pai (opcional)", type: "select", options: [{ value: "", label: "Nenhum" }, ...parentTopics.map(t => ({ value: t.id, label: t.name }))] },
    { key: "type", label: "Tipo", type: "select", options: [{ value: "public", label: "Público" }, { value: "private", label: "Privado (somente agentes)" }] },
    { key: "department_id", label: "Departamento", type: "select", options: departments.map(d => ({ value: d.id, label: d.name })) },
    { key: "priority", label: "Prioridade Padrão", type: "select", options: [{ value: "low", label: "Baixa" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }, { value: "emergency", label: "Emergência" }] },
    { key: "sla_id", label: "Plano de SLA", type: "select", options: [{ value: "", label: "Padrão do departamento" }, ...slas.map(s => ({ value: s.id, label: s.name }))] },
    { key: "auto_assign_agent_id", label: "Atribuição Automática - Agente", type: "select", options: [{ value: "", label: "Nenhum" }, ...agents.map(a => ({ value: a.id, label: a.name }))] },
    { key: "disable_auto_response", label: "Desativar resposta automática", type: "checkbox" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Tópicos de Ajuda" subtitle="Configure o roteamento dos tickets" action={openCreate} actionLabel="Novo Tópico" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name", "department_name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Tópico" : "Novo Tópico de Ajuda"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}