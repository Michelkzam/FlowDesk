import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, Shield, Eye, EyeOff, Key, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/lib/supabase";

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: "", phone: "+55 ", client_id: "" });
  const [editForm, setEditForm] = useState({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [inviting, setInviting] = useState(false);
  const [resendingUser, setResendingUser] = useState(null);
  const [confirmResendOpen, setConfirmResendOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  // System users
  const { data: systemUsers = [], isLoading } = useQuery({
    queryKey: ["system-users"],
    queryFn: () => db.entities.User.list(),
  });

  // Clients list
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list(),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.User.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["system-users"] }); setEditOpen(false); },
  });

  const deleteM = useMutation({
    mutationFn: id => db.entities.User.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-users"] }),
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const result = await db.auth.inviteUser(inviteForm.email, "user");
      if (result?.user?.id) {
        const updateData = {};
        if (inviteForm.client_id) updateData.client_id = inviteForm.client_id;
        const selectedClient = clients.find(c => c.id === inviteForm.client_id);
        if (selectedClient) updateData.client_name = selectedClient.name;
        if (Object.keys(updateData).length > 0) {
          await db.entities.User.update(result.user.id, updateData);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
      toast({ title: "Convite enviado!", description: `Usuário criado: ${inviteForm.email}. Senha temporária enviada.` });
      setInviteOpen(false);
      setInviteForm({ email: "", phone: "+55 ", client_id: "" });
    } catch (err) {
      toast({ title: "Erro ao enviar convite", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = (user) => {
    setResendingUser(user);
    setConfirmResendOpen(true);
  };

  const confirmResendInvite = async () => {
    setConfirmResendOpen(false);
    try {
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      const { error } = await supabase.auth.admin.updateUserById(resendingUser.id, { password: tempPassword });
      if (error) throw error;
      await navigator.clipboard.writeText(tempPassword);
      toast({ title: "Convite reenviado!", description: `Nova senha copiada: ${tempPassword}. Cole e envie ao usuário.` });
    } catch (err) {
      toast({ title: "Erro ao reenviar", description: err.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    await updateM.mutateAsync({ id: editing.id, data: editForm });
    if (newPassword) {
      if (newPassword.length < 6) {
        toast({ title: "Senha muito curta", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Senhas não coincidem", description: "As senhas digitadas não são iguais.", variant: "destructive" });
        return;
      }
      try {
        const { error } = await supabase.rpc('admin_update_user_password', {
          target_user_id: editing.id,
          new_password: newPassword,
        });
        if (error) throw error;
        toast({ title: "Senha alterada", description: `Senha de ${editing.full_name || editing.email} alterada com sucesso!` });
        queryClient.invalidateQueries({ queryKey: ["system-users"] });
      } catch (err) {
        toast({ title: "Erro ao alterar senha", description: err.message || "Tente novamente.", variant: "destructive" });
      }
    }
  };

  const openEdit = (user) => {
    setEditing(user);
    setEditForm({ role: user.role || "user", phone: user.phone || "", client_id: user.client_id || "" });
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setEditOpen(true);
  };

  const handleQuickPassword = async () => {
    if (!pwNew || pwNew.length < 6) {
      toast({ title: "Senha inválida", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (pwNew !== pwConfirm) {
      toast({ title: "Senhas não coincidem", description: "As senhas digitadas não são iguais.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc('admin_update_user_password', {
        target_user_id: passwordUser.id,
        new_password: pwNew,
      });
      if (error) throw error;
      toast({ title: "Senha alterada", description: `Senha de ${passwordUser.full_name || passwordUser.email} alterada com sucesso!` });
      setPasswordUser(null);
      setPwNew("");
      setPwConfirm("");
      queryClient.invalidateQueries({ queryKey: ["system-users"] });
    } catch (err) {
      toast({ title: "Erro ao alterar senha", description: err.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const columns = [
    { key: "full_name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefone" },
    { key: "role", label: "Perfil", render: v => (
      <Badge variant="outline" className={v === "admin" ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-blue-100 text-blue-700 border-blue-200"}>
        {v === "admin" ? "Admin" : "Usuário"}
      </Badge>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Usuários do Sistema"
        subtitle="Gerencie quem tem acesso ao sistema"
        action={() => setInviteOpen(true)}
        actionLabel="Convidar Usuário"
        actionIcon={UserPlus}
        canCreate={can("users.manage")}
      />

      <DataTable
        columns={columns}
        data={systemUsers}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={item => deleteM.mutate(item.id)}
        searchKeys={["full_name", "email"]}
        emptyMessage="Nenhum usuário cadastrado"
        canEdit={can("users.manage")}
        canDelete={can("users.manage")}
        extraActions={(row) => (
          <>
            <button onClick={(e) => { e.stopPropagation(); handleResendInvite(row); }}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Reenviar convite">
              <Send className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setPasswordUser(row); setPwNew(""); setPwConfirm(""); }}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Alterar senha">
              <Key className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      />

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Convidar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                required
                value={inviteForm.email}
                onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone / WhatsApp</Label>
              <Input
                type="tel"
                value={inviteForm.phone}
                onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+55 (00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente Vinculado (opcional)</Label>
              <Select value={inviteForm.client_id || "none"} onValueChange={v => setInviteForm(p => ({ ...p, client_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Se selecionado, o nome do cliente será exibido nos tickets criados por este usuário.</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-sm text-blue-800">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <p>O convite de acesso será enviado por email e WhatsApp. O usuário define sua própria senha ao aceitar.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={inviting}>
                {inviting ? "Enviando..." : "Enviar Convite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Editar Usuário — {editing?.full_name || editing?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Perfil de Acesso</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin / Agente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="+55 (00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente Vinculado</Label>
              <Select value={editForm.client_id || "none"} onValueChange={v => setEditForm(p => ({ ...p, client_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Nome do cliente exibido nos tickets criados por este usuário.</p>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-semibold">Alterar Senha</Label>
              <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual.</p>
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
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirmar Senha</Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90" disabled={updateM.isPending}>
              {updateM.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!passwordUser} onOpenChange={() => setPasswordUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha — {passwordUser?.full_name || passwordUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nova Senha</Label>
              <Input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repita a senha" minLength={6} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasswordUser(null)}>Cancelar</Button>
            <Button onClick={handleQuickPassword}>Alterar Senha</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmResendOpen} onOpenChange={setConfirmResendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reenviar Convite</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja gerar uma nova senha para <strong>{resendingUser?.full_name || resendingUser?.email}</strong>?
            <br />
            <span className="text-xs">A nova senha será copiada para sua área de transferência.</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResendOpen(false)}>Cancelar</Button>
            <Button onClick={confirmResendInvite}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}