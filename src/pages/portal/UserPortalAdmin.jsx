import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Plus, Clock, CheckCircle, AlertCircle, ArrowRight, Ticket, User, Headphones, CircleDot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig = {
  open: { label: "Aberto", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: AlertCircle },
  in_progress: { label: "Em Andamento", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  waiting: { label: "Aguardando", cls: "bg-purple-100 text-purple-700 border-purple-200", icon: Clock },
  pending_approval: { label: "Aguard. Aprovação", cls: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock },
  resolved: { label: "Resolvido", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  closed: { label: "Fechado", cls: "bg-muted text-muted-foreground border-border", icon: CheckCircle },
};

const priorityConfig = {
  low: { label: "Baixa", cls: "bg-muted text-muted-foreground" },
  normal: { label: "Média", cls: "bg-blue-100 text-blue-700" },
  high: { label: "Alta", cls: "bg-amber-100 text-amber-700" },
  emergency: { label: "Crítica", cls: "bg-red-100 text-red-700" },
};

function TicketStatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.open;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border", cfg.cls)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const cfg = priorityConfig[priority] || priorityConfig.normal;
  return (
    <span className={cn("inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

export default function UserPortalAdmin() {
  const { user: currentUser, profile } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: "", description: "", priority: "normal" });
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", currentUser?.email],
    queryFn: () => db.entities.Ticket.filter({ user_email: currentUser?.email }, "-created_date", 100),
    enabled: !!currentUser?.email,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: () => db.entities.TicketMessage.filter({ ticket_id: selectedTicket?.id }, "created_date", 200),
    enabled: !!selectedTicket?.id,
  });

  // Realtime: escutar novas mensagens do ticket selecionado
  useEffect(() => {
    if (!selectedTicket?.id) return;

    const channel = supabase
      .channel(`ticket-messages-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${selectedTicket.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket?.id, queryClient]);

  // Realtime: escutar mudanças de status dos tickets
  useEffect(() => {
    if (!currentUser?.email) return;

    const channel = supabase
      .channel("my-tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `user_email=eq.${currentUser.email}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser.email] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.email, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Ticket.create({
      ...data,
      user_name: profile?.full_name || currentUser?.email,
      user_email: currentUser?.email,
      user_phone: profile?.phone || "",
      client_name: profile?.client_name || "",
      status: "open",
      source: "web",
      number: `#${Date.now().toString().slice(-6)}`,
    }),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.email] });
      setNewTicketOpen(false);
      setTicketForm({ title: "", description: "", priority: "normal" });
      setSelectedTicket(ticket);
      playSystemSound('new_ticket');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data) => db.entities.TicketMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket?.id] });
      setMessage("");
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: (ticketId) => db.entities.Ticket.update(ticketId, { status: "closed", closed_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.email] });
      setSelectedTicket(prev => prev ? { ...prev, status: "closed" } : null);
    },
  });

  const handleSend = async () => {
    if (!message.trim() || !selectedTicket) return;

    const now = new Date().toISOString();
    const needsReopen = ["waiting", "resolved", "closed"].includes(selectedTicket.status);

    if (needsReopen) {
      await db.entities.Ticket.update(selectedTicket.id, {
        status: "in_progress",
        last_user_response_date: now,
        last_response_date: now,
      });
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.email] });
      setSelectedTicket(prev => prev ? { ...prev, status: "in_progress" } : null);
    } else {
      await db.entities.Ticket.update(selectedTicket.id, {
        last_user_response_date: now,
        last_response_date: now,
      });
    }

    sendMutation.mutate({
      ticket_id: selectedTicket.id,
      body: message,
      sender_type: "user",
      sender_id: currentUser?.id,
      sender_name: profile?.full_name || currentUser?.email,
      type: "message",
      is_internal: false,
    });
  };

  const handleCreateTicket = () => {
    if (!ticketForm.title.trim()) return;
    createMutation.mutate(ticketForm);
  };

  const counts = {
    total: tickets.length,
    open: tickets.filter(t => ["open", "in_progress", "waiting"].includes(t.status)).length,
    resolved: tickets.filter(t => ["resolved", "closed"].includes(t.status)).length,
  };

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5" /> Portal do Usuário
          </h1>
          <p className="text-sm text-muted-foreground">Abra tickets e acompanhe seus atendimentos</p>
        </div>
        <Button onClick={() => setNewTicketOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Ticket
        </Button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar: tickets do usuário */}
        <div className={cn(
          "flex flex-col border border-border rounded-xl bg-card flex-shrink-0 overflow-hidden",
          selectedTicket ? "hidden md:flex md:w-80" : "w-full md:w-80"
        )}>
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-background">{counts.total} total</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{counts.open} abertos</Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{counts.resolved} resolvidos</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                <Ticket className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum ticket</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Ticket" para começar</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border hover:bg-muted/40 transition-colors",
                    selectedTicket?.id === ticket.id && "bg-primary/8 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">{ticket.number}</span>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  <p className="text-sm font-medium line-clamp-1">{ticket.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <PriorityBadge priority={ticket.priority} />
                    <span className="text-xs text-muted-foreground">
                      {ticket.created_date ? format(new Date(ticket.created_date), "dd/MM HH:mm") : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área de chat/detalhes */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col border border-border rounded-xl bg-card min-w-0 overflow-hidden">
            {/* Header do ticket */}
            <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSelectedTicket(null)} className="md:hidden p-1 rounded-lg hover:bg-muted">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{selectedTicket.number}</span>
                  <TicketStatusBadge status={selectedTicket.status} />
                  <PriorityBadge priority={selectedTicket.priority} />
                </div>
                <p className="text-sm font-semibold truncate mt-0.5">{selectedTicket.title}</p>
              </div>
              {!["resolved", "closed"].includes(selectedTicket.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => closeTicketMutation.mutate(selectedTicket.id)}
                  disabled={closeTicketMutation.isPending}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Finalizar
                </Button>
              )}
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : messages.filter(m => !m.is_internal).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para iniciar o atendimento</p>
                </div>
              ) : (
                messages.filter(m => !m.is_internal).map(msg => (
                  <div key={msg.id} className={cn("flex gap-2.5", msg.sender_type === "user" ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      msg.sender_type === "user" ? "bg-primary/20 text-primary" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {(msg.sender_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className={cn("max-w-[78%] flex flex-col gap-1", msg.sender_type === "user" ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{msg.sender_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {msg.created_date ? format(new Date(msg.created_date), "HH:mm") : ""}
                        </span>
                      </div>
                      <div className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                        msg.sender_type === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      )}>
                        {msg.body || msg.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            {!["resolved", "closed"].includes(selectedTicket.status) ? (
              <div className="border-t border-border p-3 bg-card flex gap-2 items-end">
                <textarea
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[42px] max-h-32"
                  placeholder="Digite sua mensagem..."
                  value={message}
                  rows={1}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}
                  className="bg-primary hover:bg-primary/90 shrink-0 h-10 w-10 p-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-t border-border p-4 bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">Este ticket foi finalizado.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setSelectedTicket(null)}>
                  Voltar para tickets
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3 border border-border rounded-xl bg-card">
            <Ticket className="w-12 h-12 opacity-20" />
            <p className="text-sm">Selecione um ticket ou crie um novo</p>
          </div>
        )}
      </div>

      {/* Dialog: Novo Ticket */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Novo Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Assunto *</Label>
              <Input
                value={ticketForm.title}
                onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Descreva brevemente o problema"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={ticketForm.description}
                onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Detalhes do problema..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={ticketForm.priority} onValueChange={v => setTicketForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="emergency">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTicket} disabled={!ticketForm.title.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
