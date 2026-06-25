import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MessageCircle, Send, CheckCircle2, AlertCircle, Copy } from "lucide-react";

export default function SincronizarPage() {
  const [waToken, setWaToken] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [tgToken, setTgToken] = useState("");
  const [waSaved, setWaSaved] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);

  const webhookBase = window.location.origin;

  const handleSaveWA = () => { if (waToken && waPhone) setWaSaved(true); };
  const handleSaveTG = () => { if (tgToken) setTgSaved(true); };
  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Sincronização de Canais</h1>
        <p className="text-sm text-muted-foreground">Configure a integração com WhatsApp e Telegram para receber mensagens como tickets</p>
      </div>

      {/* WhatsApp */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            WhatsApp Business API
            {waSaved && <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-auto"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Acesse o <strong>Meta for Developers</strong> e crie um app WhatsApp Business</li>
              <li>Gere um token de acesso permanente</li>
              <li>Configure o webhook abaixo no painel da Meta</li>
              <li>Cole aqui o token e o número de telefone</li>
            </ol>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Token de Acesso</label>
            <Input placeholder="EAAxxxxxxxxxxxxxxx..." value={waToken} onChange={e => setWaToken(e.target.value)} type="password" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">ID do Número de Telefone</label>
            <Input placeholder="1234567890123456" value={waPhone} onChange={e => setWaPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">URL do Webhook (configure na Meta)</label>
            <div className="flex gap-2">
              <Input value={`${webhookBase}/webhook/whatsapp`} readOnly className="bg-muted text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={() => copy(`${webhookBase}/webhook/whatsapp`)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveWA} disabled={!waToken || !waPhone} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <RefreshCw className="w-4 h-4" /> Salvar e Sincronizar
            </Button>
            {waSaved && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Configuração salva</span>}
          </div>
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            Telegram Bot
            {tgSaved && <Badge className="bg-blue-100 text-blue-700 border-0 ml-auto"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Abra o Telegram e inicie conversa com <strong>@BotFather</strong></li>
              <li>Use <strong>/newbot</strong> e siga as instruções para criar seu bot</li>
              <li>Copie o token gerado e cole abaixo</li>
              <li>Configure o webhook abaixo no seu bot</li>
            </ol>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Token do Bot</label>
            <Input placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={tgToken} onChange={e => setTgToken(e.target.value)} type="password" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">URL do Webhook (configure via BotFather)</label>
            <div className="flex gap-2">
              <Input value={`${webhookBase}/webhook/telegram`} readOnly className="bg-muted text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={() => copy(`${webhookBase}/webhook/telegram`)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveTG} disabled={!tgToken} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
              <RefreshCw className="w-4 h-4" /> Salvar e Sincronizar
            </Button>
            {tgSaved && <span className="text-xs text-blue-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Configuração salva</span>}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Para produção, os tokens devem ser armazenados de forma segura via backend. Esta tela permite configurar e testar a conexão com os canais.</p>
      </div>
    </div>
  );
}