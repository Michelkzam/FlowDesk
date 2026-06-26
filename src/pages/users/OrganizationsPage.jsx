import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePermissions } from "@/hooks/usePermissions";

const defaultForm = { name: "", website: "", phone: "", address: "", account_manager_name: "", status: "active", notes: "" };

export default function OrganizationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["organizations"], queryFn: () => db.entities.Organization.list("-created_date") });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });

  const createM = useMutation({ mutationFn: d => db.entities.Organization.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organizations"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.Organization.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organizations"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.Organization.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => { e.preventDefault(); editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); };

  const columns = [
    { key: "name", label: "Organização" },
    { key: "website", label: "Site" },
    { key: "phone", label: "Telefone" },
    { key: "account_manager_name", label: "Gerente de Contas" },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  const fields = [
    { key: "name", label: "Nome da Organização", required: true },
    { key: "website", label: "Site", placeholder: "https://" },
    { key: "phone", label: "Telefone" },
    { key: "address", label: "Endereço", type: "textarea" },
    { key: "account_manager_id", label: "Gerente de Contas", type: "select", options: agents.map(a => ({ value: a.id, label: a.name })) },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativa" }, { value: "inactive", label: "Inativa" }] },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div>
      <PageHeader title="Organizações" subtitle="Empresas e organizações clientes" action={openCreate} actionLabel="Nova Organização" canCreate={can("users.manage")} />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name", "website", "phone"]} canEdit={can("users.manage")} canDelete={can("users.manage")} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Organização" : "Nova Organização"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}