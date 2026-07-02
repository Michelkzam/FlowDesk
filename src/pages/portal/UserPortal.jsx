import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';

import React, { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, LogOut, User, Clock, CheckCircle, AlertCircle, Phone, Building2, ArrowRight, Mail, Lock, Loader2, Eye, EyeOff, Paperclip, Inbox, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/MessageBubble";

function parseAttachments(msg) {
  const inlineAttachments = [];
  let bodyText = msg.body || "";

  if (msg.attachments) {
    try {
      const atts = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;
      if (Array.isArray(atts)) {
        atts.forEach(a => inlineAttachments.push(a));
      }
    } catch {}
  }

  const ATTACHMENT_LINE = /^📎\s*(.+?):\s*(https?:\/\/\S+)$/i;
  const lines = bodyText.split("\n");
  const textLines = [];

  for (const line of lines) {
    const match = line.match(ATTACHMENT_LINE);
    if (match) {
      const name = match[1].trim();
      const url = match[2].trim();
      const alreadyHas = inlineAttachments.some(a => a.url === url || a.name === name);
      if (!alreadyHas) {
        inlineAttachments.push({ name, url });
      }
    } else {
      textLines.push(line);
    }
  }

  return { text: textLines.join("\n").trim(), attachments: inlineAttachments };
}

function MessageBody({ body, attachments }) {
  const allAttachments = attachments || [];
  if (!body && allAttachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {body && <p className="whitespace-pre-wrap">{body}</p>}
      {allAttachments.map((att, i) => {
        const ext = att.name?.split(".").pop()?.toLowerCase() || "";
        const isImage = att.type?.startsWith("image/") || ["png","jpg","jpeg","gif","webp"].includes(ext);
        const isVideo = att.type?.startsWith("video/") || ["mp4","webm"].includes(ext);
        const isAudio = att.type?.startsWith("audio/") || att.isAudio || ["mp3","wav","ogg"].includes(ext) || att.name?.startsWith("audio_");
        if (isImage) return <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="max-w-[280px] max-h-[220px] rounded-lg object-cover" /></a>;
        if (isVideo) return <video key={i} controls src={att.url} className="max-w-[280px] max-h-[220px] rounded-lg" />;
        if (isAudio) return <div key={i} className="bg-muted rounded-lg p-2"><audio controls src={att.url} className="w-full h-10" preload="metadata" /></div>;
        return <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-xs"><Paperclip className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{att.name}</span></a>;
      })}
    </div>
  );
}

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

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: profileData } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      onLogin(data.user, profileData);
    } catch (err) {
      setError(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Central de Suporte</h1>
          <p className="text-muted-foreground mt-1 text-sm">Faça login para acessar o suporte</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          {error && <div className="text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm">{error}</div>}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Email</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Senha</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>
      </div>
    </div>
  );
}

function WelcomeScreen({ user, onStart }) {
  const [company, setCompany] = useState(user?.company || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const handleSubmit = (e) => { e.preventDefault(); onStart({ company, phone }); };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Central de Suporte</h1>
          <p className="text-muted-foreground mt-1 text-sm">Olá, {user?.full_name?.split(" ")[0] || "bem-vindo"}! Confirme seus dados.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /> Nome da Empresa</Label>
            <Input required value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex: Empresa XYZ Ltda" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> Telefone de Contato</Label>
            <Input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 gap-2">Entrar no Chat <ArrowRight className="w-4 h-4" /></Button>
        </form>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );
}

export default function UserPortal() {
  const [profile, setProfile] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: () => db.auth.me(),
    retry: false,
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", currentUser?.email],
    queryFn: () => db.entities.Ticket.filter({ user_email: currentUser?.email }, "-created_date", 100),
    enabled: !!currentUser?.email && !!profile,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments, is_highlighted, edited_at")
        .eq("ticket_id", selectedTicket?.id);
      if (error) return [];
      return (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    enabled: !!selectedTicket?.id,
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      let bodyText = data.body || "";
      const atts = data.attachments || [];

      if (atts.length > 0) {
        const attLines = atts.map(a => `📎 ${a.name}: ${a.url}`).join("\n");
        bodyText = bodyText ? bodyText + "\n" + attLines : attLines;
      }

      const insertData = {
        ticket_id: data.ticket_id,
        body: bodyText,
        sender_type: "user",
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        type: "message",
        is_internal: false,
      };

      if (atts.length > 0) {
        insertData.attachments = JSON.stringify(atts);
      }

      let { error } = await supabase.from("ticket_messages").insert(insertData);

      if (error && error.message?.includes("attachments")) {
        delete insertData.attachments;
        ({ error } = await supabase.from("ticket_messages").insert(insertData));
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket?.id] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: data => db.entities.Ticket.create({
      ...data,
      user_name: currentUser?.full_name,
      user_email: currentUser?.email,
      user_phone: profile?.phone,
      client_name: profile?.client_name || profile?.company || "",
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

  const handleSend = async (text, attachments) => {
    const msgText = text || "";
    if ((!msgText.trim() && (!attachments || attachments.length === 0)) || !selectedTicket) return;

    const now = new Date().toISOString();
    const needsReopen = ["waiting", "resolved"].includes(selectedTicket.status);
    const updateData = { last_user_response_date: now, last_response_date: now };
    if (needsReopen) {
      updateData.status = "in_progress";
      setSelectedTicket(prev => prev ? { ...prev, status: "in_progress" } : null);
    }

    await db.entities.Ticket.update(selectedTicket.id, updateData);
    queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.email] });
    queryClient.invalidateQueries({ queryKey: ["tickets"] });

    sendMutation.mutate({
      ticket_id: selectedTicket.id,
      body: msgText,
      sender_id: currentUser?.id,
      sender_name: currentUser?.full_name || currentUser?.email,
      attachments: attachments || [],
    });
  };

  const statusCounts = React.useMemo(() => {
    const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    tickets.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return counts;
  }, [tickets]);

  const filteredTickets = statusFilter
    ? tickets.filter(t => t.status === statusFilter)
    : tickets;

  const startNewChat = () => {
    createTicketMutation.mutate({
      title: `Chat - ${profile?.company || currentUser?.full_name}`,
      description: `Atendimento iniciado via portal. Empresa: ${profile?.company} | Tel: ${profile?.phone}`,
    });
  };

  if (loadingUser) return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!currentUser) return <LoginScreen onLogin={() => refetch()} />;
  if (!profile) return <WelcomeScreen user={currentUser} onStart={setProfile} />;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><MessageSquare className="w-4 h-4 text-white" /></div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Central de Suporte</h1>
            <p className="text-xs text-muted-foreground">{profile.company} · {profile.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center"><User className="w-3.5 h-3.5 text-primary" /></div>
            <span className="text-sm font-medium hidden sm:block">{currentUser?.full_name || currentUser?.email}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} title="Sair"><LogOut className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className={cn("flex flex-col border-r border-border bg-card flex-shrink-0", selectedTicket ? "hidden md:flex md:w-64 lg:w-72" : "w-full md:w-64 lg:w-72")}>
          <div className="p-3 border-b border-border space-y-3">
            <Button onClick={startNewChat} disabled={createTicketMutation.isPending} className="w-full bg-primary hover:bg-primary/90 gap-2 h-9">
              <MessageSquare className="w-4 h-4" />{createTicketMutation.isPending ? "Iniciando..." : "Novo Chat ao Vivo"}
            </Button>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setStatusFilter(null)} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", !statusFilter ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <Inbox className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-primary text-primary-foreground">{tickets.length}</span>
                </div>
                <span className="text-[10px] font-medium">Total</span>
              </button>
              <button onClick={() => setStatusFilter("open")} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", statusFilter === "open" ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <Headphones className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-yellow-500 text-white">{statusCounts.open + statusCounts.in_progress}</span>
                </div>
                <span className="text-[10px] font-medium">Abertos</span>
              </button>
              <button onClick={() => setStatusFilter("resolved")} className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all", statusFilter === "resolved" ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <CheckCircle className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-emerald-500 text-white">{statusCounts.resolved + statusCounts.closed}</span>
                </div>
                <span className="text-[10px] font-medium">Resolvidos</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? <div className="p-3 space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma conversa</p>
                <p className="text-xs text-muted-foreground mt-1">{statusFilter ? "Nenhum ticket neste status" : "Clique em \"Novo Chat\" para iniciar"}</p>
              </div>
            ) : filteredTickets.map(ticket => (
              <button key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={cn("w-full text-left px-4 py-3.5 border-b border-border hover:bg-muted/40 transition-colors", selectedTicket?.id === ticket.id && "bg-primary/8 border-l-2 border-l-primary")}>
                <div className="flex items-start justify-between gap-2 mb-1"><span className="text-sm font-medium line-clamp-1 flex-1">{ticket.title}</span></div>
                <div className="flex items-center justify-between">
                  <TicketStatusBadge status={ticket.status} />
                  <span className="text-xs text-muted-foreground">{ticket.created_date ? format(new Date(ticket.created_date), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedTicket ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setSelectedTicket(null)} className="md:hidden p-1 rounded-lg hover:bg-muted"><ArrowRight className="w-5 h-5 rotate-180" /></button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{selectedTicket.title}</p>
                <div className="flex items-center gap-2 mt-0.5"><TicketStatusBadge status={selectedTicket.status} /></div>
              </div>
              {!["resolved", "closed"].includes(selectedTicket.status) && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={() => closeTicketMutation.mutate(selectedTicket.id)} disabled={closeTicketMutation.isPending}>
                  <CheckCircle className="w-3.5 h-3.5" /> Finalizar Chat
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {messages.filter(m => !m.is_internal).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">Digite uma mensagem para iniciar o atendimento</p>
                </div>
              ) : messages.filter(m => !m.is_internal).map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === currentUser?.id} currentUser={{ id: currentUser?.id }} ticketId={selectedTicket.id} />
                ))}
              <div ref={messagesEndRef} />
            </div>

            {!["resolved", "closed"].includes(selectedTicket.status) ? (
              <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
            ) : (
              <div className="border-t border-border p-4 bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground">Chat finalizado. Obrigado pelo contato!</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setSelectedTicket(null)}>Voltar para conversas</Button>
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