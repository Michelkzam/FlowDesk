import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";

const defaultForm = { title: "", content: "", department_id: "", status: "active" };

export default function CannedResponsesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["canned-responses"], queryFn: () => db.entities.CannedResponse.list() });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list() });

  const createM = useMutation({ mutationFn: d => db.entities.CannedResponse.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["canned-responses"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.CannedResponse.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["canned-responses"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.CannedResponse.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canned-responses"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "title", label: "Título" },
    { key: "content", label: "Conteúdo", render: v => <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{v}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];
  const fields = [
    { key: "title", label: "Título", required: true, placeholder: "Ex: Saudação inicial" },
    { key: "department_id", label: "Departamento (opcional)", type: "select", options: [{ value: "", label: "Todos os departamentos" }, ...departments.map(d => ({ value: d.id, label: d.name }))] },
    { key: "content", label: "Conteúdo", type: "textarea", required: true, placeholder: "Texto da resposta predefinida..." },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
  ];

  return (
    <div>
      <PageHeader title="Respostas Predefinidas" subtitle="Textos prontos para agilizar o atendimento" action={openCreate} actionLabel="Nova Resposta" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["title", "content"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Resposta" : "Nova Resposta Predefinida"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}