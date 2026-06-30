import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

import React, { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, MessageSquare, Check, CheckCircle2, ShieldCheck, Lightbulb, Monitor, ExternalLink, Clock, Headphones, Hourglass, ShieldAlert, CheckCircle, Archive } from "lucide-react";
import QuickReplyPicker from "@/components/shared/QuickReplyPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChatInput from "@/components/chat/ChatInput";
import ScreenCapture from "@/components/chat/ScreenCapture";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { openTicketWindow } from "@/lib/ticketWindow";
import { broadcastTicketUpdate, broadcastMessageUpdate } from "@/hooks/useRealtimeSync";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/AuthContext";
import SLATimer from "@/components/tickets/SLATimer";
import ResolutionModal from "@/components/tickets/ResolutionModal";

const STATUS_CONFIG = [
  { key: "open",             label: "Pendente",          icon: Clock,        color: "bg-yellow-400", textColor: "text-yellow-800", dotColor: "bg-yellow-500", filterIcon: "🟡" },
  { key: "in_progress",      label: "Em Atendimento",    icon: Headphones,   color: "bg-blue-500",   textColor: "text-white",     dotColor: "bg-blue-500", filterIcon: "🔵" },
  { key: "waiting",          label: "Aguardando",        icon: Hourglass,    color: "bg-orange-500", textColor: "text-white",     dotColor: "bg-orange-500", filterIcon: "🟠" },
  { key: "pending_approval", label: "Aguard. Aprovação", icon: ShieldAlert,  color: "bg-purple-500", textColor: "text-white",     dotColor: "bg-purple-500", filterIcon: "🟣" },
  { key: "resolved",         label: "Resolvido",         icon: CheckCircle,  color: "bg-green-500",  textColor: "text-white",     dotColor: "bg-green-500", filterIcon: "🟢" },
  { key: "closed",           label: "Finalizado",        icon: Archive,      color: "bg-zinc-500",   textColor: "text-white",     dotColor: "bg-zinc-500", filterIcon: "⚫" },
];

export default function TicketDetail({ isPopup = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [blockedInfo, setBlockedInfo] = useState(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizeData, setFinalizeData] = useState({ category: "", solution: "" });
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferData, setTransferData] = useState({ agentId: "", agentName: "", note: "" });
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { can } = usePermissions();
  const { isAdmin } = useAuth();
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(id, currentUser);

  useEffect(() => {
    if (isPopup) {
      localStorage.setItem('chat_opened', Date.now().toString());
      return () => {
        localStorage.setItem('chat_closed', Date.now().toString());
      };
    }
  }, [isPopup]);

  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => db.entities.Ticket.filter({ id }),
    select: data => data?.[0],
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["ticket-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at, attachments")
        .eq("ticket_id", id);
      if (error) {
        console.error("[TicketMessages]", error);
        return [];
      }
      return (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    refetchInterval: 5000,
  });

  const { data: cannedResponses = [] } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => db.entities.CannedResponse.list(),
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 300),
    refetchInterval: 300000,
    refetchOnWindowFocus: true,
  });

  const statusCounts = React.useMemo(() => {
    const counts = { open: 0, in_progress: 0, waiting: 0, pending_approval: 0, resolved: 0, closed: 0 };
    allTickets.forEach(t => {
      if (counts[t.status] !== undefined) counts[t.status]++;
    });
    return counts;
  }, [allTickets]);

  const categorySuggestions = React.useMemo(() => {
    if (!ticket?.category_name && !ticket?.help_topic_name && !ticket?.department_name) return [];
    const ref = (ticket.category_name || ticket.help_topic_name || ticket.department_name || "").toLowerCase();
    return cannedResponses.filter(r => r.status === "active" && (
      r.title.toLowerCase().includes(ref) || r.content.toLowerCase().includes(ref)
    )).slice(0, 4);
  }, [cannedResponses, ticket]);

  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => db.auth.me() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => db.entities.Category.list() });

  const sortedMessages = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (blockedInfo && ticket?.agent_id === currentUser?.id) {
      setBlockedInfo(null);
    }
  }, [ticket?.agent_id, blockedInfo, currentUser?.id]);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from("ticket_messages")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setMessage("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const result = await db.entities.Ticket.update(id, data);
      if (data.status && ticket?.status !== data.status) {
        await db.entities.AuditLog.create({
          user_id: currentUser?.id,
          user_name: currentUser?.full_name || currentUser?.email,
          action: "status_changed",
          entity_type: "Ticket",
          entity_id: id,
          entity_label: ticket?.title,
          old_value: ticket?.status,
          new_value: data.status,
          description: `Status alterado de "${ticket?.status}" para "${data.status}"`,
        });
      } else if (data.agent_id !== undefined) {
        await db.entities.AuditLog.create({
          user_id: currentUser?.id,
          user_name: currentUser?.full_name || currentUser?.email,
          action: "agent_changed",
          entity_type: "Ticket",
          entity_id: id,
          entity_label: ticket?.title,
          new_value: data.agent_name || "Sem agente",
          description: `Agente alterado para "${data.agent_name || "Sem agente"}"`,
        });
        if (data.agent_id) {
          playSystemSound('ticket_assigned');
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    }
  });

  const handleSend = async (text, msgAttachments) => {
    const msgText = text || message;
    if (!msgText.trim() && (!msgAttachments || msgAttachments.length === 0) && attachments.length === 0) return;

    try {
      const latestTickets = await db.entities.Ticket.filter({ id });
      const latestTicket = latestTickets?.[0];

      if (!latestTicket) {
        toast({ title: "Erro", description: "Ticket não encontrado no sistema.", variant: "destructive" });
        return;
      }

      const currentAgentId = latestTicket.agent_id;
      const ticketWasTakenByOther = currentAgentId && currentAgentId !== currentUser?.id && ticket?.agent_id !== currentAgentId;

      if (ticketWasTakenByOther) {
        setBlockedInfo({
          agentName: latestTicket.agent_name || "outro técnico",
          timestamp: new Date(),
        });
        toast({
          title: "Ticket Assumido",
          description: `Este ticket acabou de ser assumido por ${latestTicket.agent_name || "outro técnico"}. Sua mensagem não foi enviada.`,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["ticket", id] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        return;
      }

      if (!currentAgentId && currentUser?.id) {
        await db.entities.Ticket.update(id, {
          agent_id: currentUser.id,
          agent_name: currentUser.full_name || currentUser.email,
          status: latestTicket.status === "open" ? "in_progress" : latestTicket.status,
        });
      }

      let uploadedAttachments = msgAttachments || [];
      if (attachments.length > 0 && uploadedAttachments.length === 0) {
        for (const att of attachments) {
          const ext = att.name.split(".").pop();
          const path = `chat-attachments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, att, { contentType: att.type, upsert: false });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            uploadedAttachments.push({ name: att.name, url: urlData.publicUrl, type: att.type, size: att.size });
          }
        }
      }

      const insertData = {
        ticket_id: id,
        sender_type: "agent",
        sender_id: currentUser?.id,
        sender_name: currentUser?.full_name,
        type: isNote ? "note" : "message",
        is_internal: isNote,
        body: msgText,
      };
      if (uploadedAttachments.length > 0) {
        insertData.attachments = JSON.stringify(uploadedAttachments);
      }

      let { error: msgError } = await supabase
        .from("ticket_messages")
        .insert(insertData);

      if (msgError) {
        if (msgError.message?.includes("attachments")) {
          delete insertData.attachments;
          insertData.body = msgText + (uploadedAttachments.length > 0 ? "\n" + uploadedAttachments.map(a => `📎 ${a.name}: ${a.url}`).join("\n") : "");
          ({ error: msgError } = await supabase.from("ticket_messages").insert(insertData));
        }
        if (msgError) {
          console.error("[TicketDetail INSERT]", JSON.stringify(msgError), insertData);
          throw msgError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["ticket-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      broadcastMessageUpdate(id, msgText);
      broadcastTicketUpdate(id, "message_sent");
      setMessage("");
      setAttachments([]);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao enviar mensagem. Tente novamente.", variant: "destructive" });
    }
  };

  const isResolved = ticket?.status === "resolved" || ticket?.status === "closed";
  const isAssignedToMe = ticket?.agent_id === currentUser?.id;
  const isUnassigned = !ticket?.agent_id;
  const isBlocked = !!blockedInfo;
  const canReply = !isBlocked && (isAdmin || isAssignedToMe) && can("tickets.edit");
  const canViewOnly = isBlocked || (isResolved && !isAdmin);
  const needsStartService = !isBlocked && isUnassigned && !isResolved && !isAdmin && can("tickets.assign");

  const handleStartService = () => {
    updateMutation.mutate({
      agent_id: currentUser.id,
      agent_name: currentUser.full_name || currentUser.email,
      status: "in_progress",
    });
  };

  const handleFinalize = async () => {
    try {
      if (finalizeData.solution.trim()) {
        await supabase.from("ticket_messages").insert({
          ticket_id: id,
          body: `[Solução] ${finalizeData.solution}`,
          sender_type: "system",
          sender_id: currentUser?.id,
          sender_name: currentUser?.full_name || "Sistema",
          type: "system",
          is_internal: false,
        });
      }

      await db.entities.Ticket.update(id, {
        status: "resolved",
        closed_date: new Date().toISOString(),
        category_name: finalizeData.category || ticket?.category_name,
      });

      queryClient.invalidateQueries({ queryKey: ["ticket-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      broadcastTicketUpdate(id, "finalized");

      setShowFinalizeDialog(false);
      setFinalizeData({ category: "", solution: "" });

      toast({ title: "Sucesso", description: "Atendimento finalizado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao finalizar atendimento.", variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    if (!transferData.agentId || !transferData.note.trim()) return;

    try {
      await supabase.from("ticket_messages").insert({
        ticket_id: id,
        body: `[Transferência] Ticket transferido para ${transferData.agentName}.\nMotivo: ${transferData.note}`,
        sender_type: "system",
        sender_id: currentUser?.id,
        sender_name: currentUser?.full_name || "Sistema",
        type: "system",
        is_internal: true,
      });

      await db.entities.Ticket.update(id, {
        agent_id: transferData.agentId,
        agent_name: transferData.agentName,
      });

      queryClient.invalidateQueries({ queryKey: ["ticket-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      broadcastTicketUpdate(id, "transferred");

      setShowTransferDialog(false);
      setTransferData({ agentId: "", agentName: "", note: "" });

      toast({ title: "Sucesso", description: `Ticket transferido para ${transferData.agentName} com sucesso!` });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao transferir ticket.", variant: "destructive" });
    }
  };

  const openTransferDialog = (agentId, agentName) => {
    setTransferData({ agentId, agentName, note: "" });
    setShowTransferDialog(true);
  };

  if (loadingTicket) return <div className="p-8"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!ticket) return <div className="p-8 text-center text-muted-foreground">Ticket não encontrado</div>;

  return (
    <div className={cn("flex flex-col", isPopup ? "h-screen bg-muted/30 text-foreground p-3" : "h-[calc(100vh-80px)] max-w-7xl mx-auto")}>
      <div className={cn("flex flex-col flex-1 min-h-0", isPopup && "bg-card border border-border rounded-xl shadow-sm p-4")}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {!isPopup && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.number}</span>
            <h1 className="text-xl font-bold text-foreground truncate">{ticket.title}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <PriorityBadge value={ticket.priority} />
            <StatusBadge value={ticket.status} />
            {ticket.department_name && <Badge variant="outline" className="text-xs">{ticket.department_name}</Badge>}
          </div>
        </div>

        {/* Status Icons */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1.5 mx-4">
            {STATUS_CONFIG.map(s => {
              const Icon = s.icon;
              const isActive = ticket.status === s.key;
              const count = statusCounts[s.key] || 0;
              const statusTickets = allTickets.filter(t => t.status === s.key).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
              return (
                <Popover key={s.key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button className="relative flex flex-col items-center cursor-pointer group">
                          <div
                            className={cn(
                              "w-11 h-11 rounded-lg flex items-center justify-center transition-all relative",
                              isActive
                                ? cn(s.color, s.textColor, "shadow-md ring-2 ring-offset-1 ring-current/20")
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            {count > 0 && (
                              <span className={cn(
                                "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center px-1 border border-background",
                                isActive ? "bg-white/90 text-gray-900" : "bg-foreground text-background"
                              )}>
                                {count}
                              </span>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{s.label}</p>
                      <p className="text-[10px] opacity-80">{count} ticket{count !== 1 ? "s" : ""}</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent align="center" sideOffset={4} className="w-80 p-0">
                    <div className={cn("px-3 py-2 border-b", s.color, s.textColor)}>
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-[10px] opacity-80">{count} ticket{count !== 1 ? "s" : ""}</p>
                    </div>
                    <ScrollArea className="h-[240px]">
                      {statusTickets.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">Nenhum ticket</div>
                      ) : (
                        <div className="p-1">
                          {statusTickets.map(t => (
                            <button
                              key={t.id}
                              onClick={() => openTicketWindow(t.id)}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors w-full text-left"
                            >
                              <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">{t.number}</span>
                              <span className="text-xs text-foreground truncate flex-1">{t.title}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {t.created_date ? format(new Date(t.created_date), "dd/MM HH:mm") : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {needsStartService ? (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleStartService}
              disabled={updateMutation.isPending}
            >
              <Check className="w-3.5 h-3.5" />
              {updateMutation.isPending ? "Assumindo..." : "Iniciar Atendimento"}
            </Button>
          ) : isResolved && !isAdmin ? (
            <div className="h-8 px-3 border rounded-md flex items-center text-xs bg-muted/30 text-muted-foreground gap-1.5">
              <Lock className="w-3 h-3" />
              {ticket.status === "resolved" ? "Resolvido" : "Fechado"}
            </div>
          ) : (
            <Select value={ticket.status} onValueChange={v => updateMutation.mutate({ status: v })}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="waiting">Aguardando</SelectItem>
                <SelectItem value="pending_approval">Aguard. Aprovação</SelectItem>
                {isAdmin && <SelectItem value="resolved">Resolvido</SelectItem>}
                {isAdmin && <SelectItem value="closed">Fechado</SelectItem>}
              </SelectContent>
            </Select>
          )}
          {!["pending_approval", "resolved", "closed"].includes(ticket.status) && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => updateMutation.mutate({ status: "pending_approval" })}
              disabled={updateMutation.isPending}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Enviar p/ Aprovação
            </Button>
          )}
          {!["resolved", "closed"].includes(ticket.status) && (isAdmin || isAssignedToMe) && can("tickets.close") && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setFinalizeData({ category: ticket?.category_name || "", solution: "" });
                setShowFinalizeDialog(true);
              }}
              disabled={updateMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar Atendimento
            </Button>
          )}
          {ticket.status === "pending_approval" && isAdmin && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => updateMutation.mutate({ status: "resolved", closed_date: new Date().toISOString() })}
              disabled={updateMutation.isPending}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar e Resolver
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden border border-border">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-3/4 rounded-xl" />)
              ) : sortedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="w-10 h-10 opacity-20 mb-2" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : sortedMessages.map(msg => {
                const msgAttachments = (() => {
                  if (!msg.attachments) return [];
                  if (typeof msg.attachments === "string") { try { return JSON.parse(msg.attachments); } catch { return []; } }
                  return Array.isArray(msg.attachments) ? msg.attachments : [];
                })();
                return (
                  <div key={msg.id} className={cn("flex gap-3", msg.sender_type === "agent" ? "flex-row-reverse" : "")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                      msg.sender_type === "agent" ? "bg-primary/20 text-primary" :
                      msg.sender_type === "system" ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {(msg.sender_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className={cn("max-w-[75%]", msg.sender_type === "agent" ? "items-end" : "items-start", "flex flex-col gap-1")}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{msg.sender_name || "Sistema"}</span>
                        {msg.is_internal && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200"><Lock className="w-2.5 h-2.5 mr-1" />Nota Interna</Badge>}
                        <span className="text-xs text-muted-foreground">{msg.created_at ? format(new Date(msg.created_at), "dd/MM HH:mm") : ""}</span>
                      </div>
                      {msg.body && (
                        <div className={cn("rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                          msg.is_internal ? "bg-amber-50 border border-amber-200 text-amber-900" :
                          msg.sender_type === "agent" ? "bg-primary text-primary-foreground" :
                          "bg-muted text-foreground"
                        )}>
                          {msg.body}
                        </div>
                      )}
                      {msgAttachments.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {msgAttachments.map((att, i) => {
                            const isAudio = att.type?.startsWith("audio/") || att.isAudio;
                            const isImage = att.type?.startsWith("image/");
                            if (isAudio) {
                              return (
                                <div key={i} className="bg-card border border-border rounded-lg p-3 min-w-[200px]">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs text-muted-foreground">🎵 Áudio</span>
                                  </div>
                                  <audio controls src={att.url} className="w-full h-10" preload="metadata" />
                                </div>
                              );
                            }
                            if (isImage) {
                              return (
                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                                  <img src={att.url} alt={att.name} className="max-w-[250px] max-h-[200px] rounded-lg object-cover" />
                                </a>
                              );
                            }
                            return (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-xs">
                                <span className="truncate">{att.name}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {typingUsers.map((u) => u.userName).join(", ")} {typingUsers.length === 1 ? "está" : "estão"} digitando...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {categorySuggestions.length > 0 && !message && (
              <div className="border-t border-border bg-amber-50/60 dark:bg-amber-950/20 p-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Sugestões:</p>
                <div className="flex flex-wrap gap-1">
                  {categorySuggestions.map(r => (
                    <button key={r.id} onClick={() => setMessage(r.content)}
                      className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md border border-amber-200 text-left transition-colors">
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cannedResponses.length > 0 && message.startsWith("/") && (
              <div className="border-t border-border bg-card p-2">
                <p className="text-xs text-muted-foreground mb-1">Respostas predefinidas:</p>
                <div className="flex flex-wrap gap-1">
                  {cannedResponses.filter(r => r.title.toLowerCase().includes(message.slice(1).toLowerCase())).slice(0, 5).map(r => (
                    <button key={r.id} onClick={() => setMessage(r.content)}
                      className="text-xs px-2 py-1 bg-muted rounded-md hover:bg-muted/80 text-left">
                      {r.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3 relative">
              {blockedInfo ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center bg-zinc-100 dark:bg-zinc-800 rounded-lg opacity-70">
                  <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      Este ticket acabou de ser assumido por <strong>{blockedInfo.agentName}</strong>.
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Sua mensagem não foi enviada. O chat está em modo somente leitura.
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2">
                      Bloqueado em: {format(blockedInfo.timestamp, "dd/MM/yyyy HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ) : canViewOnly ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                  <Lock className="w-4 h-4" />
                  Ticket resolvido. Apenas o administrador pode reabri-lo.
                </div>
              ) : needsStartService ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6 text-center bg-muted/20 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Este ticket ainda não foi assumido</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Clique no botão abaixo para iniciar o atendimento</p>
                  </div>
                  <Button onClick={handleStartService} disabled={updateMutation.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Check className="w-4 h-4" />
                    {updateMutation.isPending ? "Assumindo..." : "Iniciar Atendimento"}
                  </Button>
                </div>
              ) : !canReply ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                  <Lock className="w-4 h-4" />
                  Este ticket está atribuído a outro técnico. Apenas visualização.
                </div>
              ) : (
                <>
                  {showQuickReplies && (
                    <QuickReplyPicker onSelect={text => setMessage(text)} onClose={() => setShowQuickReplies(false)} />
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setIsNote(false)} className={cn("text-xs px-3 py-1 rounded-full transition-all", !isNote ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                      <MessageSquare className="w-3 h-3 inline mr-1" />Resposta
                    </button>
                    <button onClick={() => setIsNote(true)} className={cn("text-xs px-3 py-1 rounded-full transition-all", isNote ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                      <Lock className="w-3 h-3 inline mr-1" />Nota Interna
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScreenCapture onCapture={(file) => setAttachments((prev) => [...prev, file])} />
                    <div className="flex-1">
                      <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Info sidebar - hidden in popup mode */}
        {!isPopup && (
        <div className="w-64 shrink-0 space-y-3 overflow-y-auto">
          <Card className="p-4 space-y-3 border border-border">
            <SLATimer
              createdDate={ticket.created_date}
              priority={ticket.priority}
              status={ticket.status}
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações</p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Usuário</p>
                <p className="font-medium">{ticket.user_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{ticket.user_email || ""}</p>
                {ticket.user_phone && <p className="text-xs text-muted-foreground">{ticket.user_phone}</p>}
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Acesso Remoto</p>
                <a href={`/acesso-remoto`} className="flex items-center gap-2 text-xs text-primary hover:underline font-medium">
                  <Monitor className="w-3.5 h-3.5" />
                  Acessar computador do cliente
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-1">AnyDesk · TeamViewer · RustDesk</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agente</p>
                <Select value={ticket.agent_id || "none"} onValueChange={v => {
                  if (v === "none") {
                    updateMutation.mutate({ agent_id: "", agent_name: "" });
                  } else {
                    const ag = agents.find(a => a.id === v);
                    openTransferDialog(v, ag?.name || "");
                  }
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sem agente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem agente</SelectItem>
                    {agents.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {ticket.due_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className={cn("text-sm", new Date(ticket.due_date) < new Date() ? "text-red-600 font-medium" : "")}>
                    {format(new Date(ticket.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p>{ticket.created_date ? format(new Date(ticket.created_date), "dd/MM/yyyy HH:mm") : "—"}</p>
              </div>
            </div>
          </Card>
        </div>
        )}
      </div>
      </div>

      {/* Resolution Modal */}
      <ResolutionModal
        open={showFinalizeDialog}
        onOpenChange={setShowFinalizeDialog}
        category={finalizeData.category}
        onCategoryChange={v => setFinalizeData(p => ({ ...p, category: v }))}
        solution={finalizeData.solution}
        onSolutionChange={v => setFinalizeData(p => ({ ...p, solution: v }))}
        onConfirm={handleFinalize}
        isPending={updateMutation.isPending}
      />

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Transferir Ticket
            </DialogTitle>
            <DialogDescription>
              Transferir este ticket para <strong>{transferData.agentName}</strong>. Uma nota interna detalhando o motivo é obrigatória.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Motivo da Transferência *</Label>
              <Textarea
                placeholder="Descreva o motivo detalhadamente para que o novo técnico tenha contexto..."
                value={transferData.note}
                onChange={e => setTransferData(p => ({ ...p, note: e.target.value }))}
                className="h-24"
              />
              <p className="text-xs text-muted-foreground">Esta nota será registrada como nota interna no ticket.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferData.note.trim() || updateMutation.isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ShieldCheck className="w-4 h-4" />
              {updateMutation.isPending ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
