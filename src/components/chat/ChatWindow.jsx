import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, User, Clock, Headphones, CheckCircle, ArrowRightLeft, Inbox } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const channelEmoji = {
  whatsapp: "🟢",
  telegram: "🔵",
  email: "📧",
  phone: "📞",
  portal: "🌐",
};

const statusConfig = {
  open: { label: "Aguardando", icon: Clock, class: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "Em Atendimento", icon: Headphones, class: "bg-blue-100 text-blue-700" },
  closed: { label: "Finalizado", icon: CheckCircle, class: "bg-zinc-100 text-zinc-700" },
};

export default function ChatWindow({ ticket, onClose, onUpdate }) {
  const [message, setMessage] = useState("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferData, setTransferData] = useState({ agentId: "", agentName: "", note: "" });
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const prevMsgCountRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, body, sender_type, sender_id, sender_name, type, is_internal, created_at")
        .eq("ticket_id", ticket.id);
      if (error) {
        console.error("[ChatMessages]", error);
        return [];
      }
      return (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    refetchInterval: 5000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("id, full_name, email, status").in("role", ["admin", "agent"]);
      if (error) return [];
      return (data || []).filter(a => a.status === "active");
    },
  });

  useEffect(() => {
    if (!messages.length || prevMsgCountRef.current === null) {
      prevMsgCountRef.current = messages.length;
      return;
    }
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender_type !== "agent") {
        playSystemSound('new_message');
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (msg) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: userProfile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { error: msgError } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "agent",
        sender_id: user.id,
        sender_name: userProfile?.full_name || user.email || "Operador",
        body: msg,
        type: "message",
      });
      if (msgError) throw msgError;

      if (!ticket.agent_id || ticket.agent_id !== user.id) {
        const { error: updateError } = await supabase
          .from("tickets")
          .update({
            agent_id: user.id,
            agent_name: userProfile?.full_name || user.email,
            status: ticket.status === "open" ? "in_progress" : ticket.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);
        if (updateError) console.error("[Chat] Erro ao atribuir ticket:", updateError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setMessage("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => db.entities.Ticket.update(ticket.id, { status }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      onUpdate?.(updated);
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ toAgentId, toAgentName, note }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: userProfile } = await supabase.from("users").select("full_name").eq("id", user.id).single();
      const fromAgentName = userProfile?.full_name || user.email || "Operador";

      const { error: msgError } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        body: `[Transferência] Ticket transferido de ${fromAgentName} para ${toAgentName}.\n\nMotivo: ${note}`,
        sender_type: "system",
        sender_id: user.id,
        sender_name: fromAgentName,
        type: "system",
        is_internal: true,
      });
      if (msgError) throw msgError;

      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          agent_id: toAgentId,
          agent_name: toAgentName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
      setShowTransferDialog(false);
      setTransferData({ agentId: "", agentName: "", note: "" });
      if (onClose) onClose();
    },
  });

  const handleTransfer = () => {
    if (!transferData.agentId || !transferData.note.trim()) return;
    transferMutation.mutate({
      toAgentId: transferData.agentId,
      toAgentName: transferData.agentName,
      note: transferData.note,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const status = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{ticket.client_name || "Sem cliente"}</span>
            <span className="text-sm">{channelEmoji[ticket.channel]}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{ticket.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowTransferDialog(true)}
          >
            <ArrowRightLeft className="w-3 h-3" /> Transferir
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              if (confirm("Deseja retornar este ticket à caixa de entrada?")) {
                updateStatusMutation.mutate("open");
                supabase.from("tickets").update({
                  agent_id: null,
                  agent_name: null,
                  status: "open",
                  updated_at: new Date().toISOString(),
                }).eq("id", ticket.id).then(() => {
                  queryClient.invalidateQueries({ queryKey: ["tickets"] });
                  queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
                });
              }
            }}
          >
            <Inbox className="w-3 h-3" /> Retornar à Fila
          </Button>
          {ticket.status !== "closed" && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (confirm("Deseja finalizar este atendimento?")) {
                  supabase.from("tickets").update({
                    status: "closed",
                    closed_date: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }).eq("id", ticket.id).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["tickets"] });
                    queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
                    if (onClose) onClose();
                  });
                }
              }}
            >
              <CheckCircle className="w-3 h-3" /> Finalizar
            </Button>
          )}
          {ticket.status === "closed" && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
              <CheckCircle className="w-3 h-3" /> Finalizado
            </span>
           )}
        </div>
      </div>

      {/* Ticket info bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground flex-shrink-0 flex-wrap">
        <span>Ticket #{ticket.id?.slice(-6)}</span>
        {ticket.agent_name && <><span>•</span><span>Operador: {ticket.agent_name}</span></>}
        {ticket.category_name && <><span>•</span><span>{ticket.category_name}</span></>}
        <span>•</span>
        <span>Criado: {format(new Date(ticket.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Ticket description as first message */}
        {ticket.description && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                <p className="text-sm">{ticket.description}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-1">
                {ticket.client_name || "Cliente"} • {format(new Date(ticket.created_date), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 && !ticket.description ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_type === "agent" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-xs lg:max-w-md">
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.sender_type === "agent"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : msg.sender_type === "system"
                    ? "bg-muted/50 text-muted-foreground italic text-xs"
                    : "bg-muted rounded-tl-sm"
                }`}>
                  <p className="text-sm">{msg.body}</p>
                </div>
                <p className={`text-xs text-muted-foreground mt-1 ${msg.sender_type === "agent" ? "text-right mr-1" : "ml-1"}`}>
                  {msg.sender_name || (msg.sender_type === "agent" ? "Operador" : "Cliente")} • {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex items-center gap-2">
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
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" /> Transferir Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Transferir para *</Label>
              <Select value={transferData.agentId || "none"} onValueChange={v => {
                if (v === "none") {
                  setTransferData(p => ({ ...p, agentId: "", agentName: "" }));
                } else {
                  const ag = agents.find(a => a.id === v);
                  setTransferData(p => ({ ...p, agentId: v, agentName: ag?.full_name || "" }));
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {agents.filter(a => a.id !== ticket.agent_id).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo da Transferência *</Label>
              <Textarea
                placeholder="Descreva o motivo da transferência..."
                value={transferData.note}
                onChange={e => setTransferData(p => ({ ...p, note: e.target.value }))}
                className="h-24"
              />
              <p className="text-xs text-muted-foreground">Esta nota será registrada como nota interna no ticket.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferData.agentId || !transferData.note.trim() || transferMutation.isPending}
              className="gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {transferMutation.isPending ? "Transferindo..." : "Confirmar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}