import { db } from '@/api/flowdeskClient';
import { playSystemSound } from '@/lib/soundSystem';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

const defaultForm = {
  title: "", description: "", priority: "normal", source: "web",
  user_name: "", user_email: "", user_phone: "",
  department_id: "", department_name: "", help_topic_id: "", help_topic_name: "",
  agent_id: "", agent_name: "", status: "open"
};

export default function NewTicketDialog({ open, onClose }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => db.entities.Department.list() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });
  const { data: helpTopics = [] } = useQuery({ queryKey: ["help-topics"], queryFn: () => db.entities.HelpTopic.list() });

  const mutation = useMutation({
    mutationFn: (data) => db.entities.Ticket.create({ ...data, number: `#${Date.now().toString().slice(-6)}` }),
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setForm(defaultForm);
      onClose();
      playSystemSound('new_ticket');
      navigate(`/tickets/${newTicket.id}`);
    }
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir Novo Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 py-2">
          {/* User Info */}
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações do Usuário</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.user_name} onChange={e => set("user_name", e.target.value)} placeholder="Nome completo" required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.user_email} onChange={e => set("user_email", e.target.value)} placeholder="email@exemplo.com" required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.user_phone} onChange={e => set("user_phone", e.target.value)} placeholder="(00) 00000-0000" className="h-9 text-sm" />
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Assunto *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Descreva brevemente o problema..." required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Detalhes do problema..."
              />
            </div>
          </div>

          {/* Routing */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="emergency">Emergência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Select value={form.source} onValueChange={v => set("source", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Select value={form.department_id} onValueChange={v => {
                const dept = departments.find(d => d.id === v);
                set("department_id", v);
                set("department_name", dept?.name || "");
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tópico de Ajuda</Label>
              <Select value={form.help_topic_id} onValueChange={v => {
                const ht = helpTopics.find(h => h.id === v);
                set("help_topic_id", v);
                set("help_topic_name", ht?.name || "");
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {helpTopics.filter(h => h.status === "active").map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Atribuir Agente</Label>
            <Select value={form.agent_id} onValueChange={v => {
              const ag = agents.find(a => a.id === v);
              set("agent_id", v);
              set("agent_name", ag?.name || "");
            }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nenhum (sem atribuição)" /></SelectTrigger>
              <SelectContent>
                {agents.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={mutation.isPending}>
              {mutation.isPending ? "Criando..." : "Abrir Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}