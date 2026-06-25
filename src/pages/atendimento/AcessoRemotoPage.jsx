import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Monitor, Search, Wifi, WifiOff, ExternalLink, Copy, User, Building2 } from "lucide-react";

const tools = [
  {
    name: "AnyDesk",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Anydesk_Logo.svg/120px-Anydesk_Logo.svg.png",
    description: "Acesso remoto rápido e seguro",
    urlBase: "anydesk://",
    idLabel: "ID AnyDesk",
    placeholder: "Ex: 123 456 789",
    color: "bg-red-50 border-red-200",
    btnColor: "bg-red-600 hover:bg-red-700",
  },
  {
    name: "TeamViewer",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/TeamViewer_Logo.svg/120px-TeamViewer_Logo.svg.png",
    description: "Suporte remoto corporativo",
    urlBase: "teamviewer10://",
    idLabel: "ID TeamViewer",
    placeholder: "Ex: 1 234 567 890",
    color: "bg-blue-50 border-blue-200",
    btnColor: "bg-blue-600 hover:bg-blue-700",
  },
  {
    name: "RustDesk",
    logo: null,
    description: "Solução open-source de acesso remoto",
    urlBase: "rustdesk://",
    idLabel: "ID RustDesk",
    placeholder: "Ex: 123456789",
    color: "bg-emerald-50 border-emerald-200",
    btnColor: "bg-emerald-600 hover:bg-emerald-700",
  },
];

export default function AcessoRemotoPage() {
  const [search, setSearch] = useState("");
  const [selectedTool, setSelectedTool] = useState(0);
  const [remoteId, setRemoteId] = useState("");
  const [manualIp, setManualIp] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["system-users"],
    queryFn: () => db.entities.User.list(),
  });

  const filteredClients = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s) ||
      (c.company || "").toLowerCase().includes(s);
  });

  const filteredUsers = users.filter(u => {
    if (!search) return false; // só mostra usuários quando há busca
    const s = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s);
  });

  const tool = tools[selectedTool];

  const handleConnect = () => {
    if (!remoteId.trim()) return;
    const id = remoteId.replace(/\s/g, "");
    const url = `${tool.urlBase}${id}`;
    window.open(url, "_blank");
  };

  const handleConnectIP = () => {
    if (!manualIp.trim()) return;
    const url = `${tool.urlBase}${manualIp}`;
    window.open(url, "_blank");
  };

  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Monitor className="w-5 h-5 text-primary" /> Acesso Remoto</h1>
        <p className="text-sm text-muted-foreground">Conecte-se remotamente aos computadores de clientes e usuários cadastrados</p>
      </div>

      {/* Tool selector */}
      <div>
        <p className="text-sm font-medium mb-2">Ferramenta de Acesso Remoto</p>
        <div className="grid grid-cols-3 gap-3">
          {tools.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setSelectedTool(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${selectedTool === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card"}`}
            >
              <div className="flex items-center gap-3">
                {t.logo
                  ? <img src={t.logo} alt={t.name} className="h-7 object-contain" onError={e => { e.target.style.display = "none"; }} />
                  : <Monitor className="w-7 h-7 text-emerald-600" />
                }
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick connect by ID */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Wifi className="w-4 h-4 text-primary" /> Conectar via ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{tool.idLabel}</label>
              <Input
                placeholder={tool.placeholder}
                value={remoteId}
                onChange={e => setRemoteId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnect()}
              />
            </div>
            <Button onClick={handleConnect} disabled={!remoteId.trim()} className={`w-full gap-2 text-white ${tool.btnColor}`}>
              <ExternalLink className="w-4 h-4" /> Iniciar Conexão com {tool.name}
            </Button>
            <p className="text-xs text-muted-foreground text-center">O {tool.name} precisa estar instalado no seu computador</p>
          </CardContent>
        </Card>

        {/* Connect by IP */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> Conectar via IP / Hostname</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Endereço IP ou Hostname</label>
              <Input
                placeholder="Ex: 192.168.1.100 ou pc-joao"
                value={manualIp}
                onChange={e => setManualIp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnectIP()}
              />
            </div>
            <Button onClick={handleConnectIP} disabled={!manualIp.trim()} variant="outline" className="w-full gap-2">
              <ExternalLink className="w-4 h-4" /> Conectar ao Endereço
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs flex-1 gap-1" onClick={() => copy(manualIp)}>
                <Copy className="w-3 h-3" /> Copiar endereço
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients / Users list */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Clientes e Usuários Cadastrados</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou usuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-80 overflow-y-auto">
          {!search && (
            <p className="text-xs text-muted-foreground text-center py-4">Digite para buscar clientes ou usuários</p>
          )}
          {filteredUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {(u.full_name || u.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200"><User className="w-2.5 h-2.5 mr-1" />Usuário</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setRemoteId(""); setManualIp(u.email || ""); }}>
                  <Monitor className="w-3 h-3" /> Conectar
                </Button>
              </div>
            </div>
          ))}
          {filteredClients.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  {(c.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email || c.company || "Sem email"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"><Building2 className="w-2.5 h-2.5 mr-1" />Cliente</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setRemoteId(""); setManualIp(c.email || c.name || ""); }}>
                  <Monitor className="w-3 h-3" /> Selecionar
                </Button>
              </div>
            </div>
          ))}
          {search && filteredClients.length === 0 && filteredUsers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
        <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Para conectar, a ferramenta escolhida precisa estar instalada e em execução no computador do cliente. Solicite ao cliente o ID ou IP antes de iniciar a sessão.</p>
      </div>
    </div>
  );
}