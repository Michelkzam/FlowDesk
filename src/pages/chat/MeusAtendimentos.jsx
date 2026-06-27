import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Clock, Headphones, CheckCircle, User, Phone, MessageSquare, Plus, Search } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const channelEmoji = { whatsapp: "🟢", telegram: "🔵", email: "📧", phone: "📞", portal: "🌐" };

const columns = [
  {
    key: "open",
    label: "AGUARDANDO FILA",
    color: "bg-red-500",
    lightColor: "bg-red-50 border-red-200",
    textColor: "text-red-700",
    icon: Clock,
  },
  {
    key: "in_progress",
    label: "EM ATENDIMENTO",
    color: "bg-amber-500",
    lightColor: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
    icon: Headphones,
  },
  {
    key: "waiting",
    label: "NA ESPERA",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    icon: Clock,
  },
  {
    key: "resolved",
    label: "ATENDIDOS HOJE",
    color: "bg-emerald-600",
    lightColor: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
    icon: CheckCircle,
  },
];

function TicketCard({ ticket, onClick }) {
  return (
    <button
      onClick={() => onClick(ticket)}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{ticket.client_name || "Sem cliente"}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{ticket.title}</p>
          </div>
        </div>
        <span className="text-base flex-shrink-0">{channelEmoji[ticket.channel] || "🌐"}</span>
      </div>

      {ticket.operator_name && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Headphones className="w-3 h-3" />
          <span className="truncate">{ticket.operator_name}</span>
        </div>
      )}

      {ticket.client_phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <Phone className="w-3 h-3" />
          <span>{ticket.client_phone}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {ticket.created_date ? format(new Date(ticket.created_date), "dd/MM HH:mm", { locale: ptBR }) : "—"}
        </span>
        <Badge variant="outline" className={`text-xs ${
          ticket.priority === "emergency" ? "bg-red-100 text-red-700 border-red-200" :
          ticket.priority === "high" ? "bg-amber-100 text-amber-700 border-amber-200" :
          "bg-muted text-muted-foreground border-border"
        }`}>
          {ticket.priority === "emergency" ? "Crítica" : ticket.priority === "high" ? "Alta" : ticket.priority === "normal" ? "Média" : "Baixa"}
        </Badge>
      </div>
    </button>
  );
}

export default function MeusAtendimentos() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", priority: "normal", status: "open", channel: "portal" });
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Ticket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setNewTicketOpen(false);
      setFormData({ title: "", priority: "normal", status: "open", channel: "portal" });
    },
  });

  const byStatus = (status) => {
    const searchFiltered = tickets.filter(t =>
      !search ||
      (t.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.client_phone || "").toLowerCase().includes(search.toLowerCase())
    );
    if (status === "resolved") return searchFiltered.filter(t => t.status === "resolved" || t.status === "closed");
    return searchFiltered.filter(t => t.status === status);
  };

  const visibleColumns = activeFilter === "all" ? columns : columns.filter(c => {
    if (activeFilter === "open") return c.key === "open";
    if (activeFilter === "in_progress") return c.key === "in_progress";
    if (activeFilter === "waiting") return c.key === "waiting";
    if (activeFilter === "resolved") return c.key === "resolved";
    return true;
  });

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-[calc(100vh-32px)] pt-12 lg:pt-0">
        <ChatWindow
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={(updated) => {
            setSelectedTicket(updated);
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meus Atendimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral dos atendimentos por status</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar nome, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-52" />
          </div>
          <Button onClick={() => setNewTicketOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Novo
          </Button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Todos", cls: "bg-primary text-primary-foreground", inactive: "bg-muted text-muted-foreground hover:bg-muted/80" },
          { key: "open", label: "Aguardando", cls: "bg-red-500 text-white", inactive: "bg-red-100 text-red-700 hover:bg-red-200" },
          { key: "in_progress", label: "Em Atendimento", cls: "bg-amber-500 text-white", inactive: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
          { key: "waiting", label: "Na Espera", cls: "bg-blue-500 text-white", inactive: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
          { key: "resolved", label: "Atendidos Hoje", cls: "bg-emerald-600 text-white", inactive: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${activeFilter === f.key ? f.cls : f.inactive}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {visibleColumns.map(col => {
            const colTickets = byStatus(col.key);
            const Icon = col.icon;
            return (
              <div key={col.key} className="flex flex-col rounded-xl overflow-hidden border border-border shadow-sm">
                {/* Column header */}
                <div className={`${col.color} px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-white" />
                    <span className="text-white font-bold text-sm tracking-wide">{col.label}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center">
                    <span className="text-white font-bold text-lg leading-none">{colTickets.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="bg-muted/20 flex-1 p-3 space-y-3 min-h-[200px]">
                  {colTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs">Nenhum atendimento</p>
                    </div>
                  ) : (
                    colTickets.map(ticket => (
                      <TicketCard key={ticket.id} ticket={ticket} onClick={setSelectedTicket} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New ticket dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Título do ticket" required />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Cliente</Label>
              <Input value={formData.client_name || ""} onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))} placeholder="Nome do cliente" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="emergency">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData(p => ({ ...p, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewTicketOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Criar Ticket</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}