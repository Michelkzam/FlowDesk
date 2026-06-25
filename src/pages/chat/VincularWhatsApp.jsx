import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Smartphone, QrCode, Wifi, WifiOff, ExternalLink, Trash2 } from "lucide-react";

export default function VincularWhatsApp() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone_number: "" });
  const [showQR, setShowQR] = useState(null);
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["channel-links-whatsapp"],
    queryFn: () => db.entities.ChannelLink.filter({ channel: "whatsapp" }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.ChannelLink.create({ ...data, channel: "whatsapp", status: "pending" }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["channel-links-whatsapp"] });
      setDialogOpen(false);
      setFormData({ name: "", phone_number: "" });
      setShowQR(result);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.ChannelLink.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channel-links-whatsapp"] }),
  });

  const openWhatsAppQR = () => {
    window.open("https://web.whatsapp.com", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Vincular WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">Conecte sua conta WhatsApp via QR Code oficial</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="w-4 h-4" /> Nova Conexão
        </Button>
      </div>

      {showQR && (
        <Card className="p-8 border border-emerald-200 bg-emerald-50/50">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-emerald-600" />
              <h2 className="text-lg font-semibold">Conectar WhatsApp - {showQR.name}</h2>
            </div>

            <div className="bg-card rounded-2xl shadow-lg p-8 flex flex-col items-center gap-6 w-full max-w-md border border-emerald-200">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-12 h-12 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg mb-2">Clique no botão abaixo</p>
                <p className="text-sm text-muted-foreground">O WhatsApp Web será aberto em uma nova aba com o QR Code oficial para você escanear com seu celular.</p>
              </div>
              <Button onClick={openWhatsAppQR} className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-base px-6 py-3 h-auto">
                <ExternalLink className="w-5 h-5" /> Abrir WhatsApp Web (QR Code)
              </Button>
            </div>

            <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-4 max-w-md w-full">
              <p className="text-sm text-emerald-800 font-medium mb-2">📱 Como conectar:</p>
              <ol className="text-sm text-emerald-700 space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em <strong>Menu</strong> ou <strong>Configurações</strong></li>
                <li>Selecione <strong>"Aparelhos conectados"</strong></li>
                <li>Toque em <strong>"Conectar um aparelho"</strong></li>
                <li>Escaneie o QR Code exibido acima</li>
              </ol>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowQR(null)}>Fechar</Button>
              <Button onClick={openWhatsAppQR} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir WhatsApp Web
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : links.length === 0 && !showQR ? (
        <Card className="p-12 text-center border border-dashed border-border">
          <QrCode className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-medium text-foreground">Nenhuma conexão WhatsApp</h3>
          <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Conexão" para vincular</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map(link => (
            <Card key={link.id} className="p-5 border border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">{link.name}</p>
                    <p className="text-xs text-muted-foreground">{link.phone_number}</p>
                  </div>
                </div>
                <Badge variant="outline" className={
                  link.status === "connected" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  link.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-muted text-muted-foreground border-border"
                }>
                  {link.status === "connected" ? <><Wifi className="w-3 h-3 mr-1 inline" /> Conectado</> :
                   link.status === "pending" ? "Pendente" : <><WifiOff className="w-3 h-3 mr-1 inline" /> Desconectado</>}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowQR(link)} className="flex-1 gap-1">
                  <QrCode className="w-3.5 h-3.5" /> Reconectar
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive px-2" onClick={() => deleteMutation.mutate(link.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da Conexão</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ex: WhatsApp Principal" required />
            </div>
            <div className="space-y-1.5">
              <Label>Número de Telefone</Label>
              <Input value={formData.phone_number} onChange={(e) => setFormData(p => ({ ...p, phone_number: e.target.value }))} placeholder="+55 (00) 00000-0000" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Conectar via QR Code</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}