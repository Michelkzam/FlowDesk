import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";

const defaultForm = { name: "", signature: "", type: "public", status: "active", auto_response_new_ticket: false, auto_response_new_message: false, alert_recipients: "all_members", notes: "" };

export default function DepartmentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list("-created_date") });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });

  const createM = useMutation({ mutationFn: d => db.entities.Department.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.Department.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.Department.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "name", label: "Departamento" },
    { key: "manager_name", label: "Gerente" },
    { key: "type", label: "Tipo", render: v => <span className="text-xs capitalize">{v}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  const fields = [
    { key: "name", label: "Nome", required: true },
    { key: "manager_id", label: "Gerente", type: "select", options: agents.map(a => ({ value: a.id, label: a.name })) },
    { key: "type", label: "Tipo", type: "select", options: [{ value: "public", label: "Público" }, { value: "private", label: "Privado" }] },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
    { key: "alert_recipients", label: "Destinatários de Alertas", type: "select", options: [
      { value: "all_members", label: "Todos os membros" },
      { value: "primary_only", label: "Apenas membros principais" },
      { value: "admin_email", label: "Somente email admin" },
      { value: "none", label: "Ninguém (desativar)" },
    ]},
    { key: "auto_response_new_ticket", label: "Desativar resposta automática (novo ticket)", type: "checkbox" },
    { key: "auto_response_new_message", label: "Desativar resposta automática (nova mensagem)", type: "checkbox" },
    { key: "signature", label: "Assinatura", type: "textarea", placeholder: "Assinatura de email do departamento..." },
    { key: "notes", label: "Notas internas", type: "textarea" },
  ];

  return (
    <div>
      <PageHeader title="Departamentos" subtitle="Gerenciar departamentos de atendimento" action={openCreate} actionLabel="Novo Departamento" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name", "manager_name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Departamento" : "Novo Departamento"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}