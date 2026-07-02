import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Lock, Loader2, Ticket, Eye, EyeOff, List, MessageSquare, Send, ExternalLink, CheckCircle, Clock, XCircle
} from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";

const STATUS_CONFIG = {
  open: { label: "Aberto", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "Em Andamento", icon: MessageSquare, color: "bg-blue-100 text-blue-700" },
  waiting: { label: "Aguardando", icon: Clock, color: "bg-purple-100 text-purple-700" },
  resolved: { label: "Resolvido", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  closed: { label: "Fechado", icon: XCircle, color: "bg-gray-100 text-gray-700" },
};

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: "bg-gray-100 text-gray-600" },
  normal: { label: "Média", color: "bg-blue-100 text-blue-600" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-600" },
  emergency: { label: "Crítica", color: "bg-red-100 text-red-600" },
};

export default function ClientPortalPage() {
  const [currentPage, setCurrentPage] = useState("tickets");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemName, setSystemName] = useState("FlowDesk");
  const [logoUrl, setLogoUrl] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "normal" });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('*');
        if (data) {
          const map = {};
          data.forEach(s => { map[s.key] = s.value; });
          if (map.helpdesk_name) setSystemName(map.helpdesk_name);
          if (map.helpdesk_logo) setLogoUrl(map.helpdesk_logo);
        }
      } catch {}
    };
    loadSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profileData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
        setCurrentUser(session.user);
        setProfile(profileData);
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: ticketsData = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["portal-tickets", currentUser?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tickets')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_date', { ascending: false });
      return data || [];
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  useEffect(() => { setTickets(ticketsData); }, [ticketsData]);
  useEffect(() => { setLoading(loadingTickets); }, [loadingTickets]);

  const { data: messagesData = [] } = useQuery({
    queryKey: ["portal-messages", selectedTicket?.id],
    queryFn: async () => {
      const { data } = await supabase.from('ticket_messages')
        .select('id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments, is_highlighted, edited_at')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!selectedTicket,
    refetchInterval: 10000,
  });

  useEffect(() => { setMessages(messagesData); }, [messagesData]);

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return !["resolved", "closed"].includes(t.status);
    if (statusFilter === "resolved") return t.status === "resolved";
    if (statusFilter === "closed") return t.status === "closed";
    return true;
  });

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('tickets').insert({
        ...form,
        user_id: currentUser.id,
        user_name: profile?.full_name || profile?.email,
        user_email: profile?.email,
        client_name: profile?.client_name || "",
        status: "open",
        source: "portal",
        number: `#${Date.now().toString().slice(-6)}`,
      }).select().single();
      if (error) throw error;
      setTickets(prev => [data, ...prev]);
      setNewTicketOpen(false);
      setForm({ title: "", description: "", priority: "normal" });
      setSelectedTicket(data);
      toast({ title: "Ticket criado!", description: `Ticket ${data.number} criado com sucesso.` });
    } catch (e) {
      toast({ title: "Erro", description: e.message || "Não foi possível criar o ticket.", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        sender_type: "user",
        sender_name: profile?.full_name || profile?.email,
        sender_id: currentUser.id,
        body: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage("");
      const { data } = await supabase.from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_date', { ascending: true });
      setMessages(data || []);
    } catch (e) {
      toast({ title: "Erro", description: e.message || "Não foi possível enviar a mensagem.", variant: "destructive" });
    }
  };

  const canReopen = (ticket) => !["resolved", "closed"].includes(ticket.status);

  if (!currentUser) {
    return <LoginPageInline onLogin={(user, profile) => { setCurrentUser(user); setProfile(profile); }} systemName={systemName} logoUrl={logoUrl} />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-zinc-950">
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-60 bg-white dark:bg-zinc-900 border-r border-border z-40 flex flex-col transition-transform`}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={systemName} className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold">{systemName}</h1>
            <p className="text-[10px] text-muted-foreground">Portal do Cliente</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <button onClick={() => { setCurrentPage("tickets"); setSelectedTicket(null); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${currentPage === "tickets" && !selectedTicket ? "bg-primary/10 text-primary font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
            <Ticket className="w-4 h-4" /> Abrir Tickets
          </button>
          <button onClick={() => { setCurrentPage("list"); setSelectedTicket(null); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${currentPage === "list" ? "bg-primary/10 text-primary font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
            <List className="w-4 h-4" /> Visualizar Tickets
          </button>
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={() => supabase.auth.signOut().then(() => { setCurrentUser(null); setProfile(null); })} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white dark:bg-zinc-900 border-b border-border h-14 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(p => !p)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <span className="text-xl">☰</span>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{format(new Date(), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">
                {(profile?.full_name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{profile?.full_name || profile?.email}</p>
              <p className="text-xs text-muted-foreground">Cliente</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {currentPage === "tickets" && !selectedTicket && (
            <NewTicketForm form={form} setForm={setForm} onSubmit={handleCreateTicket} />
          )}
          {currentPage === "list" && !selectedTicket && (
            <TicketListPanel tickets={filteredTickets} loading={loading} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSelect={setSelectedTicket} canReopen={canReopen} />
          )}
          {selectedTicket && (
            <ChatPanel ticket={selectedTicket} messages={messages} newMessage={newMessage} setNewMessage={setNewMessage} onSend={handleSendMessage} onBack={() => setSelectedTicket(null)} profile={profile} currentUser={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
}

function format(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function Avatar({ children, className }) {
  return <div className={className}>{children}</div>;
}

function AvatarFallback({ children, className }) {
  return <div className={className}>{children}</div>;
}

function LoginPageInline({ onLogin, systemName, logoUrl }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profileData } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      onLogin(data.user, profileData);
    } catch (err) {
      toast({ title: "Erro", description: err.message || "Credenciais inválidas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-border p-8">
        <div className="text-center mb-6">
          {logoUrl ? (
            <img src={logoUrl} alt={systemName} className="w-16 h-16 mx-auto mb-3 rounded-lg object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold">{systemName}</h1>
          <p className="text-sm text-muted-foreground">Portal do Cliente</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="pl-9" />
              <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</> : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function NewTicketForm({ form, setForm, onSubmit }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" /> Abrir Novo Ticket
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Descreva brevemente o problema" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes adicionais..." className="min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="emergency">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Enviar Ticket</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function TicketListPanel({ tickets, loading, statusFilter, setStatusFilter, onSelect, canReopen }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><List className="w-5 h-5 text-primary" /> Meus Tickets</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="closed">Fechados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : tickets.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum ticket encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => {
            const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
            const pr = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.normal;
            return (
              <Card key={t.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => onSelect(t)}>
                <div className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">#{t.number || t.id?.slice(0, 8)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pr.color}`}>{pr.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{format(t.created_date)}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChatPanel({ ticket, messages, newMessage, setNewMessage, onSend, onBack, profile, currentUser }) {
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const st = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const canChat = !["resolved", "closed"].includes(ticket.status);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">#{ticket.number || ticket.id?.slice(0, 8)}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm font-medium">{ticket.title}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-white dark:bg-zinc-900 p-4 space-y-3 mb-4">
        {messages.map(m => (
          <MessageBubble key={m.id} msg={m} isOwn={m.sender_id === currentUser?.id} currentUser={{ id: currentUser?.id }} ticketId={ticket.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {canChat ? (
        <div className="flex gap-2">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." onKeyDown={e => e.key === "Enter" && onSend()} className="flex-1" />
          <Button onClick={onSend} disabled={!newMessage.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-2">Este ticket foi {st.label.toLowerCase()}. Não é possível enviar mensagens.</p>
      )}
    </div>
  );
}
