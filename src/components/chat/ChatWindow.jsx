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
import { ArrowLeft, Send, User, Clock, Headphones, CheckCircle, ArrowRightLeft, Inbox, Paperclip, Mic, Camera, Video, Square, X } from "lucide-react";
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
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const [screenRecordCountdown, setScreenRecordCountdown] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
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

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const filePath = `chat-attachments/${ticket.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const fileUrl = urlData?.publicUrl;

      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "agent",
        sender_id: session?.user?.id,
        sender_name: "Operador",
        body: fileUrl || `📎 Arquivo: ${file.name}`,
        type: "message",
        is_internal: false,
      });

      queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
    } catch (error) {
      console.error("[Chat] Erro ao enviar arquivo:", error);
    }
    e.target.value = "";
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (error) {
      console.error("[Chat] Erro ao iniciar gravação:", error);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const sendAudioRecording = async () => {
    if (!audioBlob) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const filePath = `chat-audio/${ticket.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, audioBlob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const audioUrl = urlData?.publicUrl;

      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "agent",
        sender_id: session?.user?.id,
        sender_name: "Operador",
        body: audioUrl || "🎵 Áudio gravado",
        type: "message",
        is_internal: false,
      });

      queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
      setAudioBlob(null);
    } catch (error) {
      console.error("[Chat] Erro ao enviar áudio:", error);
    }
  };

  const handleScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const filePath = `chat-screenshots/${ticket.id}/${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, blob, { contentType: "image/png" });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          const imageUrl = urlData?.publicUrl;

          await supabase.from("ticket_messages").insert({
            ticket_id: ticket.id,
            sender_type: "agent",
            sender_id: session?.user?.id,
            sender_name: "Operador",
            body: imageUrl || "🖼️ Print da tela",
            type: "message",
            is_internal: false,
          });

          queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
        } catch (error) {
          console.error("[Chat] Erro ao enviar print:", error);
        }
      }, "image/png");
    } catch (error) {
      console.error("[Chat] Erro ao capturar tela:", error);
    }
  };

  const startScreenRecording = async () => {
    let countdown = 3;
    setScreenRecordCountdown(countdown);

    const interval = setInterval(() => {
      countdown--;
      setScreenRecordCountdown(countdown);
      if (countdown === 0) {
        clearInterval(interval);
        beginScreenRecording();
      }
    }, 1000);
  };

  const beginScreenRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        stream.getTracks().forEach(t => t.stop());

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const filePath = `chat-videos/${ticket.id}/${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, blob, { contentType: "video/webm" });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          const videoUrl = urlData?.publicUrl;

          await supabase.from("ticket_messages").insert({
            ticket_id: ticket.id,
            sender_type: "agent",
            sender_id: session?.user?.id,
            sender_name: "Operador",
            body: videoUrl || "🎬 Gravação de tela",
            type: "message",
            is_internal: false,
          });

          queryClient.invalidateQueries({ queryKey: ["chat-messages", ticket.id] });
        } catch (error) {
          console.error("[Chat] Erro ao enviar gravação:", error);
        }
      };

      mediaRecorder.start();
      setIsRecordingScreen(true);
    } catch (error) {
      console.error("[Chat] Erro ao iniciar gravação de tela:", error);
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorderRef.current && isRecordingScreen) {
      mediaRecorderRef.current.stop();
      setIsRecordingScreen(false);
    }
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
                  {msg.body && msg.body.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
                    <a href={msg.body} target="_blank" rel="noopener noreferrer">
                      <img src={msg.body} alt="Imagem" className="max-w-[250px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-80" />
                    </a>
                  ) : msg.body && msg.body.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video controls src={msg.body} className="max-w-[250px] max-h-[200px] rounded-lg" />
                  ) : msg.body && msg.body.match(/\.(mp3|wav|ogg|webm)$/i) ? (
                    <audio controls src={msg.body} className="w-full h-10" />
                  ) : msg.body && msg.body.startsWith("http") ? (
                    <a href={msg.body} target="_blank" rel="noopener noreferrer" className="text-sm underline">{msg.body}</a>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  )}
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
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />
        {isRecordingScreen && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-red-100 border border-red-300 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-700 font-medium">Gravando tela...</span>
            <Button size="sm" variant="destructive" className="h-6 text-xs ml-auto" onClick={stopScreenRecording}>
              <Square className="w-3 h-3 mr-1" /> Parar
            </Button>
          </div>
        )}
        {isRecordingAudio && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-red-100 border border-red-300 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-700 font-medium">Gravando áudio...</span>
            <Button size="sm" variant="destructive" className="h-6 text-xs ml-auto" onClick={stopAudioRecording}>
              <Square className="w-3 h-3 mr-1" /> Parar
            </Button>
          </div>
        )}
        {audioBlob && !isRecordingAudio && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-blue-100 border border-blue-300 rounded-lg">
            <Mic className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Áudio gravado</span>
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setAudioBlob(null)}>
              <X className="w-3 h-3 mr-1" /> Cancelar
            </Button>
            <Button size="sm" className="h-6 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={sendAudioRecording}>
              <Send className="w-3 h-3 mr-1" /> Enviar
            </Button>
          </div>
        )}
        {screenRecordCountdown > 0 && (
          <div className="flex items-center justify-center mb-2 p-4 bg-black/80 rounded-lg">
            <span className="text-4xl font-bold text-white animate-pulse">{screenRecordCountdown}</span>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleAttachFile} title="Anexar arquivo">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className={`h-9 w-9 ${isRecordingAudio ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`} onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording} title="Gravar áudio">
            <Mic className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleScreenCapture} title="Print da tela">
            <Camera className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className={`h-9 w-9 ${isRecordingScreen ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`} onClick={isRecordingScreen ? stopScreenRecording : startScreenRecording} title="Gravar tela">
            <Video className="w-4 h-4" />
          </Button>
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