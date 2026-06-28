import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AgentStats from "@/components/agents/AgentStats";
import { BarChart2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { name: "", email: "", phone: "", department_name: "", role_name: "", status: "active", admin: false, perfil: "tecnico" };

export default function AgentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [statsAgent, setStatsAgent] = useState(null);
  const [passwordAgent, setPasswordAgent] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => db.entities.Agent.list("-created_date", 200),
  });
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list() });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: () => db.entities.Role.list() });

  const createMutation = useMutation({
    mutationFn: d => db.entities.Agent.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agents"] }); close(); toast({ title: "Sucesso", description: "Técnico criado com sucesso!" }); },
    onError: (e) => { console.error('Erro ao criar técnico:', e); toast({ title: "Erro", description: "Erro ao criar técnico: " + (e.message || "Tente novamente."), variant: "destructive" }); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const payload = {
        full_name: data.name || data.full_name,
        phone: data.phone || null,
        department: data.department_name || data.department || null,
        role: data.admin ? "admin" : "agent",
        status: data.status || "active",
      };
      return db.entities.Agent.update(id, payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agents"] }); close(); toast({ title: "Sucesso", description: "Técnico atualizado com sucesso!" }); },
    onError: (e) => { console.error('Erro ao atualizar técnico:', e); toast({ title: "Erro", description: "Erro ao atualizar técnico: " + (e.message || "Tente novamente."), variant: "destructive" }); }
  });
  const deleteMutation = useMutation({
    mutationFn: id => db.entities.Agent.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agents"] }); toast({ title: "Sucesso", description: "Técnico excluído com sucesso!" }); },
    onError: (e) => { console.error('Erro ao excluir técnico:', e); toast({ title: "Erro", description: "Erro ao excluir técnico: " + (e.message || "Tente novamente."), variant: "destructive" }); }
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    const { data: existing } = await supabase.from('users').select('id').eq('email', form.email).maybeSingle();
    if (editing) {
      if (existing && existing.id !== editing.id) {
        toast({ title: "Email já cadastrado", description: "Já existe outro usuário com este email.", variant: "destructive" });
        return;
      }
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      if (existing) {
        toast({ title: "Email já cadastrado", description: "Já existe um usuário com este email.", variant: "destructive" });
        return;
      }
      createMutation.mutate(form);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Senha inválida", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "As senhas digitadas não são iguais.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc('admin_update_user_password', {
        target_user_id: passwordAgent.id,
        new_password: newPassword,
      });
      if (error) throw error;
      toast({ title: "Senha alterada", description: `Senha de ${passwordAgent.name} alterada com sucesso!` });
      setPasswordAgent(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({ title: "Erro ao alterar senha", description: err.message || "Tente novamente.", variant: "destructive" });
    }
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
      <PageHeader title="Técnicos" subtitle="Gerencie os técnicos de suporte" action={openCreate} actionLabel="Novo Técnico" canCreate={can("users.manage")} />
      <DataTable
        columns={columns}
        data={agents}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={item => deleteMutation.mutate(item.id)}
        searchKeys={["name", "email", "department_name"]}
        emptyMessage="Nenhum técnico cadastrado"
        canEdit={can("users.manage")}
        canDelete={can("users.manage")}
        extraActions={(row) => (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver estatísticas"
              onClick={e => { e.stopPropagation(); setStatsAgent(row); }}>
              <BarChart2 className="w-4 h-4 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Alterar senha"
              onClick={e => { e.stopPropagation(); setPasswordAgent(row); setNewPassword(""); setConfirmPassword(""); }}>
              <Key className="w-4 h-4 text-muted-foreground" />
            </Button>
          </>
        )}
      />
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

      {/* Password Modal */}
      <Dialog open={!!passwordAgent} onOpenChange={() => setPasswordAgent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha — {passwordAgent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nova Senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" minLength={6} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasswordAgent(null)}>Cancelar</Button>
            <Button onClick={handlePasswordChange}>Alterar Senha</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}