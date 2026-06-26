import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AgentStats from "@/components/agents/AgentStats";
import { BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const defaultForm = { name: "", email: "", phone: "", department_name: "", role_name: "", status: "active", admin: false, perfil: "tecnico" };

export default function AgentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [statsAgent, setStatsAgent] = useState(null);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => db.entities.Agent.list("-created_date", 200),
  });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list() });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: () => db.entities.Role.list() });

  const createMutation = useMutation({
    mutationFn: d => db.entities.Agent.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agents"] }); close(); },
    onError: (e) => { console.error('Erro ao criar técnico:', e); alert('Erro: ' + e.message); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Agent.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agents"] }); close(); },
    onError: (e) => { console.error('Erro ao atualizar técnico:', e); alert('Erro: ' + e.message); }
  });
  const deleteMutation = useMutation({
    mutationFn: id => db.entities.Agent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
    onError: (e) => { console.error('Erro ao excluir técnico:', e); alert('Erro: ' + e.message); }
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = e => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const columns = [
    { key: "name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "perfil", label: "Perfil", render: v => {
      const cfg = { tecnico: "bg-blue-100 text-blue-700 border-blue-200", analista: "bg-purple-100 text-purple-700 border-purple-200", administrador: "bg-red-100 text-red-700 border-red-200" };
      const label = { tecnico: "Técnico", analista: "Analista", administrador: "Administrador" };
      return <Badge variant="outline" className={`text-xs font-medium ${cfg[v] || "bg-muted text-muted-foreground border-border"}`}>{label[v] || v || "—"}</Badge>;
    }},
    { key: "department_name", label: "Departamento" },
    { key: "role_name", label: "Função" },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
    {
      key: "_stats", label: "Stats", render: (_, row) => (
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver estatísticas"
          onClick={e => { e.stopPropagation(); setStatsAgent(row); }}>
          <BarChart2 className="w-4 h-4 text-primary" />
        </Button>
      )
    },
  ];

  const fields = [
    { key: "name", label: "Nome", required: true, placeholder: "Nome completo" },
    { key: "email", label: "Email", type: "email", required: true, placeholder: "agente@empresa.com" },
    { key: "phone", label: "Telefone", placeholder: "(00) 00000-0000" },
    { key: "perfil", label: "Perfil", type: "select", options: [{ value: "tecnico", label: "Técnico" }, { value: "analista", label: "Analista" }, { value: "administrador", label: "Administrador" }] },
    { key: "department_id", label: "Departamento", type: "select", options: departments.map(d => ({ value: d.id, label: d.name })) },
    { key: "role_id", label: "Função", type: "select", options: roles.map(r => ({ value: r.id, label: r.name })) },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Ativo" }, { value: "inactive", label: "Inativo" }] },
    { key: "admin", label: "Administrador", type: "checkbox", checkLabel: "Este agente é administrador" },
  ];

  return (
    <div>
      <PageHeader title="Técnicos" subtitle="Gerencie os técnicos de suporte" action={openCreate} actionLabel="Novo Técnico" />
      <DataTable columns={columns} data={agents} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteMutation.mutate(item.id)} searchKeys={["name", "email", "department_name"]} emptyMessage="Nenhum técnico cadastrado" />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Técnico" : "Novo Técnico"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending} />

      {/* Stats Modal */}
      <Dialog open={!!statsAgent} onOpenChange={() => setStatsAgent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estatísticas — {statsAgent?.name}</DialogTitle>
          </DialogHeader>
          {statsAgent && <AgentStats agentId={statsAgent.id} agentName={statsAgent.name} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}