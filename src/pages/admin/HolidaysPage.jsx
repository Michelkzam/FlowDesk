import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const defaultForm = { name: "", date: "", recurring: false, notes: "" };

export default function HolidaysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["holidays"], queryFn: () => db.entities.Holiday.list("-date") });
  const createM = useMutation({ mutationFn: d => db.entities.Holiday.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["holidays"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.Holiday.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["holidays"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.Holiday.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidays"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "name", label: "Feriado" },
    { key: "date", label: "Data", render: v => v ? format(new Date(v + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—" },
    { key: "recurring", label: "Anual", render: v => <span className="text-xs">{v ? "✓ Sim" : "Não"}</span> },
    { key: "notes", label: "Notas" },
  ];
  const fields = [
    { key: "name", label: "Nome do Feriado", required: true },
    { key: "date", label: "Data", type: "date", required: true },
    { key: "recurring", label: "Recorrente", type: "checkbox", checkLabel: "Repete todos os anos nessa data" },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Feriados" subtitle="Exceções ao horário de funcionamento" action={openCreate} actionLabel="Novo Feriado" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Feriado" : "Novo Feriado"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}