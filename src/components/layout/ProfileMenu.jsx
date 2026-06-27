import { supabase } from '@/lib/supabase';

import React, { useState, useRef } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Camera, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERMISSION_LABELS = {
  "tickets.create": "Criar tickets",
  "tickets.edit": "Editar tickets",
  "tickets.delete": "Excluir tickets",
  "tickets.close": "Fechar tickets",
  "tickets.assign": "Atribuir tickets",
  "tickets.transfer": "Transferir tickets",
  "kb.create": "Criar artigos",
  "kb.edit": "Editar artigos",
  "kb.delete": "Excluir artigos",
  "kb.publish": "Publicar artigos",
  "users.manage": "Gerenciar usuários",
  "reports.view": "Ver relatórios",
  "admin.access": "Acesso administrativo",
};

export default function ProfileMenu() {
  const { profile, logout, permissions, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    department: profile?.department || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef(null);

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const openProfile = () => {
    setProfileForm({
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      department: profile?.department || "",
    });
    setProfileOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone,
          department: profileForm.department,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: profileForm.full_name } });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setProfileOpen(false);
      toast({ title: "Sucesso", description: "Perfil atualizado com sucesso!" });
    } catch (err) {
      toast({ title: "Erro", description: "Erro ao salvar: " + (err.message || "Tente novamente."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path + '?t=' + Date.now());
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Sucesso", description: "Foto atualizada!" });
    } catch (err) {
      console.error('[Avatar] Erro:', err);
      toast({ title: "Erro", description: "Erro ao enviar foto: " + (err.message || "Verifique se o bucket 'avatars' existe no Supabase Storage."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      setPasswordOpen(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast({ title: "Sucesso", description: "Senha alterada com sucesso!" });
    } catch (err) {
      toast({ title: "Erro", description: "Erro ao alterar senha: " + (err.message || "Tente novamente."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-2 ml-1 border-l border-border dark:border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-zinc-100">{profile?.full_name || profile?.email || "Usuário"}</p>
              <p className="text-xs text-muted-foreground dark:text-zinc-400">{profile?.role === "admin" ? "Administrador" : "Técnico"}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={openProfile} className="cursor-pointer gap-2">
            <User className="w-4 h-4" /> Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)} className="cursor-pointer gap-2">
            <Settings className="w-4 h-4" /> Alterar Senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPermissionsOpen(true)} className="cursor-pointer gap-2">
            <Shield className="w-4 h-4" /> Minhas Permissões
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
            <LogOut className="w-4 h-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meu Perfil</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="text-sm font-semibold">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1">
                  Alterar foto
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <Input value={profileForm.full_name} onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profileForm.email} disabled className="opacity-60" />
              <p className="text-[10px] text-muted-foreground">O email não pode ser alterado aqui.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Input value={profileForm.department} onChange={e => setProfileForm(p => ({ ...p, department: e.target.value }))} placeholder="Ex: TI" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Alterar Senha"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Minhas Permissões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">{profile?.full_name || profile?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Cargo: <Badge variant="outline" className="ml-1">{isAdmin ? "Administrador" : "Técnico"}</Badge>
                </p>
                {profile?.updated_at ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Última atualização: {format(new Date(profile.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                ) : profile?.created_at ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Membro desde: {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Permissões</p>
              {isAdmin ? (
                <div className="space-y-1">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-[10px]">✓</span>
                      {label}
                    </div>
                  ))}
                </div>
              ) : permissions.length > 0 ? (
                <div className="space-y-1">
                  {permissions.map(p => (
                    <div key={p} className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-[10px]">✓</span>
                      {PERMISSION_LABELS[p] || p}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma permissão especial atribuída.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
