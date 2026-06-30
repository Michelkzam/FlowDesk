import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

const ROLE_BADGES = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  agent: "bg-blue-100 text-blue-700 border-blue-200",
  user: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const ROLE_LABELS = { admin: "Administrador", agent: "Técnico", user: "Usuário" };

const defaultForm = {
  full_name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  role: "user",
  role_id: "",
  client_id: "",
  department_id: "",
};

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: usersData } = await supabase.from('users').select('*');
      const { data: clientsData } = await supabase.from('clients').select('id, name');
      const { data: rolesData } = await supabase.from('roles').select('id, name');
      const { data: deptsData } = await supabase.from('departments').select('id, name');
      const clientMap = Object.fromEntries((clientsData || []).map(c => [c.id, c.name]));
      const roleMap = Object.fromEntries((rolesData || []).map(r => [r.id, r.name]));
      const deptMap = Object.fromEntries((deptsData || []).map(d => [d.id, d.name]));
      return (usersData || []).map(u => ({
        ...u,
        client_name: u.client_id ? clientMap[u.client_id] || "" : "",
        role_name: u.role_id ? roleMap[u.role_id] || "" : "",
        department_name: u.department_id ? deptMap[u.department_id] || "" : "",
      }));
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, name').order('name');
      return data || [];
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, name').eq('status', 'active').order('name');
      return data || [];
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name');
      return data || [];
    }
  });

  const filteredUsers = filterRole === "all" ? allUsers : allUsers.filter(u => u.role === filterRole);
  const stats = {
    total: allUsers.length,
    admin: allUsers.filter(u => u.role === "admin").length,
    agent: allUsers.filter(u => u.role === "agent").length,
    user: allUsers.filter(u => u.role === "user").length,
  };

  const createM = useMutation({
    mutationFn: async (d) => {
      if (!d.password || d.password.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres");
      }
      if (d.password !== d.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: d.email,
        password: d.password,
        email_confirm: true,
        user_metadata: { full_name: d.full_name, role: d.role }
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error('Erro ao criar usuário');

      const { error: insertError } = await supabase.from('users').upsert({
        id: userId,
        email: d.email,
        password_hash: 'supabase_auth',
        full_name: d.full_name,
        role: d.role,
        role_id: d.role_id || null,
        phone: d.phone || null,
        department_id: d.department_id || null,
        client_id: d.client_id || null,
        status: 'active'
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: "Sucesso", description: "Usuário criado com sucesso!" });
    },
    onError: (e) => {
      toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" });
    }
  });

  const updateM = useMutation({
    mutationFn: async ({ id, data }) => {
      const clean = { ...data };
      ['role_id', 'client_id', 'department_id'].forEach(k => {
        if (!clean[k] || clean[k] === '') delete clean[k];
      });
      const { error } = await supabase.from('users').update(clean).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setEditOpen(false);
      toast({ title: "Sucesso", description: "Usuário atualizado!" });
    },
    onError: (e) => {
      toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" });
    }
  });

  const deleteM = useMutation({
    mutationFn: async (id) => {
      try { await supabase.rpc('admin_delete_user', { target_user_id: id }); } catch {}
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({ title: "Sucesso", description: "Usuário excluído!" });
    },
  });

  const openEdit = (user) => {
    setEditing(user);
    setEditForm({
      role: user.role || "user",
      role_id: user.role_id || "",
      phone: user.phone || "",
      client_id: user.client_id || "",
      department_id: user.department_id || "",
    });
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      await updateM.mutateAsync({ id: editing.id, data: editForm });
      if (newPassword) {
        if (newPassword.length < 6) {
          toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
          return;
        }
        if (newPassword !== confirmPassword) {
          toast({ title: "Senhas não coincidem", variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.admin.updateUserById(editing.id, { password: newPassword });
        if (error) throw error;
        toast({ title: "Senha alterada com sucesso!" });
      }
    } catch (e) {
      toast({ title: "Erro", description: e.message || "Falha ao salvar.", variant: "destructive" });
    }
  };

  const columns = [
    {
      key: "full_name", label: "Nome",
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm">{v || "—"}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      )
    },
    {
      key: "role", label: "Tipo",
      render: v => <Badge variant="outline" className={`text-xs ${ROLE_BADGES[v] || ""}`}>{ROLE_LABELS[v] || v}</Badge>
    },
    {
      key: "role_name", label: "Perfil",
      render: v => v ? <Badge variant="outline" className="text-xs">{v}</Badge> : <span className="text-xs text-muted-foreground">—</span>
    },
    {
      key: "client_name", label: "Cliente",
      render: v => v ? <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{v}</Badge> : <span className="text-xs text-muted-foreground">—</span>
    },
    {
      key: "department_name", label: "Departamento",
      render: v => v || <span className="text-xs text-muted-foreground">—</span>
    },
    {
      key: "status", label: "Status",
      render: v => (
        <Badge variant="outline" className={`text-xs ${v === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {v === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie todos os usuários do sistema"
        action={() => setDialogOpen(true)}
        actionLabel="Novo Usuário"
        actionIcon={UserPlus}
        canCreate={can("users.manage")}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button onClick={() => setFilterRole("all")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </button>
        <button onClick={() => setFilterRole("admin")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "admin" ? "border-purple-400 bg-purple-50" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="text-2xl font-bold text-purple-600">{stats.admin}</p>
        </button>
        <button onClick={() => setFilterRole("agent")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "agent" ? "border-blue-400 bg-blue-50" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Técnicos</p>
          <p className="text-2xl font-bold text-blue-600">{stats.agent}</p>
        </button>
        <button onClick={() => setFilterRole("user")} className={`p-3 rounded-lg border text-left transition-all ${filterRole === "user" ? "border-emerald-400 bg-emerald-50" : "border-border hover:bg-muted/50"}`}>
          <p className="text-xs text-muted-foreground">Usuários</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.user}</p>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={item => deleteM.mutate(item.id)}
        searchKeys={["full_name", "email", "client_name", "department_name"]}
        emptyMessage="Nenhum usuário encontrado"
        canEdit={can("users.manage")}
        canDelete={can("users.manage")}
      />

      {/* Dialog: Novo Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createM.mutate(form); }} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar Senha *</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={form.confirmPassword}
                  onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Usuário *</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
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
              <div className="space-y-1.5">
                <Label>Perfil de Acesso</Label>
                <Select value={form.role_id || "none"} onValueChange={v => setForm(p => ({ ...p, role_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select value={form.department_id || "none"} onValueChange={v => setForm(p => ({ ...p, department_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cliente Vinculado</Label>
              <Select value={form.client_id || "none"} onValueChange={v => setForm(p => ({ ...p, client_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createM.isPending}>
                {createM.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Editar — {editing?.full_name || editing?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Usuário</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="agent">Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Perfil de Acesso</Label>
                <Select value={editForm.role_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, role_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={editForm.phone || ""} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Select value={editForm.department_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, department_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Cliente Vinculado</Label>
              <Select value={editForm.client_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, client_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-semibold">Alterar Senha</Label>
              <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirmar</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    minLength={6}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateM.isPending}>
              {updateM.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
