import { db } from '@/api/flowdeskClient';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Search, Clock, Headphones, CheckCircle, User, MessageSquare, X } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";

const channelEmoji = { whatsapp: "🟢", telegram: "🔵", email: "📧", phone: "📞", portal: "🌐" };

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const filterTabs = [
  { key: "all", label: "Todos", color: "bg-primary text-primary-foreground", inactive: "bg-muted text-muted-foreground hover:bg-muted/80" },
  { key: "open", label: "Aguardando", color: "bg-red-500 text-white", inactive: "bg-red-100 text-red-700 hover:bg-red-200" },
  { key: "in_progress", label: "Em Atendimento", color: "bg-amber-500 text-white", inactive: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { key: "resolved", label: "Finalizado", color: "bg-emerald-600 text-white", inactive: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
];

export default function Chats() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", priority: "normal", status: "open", channel: "portal" });
  const queryClient = useQueryClient();
  const initialStatusRef = useRef(null);
  const [searchParams] = useSearchParams();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 200),
  });

  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (ticketId && tickets.length > 0 && !selectedTicket) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        initialStatusRef.current = ticket.status;
        setSelectedTicket(ticket);
      }
    }
  }, [searchParams, tickets, selectedTicket]);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Ticket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setNewTicketOpen(false);
      setFormData({ title: "", priority: "normal", status: "open", channel: "portal" });
      playSystemSound('new_ticket');
    },
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.user_phone || "").toLowerCase().includes(search.toLowerCase());
    if (activeFilter === "open") return matchSearch && t.status === "open";
    if (activeFilter === "in_progress") return matchSearch && t.status === "in_progress";
    if (activeFilter === "resolved") return matchSearch && (t.status === "resolved" || t.status === "closed");
    return matchSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -m-4 md:-m-6 border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Mensagens</h1>
          {/* Counter icons */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-red-100 text-red-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <Clock className="w-3 h-3" /> {counts.open}
            </div>
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <Headphones className="w-3 h-3" /> {counts.in_progress}
            </div>
            <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <CheckCircle className="w-3 h-3" /> {counts.resolved}
            </div>
          </div>
        </div>
        <Button onClick={() => setNewTicketOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 gap-1 h-8">
          <Plus className="w-3.5 h-3.5" /> Novo
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card flex-shrink-0 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${activeFilter === tab.key ? tab.color : tab.inactive}`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${activeFilter === tab.key ? "bg-card/25" : "bg-black/10"}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Contact list */}
        <div className={`flex flex-col border-r border-border bg-card ${selectedTicket ? "hidden md:flex md:w-80 lg:w-96" : "w-full md:w-80 lg:w-96"} flex-shrink-0`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <div className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center mb-3 relative">
                  <Search className="w-6 h-6 opacity-40" />
                  <X className="w-4 h-4 absolute -top-1 -right-1 opacity-40" />
                </div>
                <p className="text-sm font-medium">Não há chats no momento!</p>
              </div>
            ) : (
              filtered.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    initialStatusRef.current = ticket.status;
                    setSelectedTicket(ticket);
                    queryClient.invalidateQueries({ queryKey: ["tickets"] });
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${selectedTicket?.id === ticket.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate">{ticket.client_name || "Sem cliente"}</span>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{channelEmoji[ticket.channel]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{ticket.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          ticket.status === "open" ? "bg-red-100 text-red-700" :
                          ticket.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                          ticket.status === "resolved" || ticket.status === "closed" ? "bg-emerald-100 text-emerald-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {ticket.status === "open" ? "Aguardando" :
                           ticket.status === "in_progress" ? "Em atendimento" :
                           ticket.status === "resolved" ? "Resolvido" :
                           ticket.status === "closed" ? "Fechado" : ticket.status}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${priorityColors[ticket.priority] || "bg-muted text-muted-foreground"}`}>
                          {ticket.priority === "low" ? "Baixa" : ticket.priority === "normal" ? "Média" : ticket.priority === "high" ? "Alta" : "Crítica"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col min-w-0">
            <ChatWindow ticket={selectedTicket} onClose={() => {
              const statusChanged = initialStatusRef.current !== null && selectedTicket.status !== initialStatusRef.current;
              setSelectedTicket(null);
              initialStatusRef.current = null;
              if (statusChanged) queryClient.invalidateQueries();
            }} onUpdate={(updated) => {
              setSelectedTicket(updated);
              queryClient.invalidateQueries({ queryKey: ["tickets"] });
            }} />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground flex-col gap-3">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        )}
      </div>

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
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.description || ""}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Descreva o problema..."
              />
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