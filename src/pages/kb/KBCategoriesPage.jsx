import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";

const defaultForm = { name: "", description: "", visibility: "public", status: "active" };

export default function KBCategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["kb-categories"], queryFn: () => db.entities.KBCategory.list() });
  const createM = useMutation({ mutationFn: d => db.entities.KBCategory.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["kb-categories"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.KBCategory.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["kb-categories"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.KBCategory.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kb-categories"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "name", label: "Categoria" },
    { key: "description", label: "Descrição" },
    { key: "visibility", label: "Visibilidade", render: v => <span className="text-xs capitalize">{v === "public" ? "Pública" : "Privada"}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];
  const fields = [
    { key: "name", label: "Nome", required: true },
    { key: "description", label: "Descrição", type: "textarea" },
    { key: "visibility", label: "Visibilidade", type: "select", options: [{ value: "public", label: "Pública" }, { value: "private", label: "Privada" }] },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativa" }, { value: "inactive", label: "Inativa" }] },
  ];

  return (
    <div>
      <PageHeader title="Categorias da Base de Conhecimento" subtitle="Organize os artigos por categorias" action={openCreate} actionLabel="Nova Categoria" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Categoria" : "Nova Categoria"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}