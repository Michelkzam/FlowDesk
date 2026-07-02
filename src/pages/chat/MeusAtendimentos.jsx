import { db } from '@/api/flowdeskClient';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

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
import { Clock, Headphones, CheckCircle, User, Phone, MessageSquare, Plus, Search, ArrowLeft, Send } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

const ATTACHMENT_LINE = /^📎\s*(.+?):\s*(https?:\/\/\S+)$/i;

function guessType(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "image/";
  if (["mp4","webm","avi","mov"].includes(ext)) return "video/";
  if (["mp3","wav","ogg","m4a"].includes(ext) || name.startsWith("audio_")) return "audio/";
  return "other";
}

function parseBody(msg) {
  const inlineAttachments = [];
  let bodyText = msg.body || "";
  if (msg.attachments) {
    try {
      const atts = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;
      if (Array.isArray(atts)) {
        atts.forEach(a => {
          const t = guessType(a.name || a.url?.split("/").pop() || "");
          inlineAttachments.push({ name: a.name || a.url?.split("/").pop() || "arquivo", url: a.url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" || a.isAudio });
        });
      }
    } catch {}
  }
  const lines = bodyText.split("\n");
  const textLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(ATTACHMENT_LINE);
    if (match) {
      const name = match[1].trim();
      const url = match[2].trim();
      if (!inlineAttachments.some(a => a.url === url || a.name === name)) {
        const t = guessType(name);
        inlineAttachments.push({ name, url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" });
      }
    } else if (trimmed.match(/^https?:\/\/\S+$/) && !trimmed.includes(" ") && trimmed.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mp3|wav|ogg|pdf|doc|docx)/i)) {
      const url = trimmed;
      if (!inlineAttachments.some(a => a.url === url)) {
        const fileName = url.split("/").pop().split("?")[0] || "arquivo";
        const t = guessType(fileName);
        inlineAttachments.push({ name: fileName, url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" });
      }
    } else {
      textLines.push(line);
    }
  }
  return { text: textLines.join("\n").trim(), attachments: inlineAttachments };
}

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

      {ticket.agent_name && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Headphones className="w-3 h-3" />
          <span className="truncate">{ticket.agent_name}</span>
        </div>
      )}

      {ticket.user_phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <Phone className="w-3 h-3" />
          <span>{ticket.user_phone}</span>
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
  const [activeFilter, setActiveFilter] = useState("open");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 200),
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["chat-messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments, is_highlighted, edited_at")
        .eq("ticket_id", selectedTicket.id);
      if (error) return [];
      return (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    enabled: !!selectedTicket?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (body) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: userProfile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { error: msgError } = await supabase.from("ticket_messages").insert({
        ticket_id: selectedTicket.id,
        sender_type: "agent",
        sender_id: user.id,
        sender_name: userProfile?.full_name || user.email || "Operador",
        body,
        type: "message",
      });
      if (msgError) throw msgError;

      if (!selectedTicket.agent_id || selectedTicket.agent_id !== user.id) {
        const { error: updateError } = await supabase
          .from("tickets")
          .update({
            agent_id: user.id,
            agent_name: userProfile?.full_name || user.email,
            status: selectedTicket.status === "open" ? "in_progress" : selectedTicket.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedTicket.id);
        if (updateError) console.error("[MeusAtendimentos] Erro ao atribuir ticket:", updateError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setMessage("");
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message.trim());
  };

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Ticket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setNewTicketOpen(false);
      setFormData({ title: "", priority: "normal", status: "open", channel: "portal" });
      playSystemSound('new_ticket');
    },
  });

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const byStatus = (status) => {
    const searchFiltered = tickets.filter(t =>
      !search ||
      (t.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.user_phone || "").toLowerCase().includes(search.toLowerCase())
    );
    if (status === "resolved") {
      return searchFiltered.filter(t => {
        if (t.status !== "resolved" && t.status !== "closed") return false;
        const closedDate = t.closed_date ? new Date(t.closed_date) : null;
        if (closedDate && closedDate > todayEnd) return false;
        return true;
      });
    }
    return searchFiltered.filter(t => t.status === status);
  };

  const visibleColumns = columns.filter(c => {
    if (activeFilter === "open") return c.key === "open";
    if (activeFilter === "in_progress") return c.key === "in_progress";
    if (activeFilter === "waiting") return c.key === "waiting";
    if (activeFilter === "resolved") return c.key === "resolved";
    return true;
  });

  if (selectedTicket) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] border border-border rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-card flex-shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">{selectedTicket.number}</span>
                <span className="font-semibold text-sm truncate">{selectedTicket.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${
                  selectedTicket.status === "open" ? "bg-red-100 text-red-700 border-red-200" :
                  selectedTicket.status === "in_progress" ? "bg-amber-100 text-amber-700 border-amber-200" :
                  "bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}>
                  {selectedTicket.status === "open" ? "Aguardando" :
                   selectedTicket.status === "in_progress" ? "Em Atendimento" :
                   selectedTicket.status === "resolved" ? "Resolvido" : "Fechado"}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${
                  selectedTicket.priority === "emergency" ? "bg-red-100 text-red-700 border-red-200" :
                  selectedTicket.priority === "high" ? "bg-orange-100 text-orange-700 border-orange-200" :
                  selectedTicket.priority === "normal" ? "bg-blue-100 text-blue-700 border-blue-200" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {selectedTicket.priority === "emergency" ? "Emergência" :
                   selectedTicket.priority === "high" ? "Alta" :
                   selectedTicket.priority === "normal" ? "Normal" : "Baixa"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>👤 {selectedTicket.user_name || selectedTicket.client_name || "—"}</span>
            {selectedTicket.organization_name && <span>🏢 {selectedTicket.organization_name}</span>}
            {selectedTicket.client_name && selectedTicket.user_name !== selectedTicket.client_name && <span>👤 {selectedTicket.client_name}</span>}
            <span>🕐 {format(new Date(selectedTicket.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
          </div>
        </div>

{/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedTicket.description && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  {selectedTicket.client_name || "Cliente"} • {format(new Date(selectedTicket.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {loadingMessages ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 && !selectedTicket.description ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Inicie a conversa!</p>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_type === "agent"} currentUser={currentUser} ticketId={selectedTicket.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
          {["resolved", "closed"].includes(selectedTicket.status) ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              Este atendimento foi finalizado
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-9"
              />
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 h-9 px-3" disabled={!message.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
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
          { key: "open", icon: Clock, label: "Aguardando", cls: "bg-blue-500 text-white", inactive: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
          { key: "in_progress", icon: Headphones, label: "Em Atendimento", cls: "bg-yellow-500 text-white", inactive: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
          { key: "waiting", icon: Clock, label: "Na Espera", cls: "bg-purple-500 text-white", inactive: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
          { key: "resolved", icon: CheckCircle, label: "Atendidos Hoje", cls: "bg-emerald-500 text-white", inactive: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
        ].map(f => {
          const Icon = f.icon;
          const count = f.key === "all" ? tickets.length :
            f.key === "resolved" ? tickets.filter(t => t.status === "resolved" || t.status === "closed").length :
            tickets.filter(t => t.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              title={f.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeFilter === f.key ? f.cls : f.inactive}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
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