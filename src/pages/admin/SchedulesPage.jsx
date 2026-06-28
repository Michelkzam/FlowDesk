import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";

const defaultForm = { name: "", timezone: "", status: "active", notes: "" };

export default function SchedulesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["schedules"], queryFn: () => db.entities.Schedule.list() });
  const createM = useMutation({ mutationFn: d => db.entities.Schedule.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.Schedule.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.Schedule.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  const columns = [
    { key: "name", label: "Cronograma" },
    { key: "timezone", label: "Fuso Horário" },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];
  const fields = [
    { key: "name", label: "Nome do Cronograma", required: true },
    { key: "timezone", label: "Fuso Horário", placeholder: "Ex: America/Sao_Paulo (deixe em branco para usar padrão)" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Cronogramas" subtitle="Horários de funcionamento do helpdesk" action={openCreate} actionLabel="Novo Cronograma" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Cronograma" : "Novo Cronograma"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}