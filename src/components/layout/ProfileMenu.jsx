import { supabase } from '@/lib/supabase';

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Eye, EyeOff, Shield } from "lucide-react";
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
  const { profile, logout, permissions, isAdmin, isAgent } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getRoleLabel = () => {
    if (isAdmin) return "Administrador";
    if (profile?.role_name) return profile.role_name;
    if (isAgent) return "Agente";
    return "Usuário";
  };

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

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
              <p className="text-xs text-muted-foreground dark:text-zinc-400">{getRoleLabel()}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => navigate("/meu-perfil")} className="cursor-pointer gap-2">
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
                  Cargo: <Badge variant="outline" className="ml-1">{getRoleLabel()}</Badge>
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
