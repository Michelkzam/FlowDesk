import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";

const defaultForm = { name: "", leader_name: "", status: "active", assignment_alert: true, notes: "" };

export default function TeamsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["teams"], queryFn: () => db.entities.Team.list("-created_date") });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });

  const createM = useMutation({ mutationFn: d => db.entities.Team.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teams"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.Team.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teams"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.Team.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "name", label: "Equipe" },
    { key: "leader_name", label: "Líder" },
    { key: "assignment_alert", label: "Alerta de Atribuição", render: v => <span className="text-xs">{v ? "Ativado" : "Desativado"}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  const fields = [
    { key: "name", label: "Nome da Equipe", required: true },
    { key: "leader_id", label: "Líder da Equipe", type: "select", options: agents.map(a => ({ value: a.id, label: a.name })) },
    { key: "assignment_alert", label: "Alerta de atribuição", type: "checkbox", checkLabel: "Enviar alerta quando ticket for atribuído à equipe" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div>
      <PageHeader title="Equipes" subtitle="Grupos de agentes para atendimento" action={openCreate} actionLabel="Nova Equipe" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name", "leader_name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Equipe" : "Nova Equipe"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}