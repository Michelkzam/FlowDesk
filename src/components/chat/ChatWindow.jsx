import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';
import { playSystemSound } from '@/lib/soundSystem';

import { useState, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, User, Clock, Headphones, CheckCircle, XCircle } from "lucide-react";
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
  open: { label: "Aguardando", icon: Clock, class: "bg-red-100 text-red-700" },
  in_progress: { label: "Em Atendimento", icon: Headphones, class: "bg-amber-100 text-amber-700" },
  waiting: { label: "Aguardando Retorno", icon: Clock, class: "bg-purple-100 text-purple-700" },
  resolved: { label: "Resolvido", icon: CheckCircle, class: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Fechado", icon: XCircle, class: "bg-muted text-muted-foreground" },
};

export default function ChatWindow({ ticket, onClose, onUpdate }) {
  const [message, setMessage] = useState("");
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
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "agent",
        sender_name: "Operador",
        body: msg,
        type: "message",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
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
          <Select value={ticket.status} onValueChange={(v) => updateStatusMutation.mutate(v)}>
            <SelectTrigger className={`h-7 text-xs border-0 ${status.class} font-medium w-auto gap-1`}>
              <StatusIcon className="w-3 h-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aguardando</SelectItem>
              <SelectItem value="in_progress">Em Atendimento</SelectItem>
              <SelectItem value="waiting">Aguardando Retorno</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>
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
                  <p className="text-sm">{msg.body || msg.message}</p>
                </div>
                <p className={`text-xs text-muted-foreground mt-1 ${msg.sender_type === "agent" ? "text-right mr-1" : "ml-1"}`}>
                  {msg.sender_name || (msg.sender_type === "agent" ? "Operador" : "Cliente")} • {format(new Date(msg.created_at || msg.created_date), "HH:mm", { locale: ptBR })}
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
    </div>
  );
}