import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, LogOut, User, Clock, CheckCircle, AlertCircle, Phone, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  open: { label: "Aberto", cls: "bg-blue-100 text-blue-700", icon: AlertCircle },
  in_progress: { label: "Em Andamento", cls: "bg-amber-100 text-amber-700", icon: Clock },
  waiting: { label: "Aguardando", cls: "bg-purple-100 text-purple-700", icon: Clock },
  resolved: { label: "Resolvido", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  closed: { label: "Fechado", cls: "bg-muted text-muted-foreground", icon: CheckCircle },
};

function TicketStatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.open;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", cfg.cls)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// Tela de boas-vindas para o usuário selecionar empresa e telefone
function WelcomeScreen({ user, onStart }) {
  const [company, setCompany] = useState(user?.company || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({ company, phone });
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Central de Suporte</h1>
          <p className="text-muted-foreground mt-1 text-sm">Olá, {user?.full_name?.split(" ")[0] || "bem-vindo"}! Antes de começar, confirme seus dados.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" /> Nome da Empresa
            </Label>
            <Input
              required
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Ex: Empresa XYZ Ltda"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" /> Telefone de Contato
            </Label>
            <Input
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2">
            Entrar no Chat <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );
}

export default function UserPortal() {
  const [profile, setProfile] = useState(null); // { company, phone }
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser } = useQuery({ queryKey: ["me"], queryFn: () => db.auth.me() });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", currentUser?.email],
    queryFn: () => db.entities.Ticket.filter({ user_email: currentUser?.email }, "-created_date", 100),
    enabled: !!currentUser?.email && !!profile,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: () => db.entities.TicketMessage.filter({ ticket_id: selectedTicket?.id }, "created_date", 200),
    enabled: !!selectedTicket?.id,
    refetchInterval: 300000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: data => db.entities.TicketMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket?.id] });
      setMessage("");
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: data => db.entities.Ticket.create({
      ...data,
      user_name: currentUser?.full_name,
      user_email: currentUser?.email,
      user_phone: profile?.phone,
      client_name: profile?.client_name || profile?.company || "",
      organization_name: profile?.company,
      status: "open",
      source: "web",
      number: `#${Date.now().toString().slice(-6)}`,
    }),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.email] });
      setSelectedTicket(ticket);
      playSystemSound('new_ticket');
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
    const needsReopen = ["waiting", "resolved"].includes(selectedTicket.status);

    const updateData = {
      last_user_response_date: now,
      last_response_date: now,
    };

    if (needsReopen) {
      updateData.status = "in_progress";
      setSelectedTicket(prev => prev ? { ...prev, status: "in_progress" } : null);
    }

    await db.entities.Ticket.update(selectedTicket.id, updateData);
    queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.email] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });

    sendMutation.mutate({
      ticket_id: selectedTicket.id,
      body: message,
      sender_type: "user",
      sender_id: currentUser?.id,
      sender_name: currentUser?.full_name || currentUser?.email,
      type: "message",
      is_internal: false,
    });
  };

  const startNewChat = () => {
    createTicketMutation.mutate({
      title: `Chat - ${profile?.company || currentUser?.full_name}`,
      description: `Atendimento iniciado via portal. Empresa: ${profile?.company} | Tel: ${profile?.phone}`,
    });
  };

  if (loadingUser) {
    return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  // Show welcome screen if profile not set
  if (!profile) {
    return <WelcomeScreen user={currentUser} onStart={setProfile} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Central de Suporte</h1>
            <p className="text-xs text-muted-foreground">{profile.company} · {profile.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium hidden sm:block">{currentUser?.full_name || currentUser?.email}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} title="Sair">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: ticket list */}
        <div className={cn(
          "flex flex-col border-r border-border bg-card flex-shrink-0",
          selectedTicket ? "hidden md:flex md:w-64 lg:w-72" : "w-full md:w-64 lg:w-72"
        )}>
          <div className="p-3 border-b border-border">
            <Button
              onClick={startNewChat}
              disabled={createTicketMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 gap-2 h-9"
            >
              <MessageSquare className="w-4 h-4" />
              {createTicketMutation.isPending ? "Iniciando..." : "Novo Chat ao Vivo"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma conversa</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Chat" para iniciar</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 border-b border-border hover:bg-muted/40 transition-colors",
                    selectedTicket?.id === ticket.id && "bg-primary/8 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium line-clamp-1 flex-1">{ticket.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <TicketStatusBadge status={ticket.status} />
                    <span className="text-xs text-muted-foreground">
                      {ticket.created_date ? format(new Date(ticket.created_date), "dd/MM HH:mm", { locale: ptBR }) : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        {selectedTicket ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSelectedTicket(null)} className="md:hidden p-1 rounded-lg hover:bg-muted">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{selectedTicket.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TicketStatusBadge status={selectedTicket.status} />
                </div>
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
                  Finalizar Chat
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {messages.filter(m => !m.is_internal).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Digite uma mensagem para iniciar o atendimento</p>
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
                        <span className="text-xs text-muted-foreground">{msg.created_date ? format(new Date(msg.created_date), "HH:mm") : ""}</span>
                      </div>
                      <div className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                        msg.sender_type === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      )}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
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
                <p className="text-sm text-muted-foreground">Chat finalizado. Obrigado pelo contato!</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setSelectedTicket(null)}>
                  Voltar para conversas
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm">Selecione uma conversa ou inicie um novo chat</p>
          </div>
        )}
      </div>
    </div>
  );
}