import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

const ALL_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
  "kb.create", "kb.edit", "kb.delete", "kb.publish",
  "users.manage", "reports.view", "admin.access",
];

const defaultForm = { name: "", status: "active", notes: "" };

export default function RolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => db.entities.Role.list() });
  const createM = useMutation({
    mutationFn: d => db.entities.Role.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); close(); },
    onError: (e) => { console.error('Erro ao criar função:', e); alert('Erro: ' + e.message); }
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.Role.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); close(); },
    onError: (e) => { console.error('Erro ao atualizar função:', e); alert('Erro: ' + e.message); }
  });
  const deleteM = useMutation({
    mutationFn: id => db.entities.Role.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    onError: (e) => { console.error('Erro ao excluir função:', e); alert('Erro: ' + e.message); }
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); setSelectedPerms([]); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setSelectedPerms([]); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setSelectedPerms(item.permissions || []); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const togglePerm = (p) => setSelectedPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSubmit = e => {
    e.preventDefault();
    const data = { ...form, permissions: selectedPerms };
    editing ? updateM.mutate({ id: editing.id, data }) : createM.mutate(data);
  };

  const columns = [
    { key: "name", label: "Função" },
    { key: "permissions", label: "Permissões", render: v => <span className="text-xs text-muted-foreground">{(v || []).length} permissões</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  return (
    <div>
      <PageHeader title="Funções" subtitle="Perfis de permissão para agentes" action={openCreate} actionLabel="Nova Função" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">{editing ? "Editar Função" : "Nova Função"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome *</label>
                  <input required value={form.name} onChange={e => set("name", e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm h-9 focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Permissões</label>
                  <div className="grid grid-cols-2 gap-1.5 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                    {ALL_PERMISSIONS.map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input type="checkbox" checked={selectedPerms.includes(p)} onChange={() => togglePerm(p)} className="w-3.5 h-3.5 rounded" />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={close} className="px-4 py-2 text-sm border border-input rounded-md hover:bg-muted">Cancelar</button>
                  <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}