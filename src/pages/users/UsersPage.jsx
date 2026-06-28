import { db } from '@/api/flowdeskClient';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Shield, Eye, EyeOff, Mail, Settings, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/lib/supabase";

const ROLE_BADGES = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  agent: "bg-blue-100 text-blue-700 border-blue-200",
  user: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const ROLE_LABELS = { admin: "Administrador", agent: "Técnico", user: "Usuário" };

const ALL_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
  "kb.create", "kb.edit", "kb.delete", "kb.publish",
  "users.manage", "reports.view", "admin.access",
];
const PERMISSION_GROUPS = {
  "Tickets": ["tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer"],
  "Base de Conhecimento": ["kb.create", "kb.edit", "kb.delete", "kb.publish"],
  "Sistema": ["users.manage", "reports.view", "admin.access"],
};

const defaultInviteForm = { email: "", phone: "+55 ", full_name: "", role: "user", role_id: "", client_id: "", organization_id: "", department: "" };

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [inviteForm, setInviteForm] = useState(defaultInviteForm);
  const [editForm, setEditForm] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissions: [] });
  const [filterRole, setFilterRole] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: usersData } = await supabase.from('users').select('*');
      const { data: clientsData } = await supabase.from('clients').select('id, name');
      const { data: orgsData } = await supabase.from('organizations').select('id, name');
      const { data: rolesData } = await supabase.from('roles').select('id, name');
      const { data: deptsData } = await supabase.from('departments').select('id, name');
      const clientMap = Object.fromEntries((clientsData || []).map(c => [c.id, c.name]));
      const orgMap = Object.fromEntries((orgsData || []).map(o => [o.id, o.name]));
      const roleMap = Object.fromEntries((rolesData || []).map(r => [r.id, r.name]));
      const deptMap = Object.fromEntries((deptsData || []).map(d => [d.id, d.name]));
      return (usersData || []).map(u => ({
        ...u,
        client_name: u.client_id ? clientMap[u.client_id] || "" : "",
        organization_name: u.organization_id ? orgMap[u.organization_id] || "" : "",
        role_name: u.role_id ? roleMap[u.role_id] || "" : "",
        department_name: u.department_id ? deptMap[u.department_id] || (u.department || "") : (u.department || ""),
      }));
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => db.entities.Client.list() });
  const { data: organizations = [] } = useQuery({ queryKey: ["organizations"], queryFn: () => db.entities.Organization.list() });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: async () => {
    try { return await db.entities.Role.list(); } catch { return []; }
  }});
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: async () => {
    try { return await db.entities.Department.list(); } catch { return []; }
  }});

  const filteredUsers = filterRole === "all" ? allUsers : allUsers.filter(u => u.role === filterRole);
  const stats = { total: allUsers.length, admin: allUsers.filter(u => u.role === "admin").length, agent: allUsers.filter(u => u.role === "agent").length, user: allUsers.filter(u => u.role === "user").length };

  const createM = useMutation({
    mutationFn: async d => {
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      const { data, error } = await supabase.auth.signUp({
        email: d.email,
        password: tempPassword,
        options: { data: { full_name: d.full_name, role: d.role } }
      });
      if (error) throw error;
      const userId = data.user?.id || crypto.randomUUID();
      await supabase.from('users').upsert({
        id: userId, email: d.email, password_hash: 'supabase_auth',
        full_name: d.full_name, role: d.role, role_id: d.role_id || null,
        phone: d.phone || null, department: d.department || null,
        department_id: d.department_id || null,
        client_id: d.client_id || null, organization_id: d.organization_id || null,
        perfil: d.role === 'admin' ? 'administrador' : d.role === 'agent' ? 'tecnico' : 'usuario',
        status: 'active'
      });
      try {
        await supabase.auth.resetPasswordForEmail(d.email, { redirectTo: `${window.location.origin}/reset-password` });
      } catch (_) {}
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-users"] }); setInviteOpen(false); setInviteForm(defaultInviteForm); toast({ title: "Sucesso", description: "Usuário criado! Email de redefinição de senha enviado." }); },
    onError: (e) => { toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" }); }
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) => {
      const clean = { ...data };
      ['role_id', 'client_id', 'organization_id', 'department_id'].forEach(k => {
        if (!clean[k] || clean[k] === '') delete clean[k];
      });
      return db.entities.User.update(id, clean);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-users"] }); setEditOpen(false); toast({ title: "Sucesso", description: "Usuário atualizado!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" }); }
  });

  const deleteM = useMutation({
    mutationFn: async (id) => {
      await db.entities.User.delete(id);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        await fetch(`${API_URL}/api/auth/delete-user`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ target_user_id: id })
        });
      } catch (_) {}
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-users"] }); toast({ title: "Sucesso", description: "Usuário excluído!" }); },
  });

  const roleCreateM = useMutation({
    mutationFn: d => db.entities.Role.create({ ...d, permissions: JSON.stringify(d.permissions) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); closeRoleDialog(); toast({ title: "Sucesso", description: "Perfil criado!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  });
  const roleUpdateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.Role.update(id, { ...data, permissions: JSON.stringify(data.permissions) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); closeRoleDialog(); toast({ title: "Sucesso", description: "Perfil atualizado!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  });
  const roleDeleteM = useMutation({
    mutationFn: id => db.entities.Role.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); toast({ title: "Sucesso", description: "Perfil excluído!" }); },
  });

  const closeRoleDialog = () => { setRolesOpen(false); setEditingRole(null); setRoleForm({ name: "", description: "", permissions: [] }); };
  const openRoleEdit = (r) => { setEditingRole(r); setRoleForm({ name: r.name, description: r.description || "", permissions: r.permissions || [] }); setRolesOpen(true); };
  const openRoleCreate = () => { setEditingRole(null); setRoleForm({ name: "", description: "", permissions: [] }); setRolesOpen(true); };
  const toggleRolePerm = (p) => setRoleForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p] }));
  const toggleRoleGroup = (perms) => setRoleForm(f => {
    const allSelected = perms.every(p => f.permissions.includes(p));
    return { ...f, permissions: allSelected ? f.permissions.filter(p => !perms.includes(p)) : [...new Set([...f.permissions, ...perms])] };
  });
  const handleRoleSubmit = (e) => { e.preventDefault(); editingRole ? roleUpdateM.mutate({ id: editingRole.id, data: roleForm }) : roleCreateM.mutate(roleForm); };

  const openEdit = (user) => {
    setEditing(user);
    setEditForm({ role: user.role || "user", role_id: user.role_id || "", phone: user.phone || "", client_id: user.client_id || "", organization_id: user.organization_id || "", department: user.department || "", department_id: user.department_id || "" });
    setNewPassword(""); setConfirmPassword(""); setShowPassword(false); setEditOpen(true);
  };

  const handleSave = async () => {
    await updateM.mutateAsync({ id: editing.id, data: editForm });
    if (newPassword) {
      if (newPassword.length < 6) { toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" }); return; }
      if (newPassword !== confirmPassword) { toast({ title: "Senhas não coincidem", variant: "destructive" }); return; }
      try {
        await supabase.auth.resetPasswordForEmail(editing.email, { redirectTo: `${window.location.origin}/reset-password` });
        toast({ title: "Email de redefinição enviado!", description: `Para ${editing.email}. O usuário deve definir a nova senha pelo link.` });
      } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    }
  };

  const columns = [
    { key: "full_name", label: "Nome", render: (v, row) => (
      <div><p className="font-medium text-sm">{v || "—"}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
    )},
    { key: "role", label: "Tipo", render: v => <Badge variant="outline" className={`text-xs ${ROLE_BADGES[v] || ""}`}>{ROLE_LABELS[v] || v}</Badge> },
    { key: "role_name", label: "Função/Perfil", render: v => v ? <Badge variant="outline" className="text-xs">{v}</Badge> : <span className="text-xs text-muted-foreground">—</span> },
    { key: "department_name", label: "Departamento", render: v => v || <span className="text-xs text-muted-foreground">—</span> },
    { key: "organization_name", label: "Organização", render: v => v ? <span className="text-xs">{v}</span> : <span className="text-xs text-muted-foreground">—</span> },
    { key: "client_name", label: "Cliente", render: v => v ? <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{v}</Badge> : <span className="text-xs text-muted-foreground">—</span> },
    { key: "status", label: "Status", render: v => <Badge variant="outline" className={`text-xs ${v === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{v === 'active' ? 'Ativo' : 'Inativo'}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gerencie todos os usuários do sistema" action={() => setInviteOpen(true)} actionLabel="Novo Usuário" actionIcon={UserPlus} canCreate={can("users.manage")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button onClick={() => setFilterRole("all")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p>
        </button>
        <button onClick={() => setFilterRole("admin")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "admin" ? "border-purple-400 bg-purple-50" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Admins</p><p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
        </button>
        <button onClick={() => setFilterRole("agent")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "agent" ? "border-blue-400 bg-blue-50" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Técnicos</p><p className="text-2xl font-bold text-blue-600">{stats.agent}</p>
        </button>
        <button onClick={() => setFilterRole("user")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "user" ? "border-emerald-400 bg-emerald-50" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Usuários</p><p className="text-2xl font-bold text-emerald-600">{stats.user}</p>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={() => setRolesOpen(true)} className="gap-2">
          <Settings className="w-4 h-4" /> Gerenciar Perfis
        </Button>
      </div>

      <DataTable columns={columns} data={filteredUsers} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["full_name", "email", "department_name", "organization_name", "client_name"]} emptyMessage="Nenhum usuário encontrado" canEdit={can("users.manage")} canDelete={can("users.manage")} />

      {/* Create/Edit User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Novo Usuário</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createM.mutate(inviteForm); }} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nome completo *</Label><Input required value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nome completo" /></div>
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" required value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={inviteForm.phone} onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value }))} placeholder="+55 (00) 00000-0000" /></div>
              <div className="space-y-1.5"><Label>Tipo de Usuário *</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="agent">Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Função/Perfil</Label>
                <Select value={inviteForm.role_id || "none"} onValueChange={v => setInviteForm(p => ({ ...p, role_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Departamento</Label>
                <Select value={inviteForm.department_id || "none"} onValueChange={v => setInviteForm(p => ({ ...p, department_id: v === "none" ? "" : v, department: departments.find(d => d.id === v)?.name || "" }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Organização</Label>
                <Select value={inviteForm.organization_id || "none"} onValueChange={v => setInviteForm(p => ({ ...p, organization_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Cliente Vinculado</Label>
                <Select value={inviteForm.client_id || "none"} onValueChange={v => setInviteForm(p => ({ ...p, client_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-sm text-blue-800">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Um convite será enviado por email. O usuário define sua própria senha ao aceitar.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createM.isPending}>{createM.isPending ? "Criando..." : "Criar Usuário"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Editar — {editing?.full_name || editing?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tipo de Usuário</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="agent">Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Função/Perfil</Label>
                <Select value={editForm.role_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, role_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="+55 (00) 00000-0000" /></div>
              <div className="space-y-1.5"><Label>Departamento</Label>
                <Select value={editForm.department_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, department_id: v === "none" ? "" : v, department: departments.find(d => d.id === v)?.name || "" }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Organização</Label>
                <Select value={editForm.organization_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, organization_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Cliente</Label>
                <Select value={editForm.client_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, client_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-semibold">Alterar Senha</Label>
              <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Nova Senha</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Confirmar</Label><Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" minLength={6} /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateM.isPending}>{updateM.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles Management Dialog */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Gerenciar Perfis de Acesso</DialogTitle></DialogHeader>
          <Tabs defaultValue="list">
            <TabsList className="mb-4">
              <TabsTrigger value="list">Perfis</TabsTrigger>
              <TabsTrigger value="form">{editingRole ? "Editar" : "Novo"}</TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="space-y-2">
              {roles.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum perfil criado</p> : roles.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50">
                  <div><p className="font-medium text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.description || "Sem descrição"} — {(r.permissions || []).length} permissões</p></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openRoleEdit(r)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => roleDeleteM.mutate(r.id)}>Excluir</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={openRoleCreate} className="w-full mt-2">+ Novo Perfil</Button>
            </TabsContent>
            <TabsContent value="form">
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div className="space-y-1.5"><Label>Nome *</Label><Input required value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Técnico Nível 1" /></div>
                <div className="space-y-1.5"><Label>Descrição</Label><Input value={roleForm.description} onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do perfil" /></div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Permissões ({roleForm.permissions.length}/{ALL_PERMISSIONS.length})</Label>
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                    <div key={group} className="space-y-1">
                      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground uppercase">{group}</span>
                        <button type="button" onClick={() => toggleRoleGroup(perms)} className="text-xs text-primary hover:underline">{perms.every(p => roleForm.permissions.includes(p)) ? "Desmarcar" : "Marcar todas"}</button>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pl-2">
                        {perms.map(p => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer text-xs py-0.5" onClick={() => toggleRolePerm(p)}>
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${roleForm.permissions.includes(p) ? "bg-primary border-primary text-white" : "border-border bg-background"}`}>
                              {roleForm.permissions.includes(p) && <Check className="w-3 h-3" />}
                            </span>{p}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeRoleDialog}>Cancelar</Button>
                  <Button type="submit" disabled={roleCreateM.isPending || roleUpdateM.isPending}>{editingRole ? "Atualizar" : "Criar"}</Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
