import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/api/flowdeskClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { User, KeyRound, Shield, Camera, Save, Eye, EyeOff, CheckCircle } from "lucide-react";
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

export default function ProfilePage() {
  const { profile: authProfile, permissions, isAdmin, isAgent } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => db.auth.me(),
  });

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    department: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const initials = (me?.full_name || me?.email || "U")
    .split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleProfileUpdate = async (e) => {
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
        .eq('id', me.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: profileForm.full_name } });
      queryClient.invalidateQueries({ queryKey: ["me"] });
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
      const path = `${me.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path + '?t=' + Date.now());
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', me.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Sucesso", description: "Foto atualizada!" });
    } catch (err) {
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
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast({ title: "Sucesso", description: "Senha alterada com sucesso!" });
    } catch (err) {
      toast({ title: "Erro", description: "Erro ao alterar senha: " + (err.message || "Tente novamente."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pt-12 lg:pt-0">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais e configurações de conta</p>
      </div>

      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-6 pb-6 border-b border-border">
            <div className="relative group">
              <Avatar className="w-20 h-20">
                <AvatarImage src={me?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{me?.full_name || "—"}</h2>
              <p className="text-sm text-muted-foreground">{me?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {isAdmin ? "Administrador" : isAgent ? "Técnico" : "Usuário"}
                </Badge>
                {me?.created_at && (
                  <span className="text-xs text-muted-foreground">
                    Membro desde {format(new Date(me.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="info" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info" className="gap-2">
                <User className="w-4 h-4" /> Informações
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-2">
                <KeyRound className="w-4 h-4" /> Senha
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <Shield className="w-4 h-4" /> Permissões
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome Completo</Label>
                    <Input
                      value={profileForm.full_name || me?.full_name || ""}
                      onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={me?.email || ""} disabled className="opacity-60" />
                    <p className="text-[10px] text-muted-foreground">O email não pode ser alterado aqui.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input
                      value={profileForm.phone || me?.phone || ""}
                      onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Departamento</Label>
                    <Input
                      value={profileForm.department || me?.department || ""}
                      onChange={e => setProfileForm(p => ({ ...p, department: e.target.value }))}
                      placeholder="Ex: TI"
                    />
                  </div>
                </div>
                <Button type="submit" className="gap-2" disabled={saving}>
                  {saving ? "Salvando..." : <><Save className="w-4 h-4" /> Salvar alterações</>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="password" className="mt-6">
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
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
                <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground mb-1">Dicas de segurança:</p>
                  <p>• Use pelo menos 8 caracteres</p>
                  <p>• Misture letras maiúsculas, minúsculas, números e símbolos</p>
                  <p>• Evite informações pessoais óbvias</p>
                </div>
                <Button type="submit" className="gap-2 w-full" disabled={saving}>
                  {saving ? "Salvando..." : <><KeyRound className="w-4 h-4" /> Alterar Senha</>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="permissions" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Shield className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold">{me?.full_name || me?.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Cargo: <Badge variant="outline" className="ml-1">{isAdmin ? "Administrador" : isAgent ? "Técnico" : "Usuário"}</Badge>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase mb-3">Permissões</p>
                  {isAdmin ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          {label}
                        </div>
                      ))}
                    </div>
                  ) : permissions.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map(p => (
                        <div key={p} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          {PERMISSION_LABELS[p] || p}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/30">Nenhuma permissão especial atribuída.</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
