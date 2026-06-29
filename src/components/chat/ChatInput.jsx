import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Mic, MicOff, X, FileText, Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  audio: ["audio/webm", "audio/ogg", "audio/mpeg", "audio/wav"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        {playing ? <Pause className="w-3.5 h-3.5 text-primary" /> : <Play className="w-3.5 h-3.5 text-primary" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>{formatDuration(duration * progress / 100)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setProgress((e.target.currentTime / e.target.duration) * 100 || 0)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}

function AttachmentPreview({ file, onRemove }) {
  const isImage = file.type?.startsWith("image/");
  const isAudio = file.type?.startsWith("audio/");

  if (isAudio && file.url) {
    return (
      <div className="relative flex items-center gap-2 p-2 bg-muted rounded-lg">
        <AudioPlayer url={file.url} />
        <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2 p-2 bg-muted rounded-lg">
      {isImage && file.preview ? (
        <img src={file.preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <button onClick={onRemove} className="w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function ChatInput({ onSend, disabled }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);

  const uploadFile = async (file) => {
    const ext = file.name.split(".").pop();
    const path = `chat-attachments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`Arquivo ${file.name} muito grande (máx 10MB)`);
        continue;
      }
      const allTypes = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.document, ...ALLOWED_TYPES.audio];
      if (!allTypes.includes(file.type)) {
        alert(`Tipo de arquivo não suportado: ${file.type}`);
        continue;
      }
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      setAttachments(prev => [...prev, { file, name: file.name, size: file.size, type: file.type, preview, uploading: true }]);
    }
    e.target.value = "";
  };

  const startRecording = async () => {
    console.log("[Audio] Iniciando gravação...");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("[Audio] mediaDevices não disponível");
        toast({ title: "Áudio indisponível", description: "Seu navegador não suporta gravação de áudio.", variant: "destructive" });
        return;
      }

      console.log("[Audio] Solicitando permissão do microfone...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Audio] Permissão concedida, tracks:", stream.getAudioTracks().length);

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "";
        }
      }
      console.log("[Audio] mimeType:", mimeType || "padrão");

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log("[Audio] Dados recebidos:", e.data.size, "bytes");
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        console.log("[Audio] Gravação finalizada, blob:", blob.size, "bytes");
        audioBlobRef.current = blob;
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.onerror = (e) => {
        console.error("[Audio] MediaRecorder error:", e.error);
        toast({ title: "Erro na gravação", description: e.error?.message || "Erro desconhecido", variant: "destructive" });
        setRecording(false);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(1000);
      console.log("[Audio] MediaRecorder iniciado, estado:", mediaRecorder.state);
      setRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      console.error("[Audio] Erro:", err.name, err.message);
      if (err.name === "NotAllowedError") {
        toast({ title: "Permissão negada", description: "Clique no ícone de cadeado na barra de endereço e permita o microfone.", variant: "destructive" });
      } else if (err.name === "NotFoundError") {
        toast({ title: "Sem microfone", description: "Nenhum microfone detectado no sistema.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao gravar", description: `${err.name}: ${err.message}`, variant: "destructive" });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
    audioBlobRef.current = null;
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleSend = async () => {
    const currentAudioBlob = audioBlobRef.current;
    if (!text.trim() && attachments.length === 0 && !currentAudioBlob) return;

    setUploading(true);
    try {
      const uploadedAttachments = [];

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (!att.url) {
          const url = await uploadFile(att.file);
          uploadedAttachments.push({ name: att.name, url, type: att.type, size: att.size });
        } else {
          uploadedAttachments.push({ name: att.name, url: att.url, type: att.type, size: att.size });
        }
      }

      if (currentAudioBlob) {
        const ext = "webm";
        const path = `chat-audio/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, currentAudioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });
        if (error) {
          console.error("[AudioUpload]", error);
          throw error;
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        uploadedAttachments.push({ name: `audio_${Date.now()}.webm`, url: urlData.publicUrl, type: "audio/webm", size: currentAudioBlob.size, isAudio: true });
      }

      await onSend(text, uploadedAttachments.length > 0 ? uploadedAttachments : null);

      setText("");
      setAttachments([]);
      audioBlobRef.current = null;
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      console.error("Erro ao enviar:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t border-border p-3 bg-card">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <AttachmentPreview key={i} file={att} onRemove={() => setAttachments(p => p.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      {audioUrl && (
        <div className="mb-2">
          <AttachmentPreview file={{ name: "Áudio gravado", url: audioUrl, type: "audio/webm", size: audioBlob?.size }} onRemove={cancelRecording} />
        </div>
      )}

      {recording && (
        <div className="flex items-center gap-3 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-700 font-medium">Gravando... {formatDuration(recordingTime)}</span>
          <Button size="sm" variant="destructive" onClick={stopRecording} className="ml-auto h-7">
            <MicOff className="w-3.5 h-3.5 mr-1" /> Parar
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileSelect} />

        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={disabled || recording || uploading}>
          <Paperclip className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="icon" className={cn("h-10 w-10 shrink-0", recording && "bg-red-100 border-red-300 text-red-600")} onClick={recording ? stopRecording : startRecording} disabled={disabled || uploading}>
          <Mic className="w-4 h-4" />
        </Button>

        <textarea
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[42px] max-h-32"
          placeholder={recording ? "Gravando áudio..." : "Digite sua mensagem..."}
          value={text}
          rows={1}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={disabled || recording}
        />

        <Button onClick={handleSend} disabled={disabled || uploading || recording || (!text.trim() && attachments.length === 0 && !audioBlob)}
          className="bg-primary hover:bg-primary/90 shrink-0 h-10 w-10 p-0">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
