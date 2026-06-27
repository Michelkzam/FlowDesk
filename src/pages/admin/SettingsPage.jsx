import React, { useState, useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Settings, Ticket, Users, BookOpen, Mail, ImageIcon, Upload, Volume2, Play, Pause } from "lucide-react";
import UserProfilesTable from "@/components/settings/UserProfilesTable";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

const defaultSettings = {
  helpdesk_name: "FlowDesk",
  helpdesk_url: "",
  status: "online",
  default_priority: "normal",
  default_status: "open",
  max_open_tickets: 0,
  require_login: false,
  captcha_enabled: false,
  auto_assign_unassigned: false,
  rich_text_enabled: true,
  agent_password_expiry: "never",
  kb_enabled: true,
  kb_require_login: false,
  canned_responses_enabled: true,
  admin_email: "",
  smtp_enabled: false,
  smtp_host: "",
  smtp_port: "587",
  smtp_auth: "basic",
  smtp_username: "",
  smtp_password: "",
  smtp_header_spoofing: false,
  smtp_from_name: "",
  smtp_from_email: "",
  default_sla_id: "",
  default_department_id: "",
  ticket_number_format: "######",
  lock_duration: 30,
  page_size: 25,
  sound_login_enabled: true,
  sound_login_url: "",
  sound_new_ticket_enabled: true,
  sound_new_ticket_url: "",
  sound_ticket_closed_enabled: true,
  sound_ticket_closed_url: "",
  sound_ticket_assigned_enabled: false,
  sound_ticket_assigned_url: "",
  sound_new_message_enabled: true,
  sound_new_message_url: "",
};

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = React.useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settingsData = [], isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) return [];
      return data || [];
    },
  });

  const settingsMap = {};
  settingsData.forEach(s => { settingsMap[s.key] = s.value; });

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (settingsData.length > 0) {
      const loaded = { ...defaultSettings };
      settingsData.forEach(s => {
        if (s.key in loaded) {
          const val = s.value;
          if (val === 'true') loaded[s.key] = true;
          else if (val === 'false') loaded[s.key] = false;
          else if (!isNaN(val) && val !== '') loaded[s.key] = Number(val);
          else loaded[s.key] = val;
        }
      });
      setSettings(loaded);
      if (loaded.helpdesk_name) document.title = loaded.helpdesk_name;
      const savedLogo = localStorage.getItem("appLogo");
      if (savedLogo) setLogoPreview(savedLogo);
    }
  }, [settingsData]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const [playingSound, setPlayingSound] = useState(null);

  const handleSoundUpload = async (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo de áudio.", variant: "destructive" });
      return;
    }
    try {
      const ext = file.name.split('.').pop();
      const path = `sounds/${key}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      set(key, urlData.publicUrl);
      toast({ title: "Áudio carregado", description: `Som de ${key.replace('sound_', '').replace('_', ' ')} atualizado!` });
    } catch (err) {
      toast({ title: "Erro ao carregar áudio", description: err.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const playPreview = (url, key) => {
    if (!url) {
      toast({ title: "Sem áudio", description: "Nenhum áudio configurado para esta notificação.", variant: "destructive" });
      return;
    }
    if (playingSound === key) {
      setPlayingSound(null);
      return;
    }
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    setPlayingSound(key);
    audio.onended = () => setPlayingSound(null);
  };

  const handleSave = async () => {
    try {
      const entries = Object.entries(settings).filter(([k]) => k in defaultSettings);
      const upserts = entries.map(([key, value]) => ({
        key,
        value: String(value),
      }));
      const { error } = await supabase.from('system_settings').upsert(upserts, { onConflict: 'key' });
      if (error) throw error;
      if (logoPreview) localStorage.setItem("appLogo", logoPreview);
      else if (logo === null) localStorage.removeItem("appLogo");
      localStorage.setItem("appName", settings.helpdesk_name);
      document.title = settings.helpdesk_name;
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast({ title: "Configurações salvas", description: "As alterações foram salvas com sucesso!" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast({ title: "Erro ao salvar", description: e.message || "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Painel de administração do helpdesk</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 gap-2">
          <Save className="w-4 h-4" /> {saved ? "Salvo!" : "Salvar Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="system">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="system" className="text-xs gap-1"><Settings className="w-3.5 h-3.5" />Sistema</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs gap-1"><Ticket className="w-3.5 h-3.5" />Tickets</TabsTrigger>
          <TabsTrigger value="agents" className="text-xs gap-1"><Users className="w-3.5 h-3.5" />Agentes</TabsTrigger>
          <TabsTrigger value="kb" className="text-xs gap-1"><BookOpen className="w-3.5 h-3.5" />Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="email" className="text-xs gap-1"><Mail className="w-3.5 h-3.5" />E-mail</TabsTrigger>
          <TabsTrigger value="sounds" className="text-xs gap-1"><Volume2 className="w-3.5 h-3.5" />Sons</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4 mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Logomarca */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Logomarca da Empresa</Label>
                <div className="flex items-center gap-4">
                  <div className="w-40 h-40 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                    {logoPreview
                      ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      : <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5" /> {logoPreview ? "Trocar Logo" : "Enviar Logo"}
                    </Button>
                    {logoPreview && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive block" onClick={() => { setLogo(null); setLogoPreview(null); }}>
                        Remover
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG ou JPG, máx. 2MB. Recomendado: 160×160px</p>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoChange} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Nome do Helpdesk</Label><Input value={settings.helpdesk_name} onChange={e => set("helpdesk_name", e.target.value)} /></div>
                <div className="space-y-1"><Label>Email do Administrador</Label><Input type="email" value={settings.admin_email} onChange={e => set("admin_email", e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>URL do Helpdesk</Label><Input value={settings.helpdesk_url} onChange={e => set("helpdesk_url", e.target.value)} placeholder="https://suporte.empresa.com" /></div>
              <div className="space-y-1">
                <Label>Status do Helpdesk</Label>
                <Select value={settings.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div><p className="text-sm font-medium">Habilitar HTML / Texto Rico</p><p className="text-xs text-muted-foreground">Permite formatação nas mensagens</p></div>
                <Switch checked={settings.rich_text_enabled} onCheckedChange={v => set("rich_text_enabled", v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Tamanho de Página Padrão</Label><Input type="number" value={settings.page_size} onChange={e => set("page_size", parseInt(e.target.value))} /></div>
                <div className="space-y-1"><Label>Duração do Bloqueio (min)</Label><Input type="number" value={settings.lock_duration} onChange={e => set("lock_duration", parseInt(e.target.value))} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4 mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações de Tickets</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Formato do Número</Label><Input value={settings.ticket_number_format} onChange={e => set("ticket_number_format", e.target.value)} placeholder="######" /><p className="text-xs text-muted-foreground">Use # onde os dígitos devem aparecer</p></div>
                <div className="space-y-1"><Label>Máx. Tickets Abertos por Usuário</Label><Input type="number" value={settings.max_open_tickets} onChange={e => set("max_open_tickets", parseInt(e.target.value))} /><p className="text-xs text-muted-foreground">0 = ilimitado</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Prioridade Padrão</Label>
                  <Select value={settings.default_priority} onValueChange={v => set("default_priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="emergency">Emergência</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Status Padrão</Label>
                  <Select value={settings.default_status} onValueChange={v => set("default_status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="open">Aberto</SelectItem><SelectItem value="in_progress">Em Andamento</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { key: "captcha_enabled", label: "Habilitar CAPTCHA", desc: "Verificação humana no portal do cliente" },
                  { key: "auto_assign_unassigned", label: "Atribuição Automática", desc: "Atribuir ticket ao agente que respondeu" },
                  { key: "require_login", label: "Exigir Login", desc: "Usuários devem fazer login para abrir tickets" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                    <Switch checked={!!settings[item.key]} onCheckedChange={v => set(item.key, v)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4 mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações de Agentes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Label>Política de Expiração de Senha</Label>
                <Select value={settings.agent_password_expiry} onValueChange={v => set("agent_password_expiry", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Nunca expira</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Perfis de Acesso dos Usuários</CardTitle></CardHeader>
            <CardContent>
              <UserProfilesTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kb" className="space-y-4 mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Base de Conhecimento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "kb_enabled", label: "Habilitar Base de Conhecimento", desc: "Permite acesso público aos artigos" },
                { key: "kb_require_login", label: "Exigir Login", desc: "Usuários devem fazer login para ver artigos" },
                { key: "canned_responses_enabled", label: "Habilitar Respostas Predefinidas", desc: "Agentes podem usar respostas prontas" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={!!settings[item.key]} onCheckedChange={v => set(item.key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Configurações de E-mail de Saída (SMTP)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Habilitar Envio de E-mails</p>
                  <p className="text-xs text-muted-foreground">Ativar ou desativar o envio de e-mails pelo sistema</p>
                </div>
                <Switch checked={settings.smtp_enabled} onCheckedChange={v => set("smtp_enabled", v)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Host</Label>
                  <Input value={settings.smtp_host} onChange={e => set("smtp_host", e.target.value)} placeholder="smtp.exemplo.com" />
                  <p className="text-xs text-muted-foreground">Ex: smtp.gmail.com ou ssl://smtp.exemplo.com</p>
                </div>
                <div className="space-y-1">
                  <Label>Número da Porta</Label>
                  <Input value={settings.smtp_port} onChange={e => set("smtp_port", e.target.value)} placeholder="587" />
                  <p className="text-xs text-muted-foreground">Portas comuns: 25, 465 (SSL), 587 (TLS)</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Autenticação</Label>
                <Select value={settings.smtp_auth} onValueChange={v => set("smtp_auth", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same_as_mailbox">Igual à Caixa de Correio Remota</SelectItem>
                    <SelectItem value="basic">Autenticação Básica (Legada)</SelectItem>
                    <SelectItem value="none">Nenhuma (Nenhuma Autenticação Necessária)</SelectItem>
                    <SelectItem value="oauth2_google">OAuth2 - Google</SelectItem>
                    <SelectItem value="oauth2_microsoft">OAuth2 - Microsoft</SelectItem>
                    <SelectItem value="oauth2_other">OAuth2 - Outro Provedor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.smtp_auth === "same_as_mailbox" && "Utilizará o método de autenticação configurado na guia \"Caixa de correio remota\"."}
                  {settings.smtp_auth === "none" && "Não utiliza autenticação. Útil ao usar portas de retransmissão."}
                  {settings.smtp_auth === "basic" && "Autenticação comum com nome de usuário e senha. Método legado."}
                  {settings.smtp_auth === "oauth2_google" && "Modelo pré-preenchido para OAuth2 do Google."}
                  {settings.smtp_auth === "oauth2_microsoft" && "Modelo pré-preenchido para OAuth2 da Microsoft."}
                  {settings.smtp_auth === "oauth2_other" && "Modelo em branco para um provedor OAuth2 de terceiros."}
                </p>
              </div>

              {(settings.smtp_auth === "basic") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Usuário</Label>
                    <Input value={settings.smtp_username} onChange={e => set("smtp_username", e.target.value)} placeholder="usuario@exemplo.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>Senha</Label>
                    <Input type="password" value={settings.smtp_password} onChange={e => set("smtp_password", e.target.value)} placeholder="••••••••" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do Remetente</Label>
                  <Input value={settings.smtp_from_name} onChange={e => set("smtp_from_name", e.target.value)} placeholder="Suporte" />
                </div>
                <div className="space-y-1">
                  <Label>E-mail do Remetente</Label>
                  <Input type="email" value={settings.smtp_from_email} onChange={e => set("smtp_from_email", e.target.value)} placeholder="suporte@empresa.com" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Falsificação de Cabeçalho</p>
                  <p className="text-xs text-muted-foreground">Permite enviar e-mails a partir de um endereço diferente do configurado. Útil para aliases.</p>
                </div>
                <Switch checked={settings.smtp_header_spoofing} onCheckedChange={v => set("smtp_header_spoofing", v)} />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Após configurar o SMTP:</p>
                <p>Acesse <strong>E-mails &gt; Configurações</strong> e defina este endereço como o e-mail de saída padrão do sistema.</p>
                <p>Para usar o mesmo endereço por departamento, atribua-o individualmente em <strong>Agentes &gt; Departamentos &gt; Configurações de Resposta Automática</strong>.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sounds" className="space-y-4 mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Volume2 className="w-4 h-4" /> Sons do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Configure os sons de notificação do sistema. Você pode ativar ou desativar cada som e personalizar o arquivo de áudio.
              </p>

              {[
                { key: "sound_login_enabled", urlKey: "sound_login_url", label: "Inicialização do Sistema", desc: "Toca ao fazer login no sistema" },
                { key: "sound_new_ticket_enabled", urlKey: "sound_new_ticket_url", label: "Chegada de Novo Ticket", desc: "Toca quando um novo ticket é criado" },
                { key: "sound_ticket_closed_enabled", urlKey: "sound_ticket_closed_url", label: "Encerramento de Ticket", desc: "Toca quando um ticket é encerrado" },
                { key: "sound_ticket_assigned_enabled", urlKey: "sound_ticket_assigned_url", label: "Ticket Atribuído", desc: "Toca quando um ticket é atribuído a você" },
                { key: "sound_new_message_enabled", urlKey: "sound_new_message_url", label: "Nova Mensagem no Chat", desc: "Toca quando uma nova mensagem é recebida nos chats" },
              ].map(sound => (
                <div key={sound.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={settings[sound.key]}
                        onCheckedChange={v => set(sound.key, v)}
                      />
                      <div>
                        <p className="text-sm font-medium">{sound.label}</p>
                        <p className="text-xs text-muted-foreground">{sound.desc}</p>
                      </div>
                    </div>
                    {settings[sound.key] && (
                      <div className="flex items-center gap-2 mt-3 ml-9">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => playPreview(settings[sound.urlKey], sound.key)}
                        >
                          {playingSound === sound.key ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {playingSound === sound.key ? "Pausar" : "Ouvir"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => document.getElementById(`upload-${sound.key}`)?.click()}
                        >
                          <Upload className="w-3 h-3" /> Carregar Áudio
                        </Button>
                        <input
                          id={`upload-${sound.key}`}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleSoundUpload(sound.urlKey, e)}
                        />
                        {settings[sound.urlKey] && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            Áudio personalizado
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}