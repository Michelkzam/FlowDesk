import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle, ArrowRight, Ticket, Paperclip, Inbox, Headphones } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/MessageBubble";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function guessType(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png","jpg","jpeg","gif","webp","svg"].includes(ext)) return "image/" + (ext === "jpg" ? "jpeg" : ext);
  if (["mp4","webm","avi","mov"].includes(ext)) return "video/" + ext;
  if (["mp3","wav","ogg","m4a"].includes(ext) || name.startsWith("audio_")) return "audio/webm";
  if (["pdf"].includes(ext)) return "application/pdf";
  if (["doc","docx"].includes(ext)) return "application/msword";
  if (["xls","xlsx"].includes(ext)) return "application/vnd.ms-excel";
  return "application/octet-stream";
}

function parseAttachments(msg) {
  const inlineAttachments = [];
  let bodyText = msg.body || "";

  if (msg.attachments) {
    try {
      const atts = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;
      if (Array.isArray(atts)) {
        atts.forEach(a => {
          const t = a.type || guessType(a.name || "");
          const ext = (a.name || "").split(".").pop()?.toLowerCase() || "";
          inlineAttachments.push({
            name: a.name || a.url?.split("/").pop() || "arquivo",
            url: a.url,
            type: t,
            isImage: t.startsWith("image/") || ["png","jpg","jpeg","gif","webp"].includes(ext),
            isVideo: t.startsWith("video/") || ["mp4","webm"].includes(ext),
            isAudio: t.startsWith("audio/") || a.isAudio || ["mp3","wav","ogg"].includes(ext) || (a.name || "").startsWith("audio_"),
          });
        });
      }
    } catch {}
  }

  const ATTACHMENT_LINE = /^📎\s*(.+?):\s*(https?:\/\/\S+)$/i;
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
        const ext = name.split(".").pop()?.toLowerCase() || "";
        inlineAttachments.push({
          name, url, type: t,
          isImage: t.startsWith("image/") || ["png","jpg","jpeg","gif","webp"].includes(ext),
          isVideo: t.startsWith("video/") || ["mp4","webm"].includes(ext),
          isAudio: t.startsWith("audio/") || ["mp3","wav","ogg"].includes(ext) || name.startsWith("audio_"),
        });
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
        if (att.isImage) return <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="max-w-[280px] max-h-[220px] rounded-lg object-cover" /></a>;
        if (att.isVideo) return <video key={i} controls src={att.url} className="max-w-[280px] max-h-[220px] rounded-lg" />;
        if (att.isAudio) return <div key={i} className="bg-muted rounded-lg p-2"><audio controls src={att.url} className="w-full h-10" preload="metadata" /></div>;
        return <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-xs"><Paperclip className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{att.name}</span></a>;
      })}
    </div>
  );
}

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
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: "", description: "", priority: "normal" });
  const [message, setMessage] = useState("");
  const [systemName, setSystemName] = useState("FlowDesk");
  const [logoUrl, setLogoUrl] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadSettings = async () => {
      const savedLogo = localStorage.getItem("appLogo");
      if (savedLogo) setLogoUrl(savedLogo);
      const savedName = localStorage.getItem("appName");
      if (savedName) {
        setSystemName(savedName);
      }
      try {
        const { data, error } = await supabase.from('system_settings').select('key, value');
        if (error) {
          console.error("[UserPortalAdmin] Error loading settings:", error);
          return;
        }
        if (data && data.length > 0) {
          const map = {};
          data.forEach(s => { map[s.key] = s.value; });
          if (map.helpdesk_name) {
            setSystemName(map.helpdesk_name);
            localStorage.setItem("appName", map.helpdesk_name);
          }
          if (map.helpdesk_logo) {
            setLogoUrl(map.helpdesk_logo);
            localStorage.setItem("appLogo", map.helpdesk_logo);
          }
        }
      } catch (e) {
        console.error("[UserPortalAdmin] Exception loading settings:", e);
      }
    };
    loadSettings();
  }, []);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", currentUser?.id, profile?.role],
    queryFn: async () => {
      let query = supabase.from("tickets").select("*");
      if (profile?.role === "admin") {
        // Admin vê todos
      } else if (profile?.role === "agent") {
        query = query.eq("agent_id", currentUser.id);
      } else {
        query = query.eq("user_id", currentUser.id);
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments, is_highlighted, edited_at")
        .eq("ticket_id", selectedTicket.id);
      if (error) {
        console.error("[UserPortalMessages]", error);
        return [];
      }
      return (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
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
    if (!currentUser?.id) return;

    const channel = supabase
      .channel("my-tickets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `user_id=eq.${currentUser.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const ticketData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        user_id: currentUser?.id,
        user_name: profile?.full_name || currentUser?.email,
        user_email: currentUser?.email,
        user_phone: profile?.phone || "",
        status: "open",
        source: "web",
        number: `#${Date.now().toString().slice(-6)}`,
      };
      const { data: result, error } = await supabase
        .from("tickets")
        .insert(ticketData)
        .select()
        .single();
      if (error) {
        console.error("[TicketCreate]", error);
        throw new Error(error.message || "Erro ao criar ticket");
      }
      return result;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.id] });
      setNewTicketOpen(false);
      setTicketForm({ title: "", description: "", priority: "normal" });
      setSelectedTicket(ticket);
      playSystemSound('new_ticket');
    },
    onError: (err) => {
      toast({ title: "Erro ao criar ticket", description: err.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from("ticket_messages")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket?.id] });
      setMessage("");
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "closed", closed_date: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.id] });
      setSelectedTicket(prev => prev ? { ...prev, status: "closed" } : null);
    },
  });

  const handleSend = async (text, msgAttachments) => {
    const msgText = text || message;
    if ((!msgText.trim() && (!msgAttachments || msgAttachments.length === 0)) || !selectedTicket) return;

    const now = new Date().toISOString();
    const needsReopen = ["waiting", "resolved", "closed"].includes(selectedTicket.status);

    if (needsReopen) {
      await supabase.from("tickets").update({
        status: "in_progress",
        last_user_response_date: now,
        last_response_date: now,
      }).eq("id", selectedTicket.id);
      queryClient.invalidateQueries({ queryKey: ["my-tickets", currentUser?.id] });
      setSelectedTicket(prev => prev ? { ...prev, status: "in_progress" } : null);
    } else {
      await supabase.from("tickets").update({
        last_user_response_date: now,
        last_response_date: now,
      }).eq("id", selectedTicket.id);
    }

    let bodyText = msgText || "";
    const atts = msgAttachments || [];

    if (atts.length > 0) {
      const attLines = atts.map(a => `📎 ${a.name}: ${a.url}`).join("\n");
      bodyText = bodyText ? bodyText + "\n" + attLines : attLines;
    }

    const insertData = {
      ticket_id: selectedTicket.id,
      body: bodyText,
      sender_type: "user",
      sender_id: currentUser?.id,
      sender_name: profile?.full_name || currentUser?.email,
      type: "message",
      is_internal: false,
    };

    if (atts.length > 0) {
      insertData.attachments = JSON.stringify(atts);
    }

    let { error: msgError } = await supabase.from("ticket_messages").insert(insertData);

    if (msgError && msgError.message?.includes("attachments")) {
      delete insertData.attachments;
      ({ error: msgError } = await supabase.from("ticket_messages").insert(insertData));
    }

    if (msgError) {
      console.error("[UserPortal INSERT]", JSON.stringify(msgError));
      toast({ title: "Erro", description: "Falha ao enviar mensagem.", variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicket.id] });
    setMessage("");
  };

  const handleCreateTicket = () => {
    if (!ticketForm.title.trim()) return;
    createMutation.mutate(ticketForm);
  };

  const counts = {
    total: tickets.length,
    open: tickets.filter(t => ["open", "waiting"].includes(t.status)).length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => ["resolved", "closed"].includes(t.status)).length,
  };

  const filteredTickets = statusFilter
    ? tickets.filter(t => {
        if (statusFilter === "open") return ["open", "waiting"].includes(t.status);
        if (statusFilter === "in_progress") return t.status === "in_progress";
        if (statusFilter === "resolved") return ["resolved", "closed"].includes(t.status);
        return true;
      })
    : tickets;

  if (!currentUser) return null;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={systemName} className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {systemName}
            </h1>
            <p className="text-sm text-muted-foreground">Abra tickets e acompanhe seus atendimentos</p>
          </div>
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
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setStatusFilter(null)} className={cn("flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg transition-all cursor-pointer", !statusFilter ? "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <Inbox className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-zinc-500 text-white">{counts.total}</span>
                </div>
                <span className="text-[10px] font-medium">Todos</span>
              </button>
              <button onClick={() => setStatusFilter("open")} className={cn("flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg transition-all cursor-pointer", statusFilter === "open" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-700" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <Headphones className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-blue-500 text-white">{counts.open}</span>
                </div>
                <span className="text-[10px] font-medium">Abertos</span>
              </button>
              <button onClick={() => setStatusFilter("in_progress")} className={cn("flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg transition-all cursor-pointer", statusFilter === "in_progress" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-700" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <Clock className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-amber-500 text-white">{counts.in_progress}</span>
                </div>
                <span className="text-[10px] font-medium">Atendimento</span>
              </button>
              <button onClick={() => setStatusFilter("resolved")} className={cn("flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg transition-all cursor-pointer", statusFilter === "resolved" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-700" : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <div className="relative">
                  <CheckCircle className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 bg-emerald-500 text-white">{counts.resolved}</span>
                </div>
                <span className="text-[10px] font-medium">Finalizados</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                <Ticket className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum ticket</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Ticket" para começar</p>
              </div>
            ) : (
              filteredTickets.map(ticket => (
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
                  <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === currentUser?.id} currentUser={{ id: currentUser?.id }} ticketId={selectedTicket.id} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            {!["resolved", "closed"].includes(selectedTicket.status) ? (
              <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
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
