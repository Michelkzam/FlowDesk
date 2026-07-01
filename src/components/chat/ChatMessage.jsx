import { useState, useRef } from "react";
import { format } from "date-fns";
import { Play, Pause, Paperclip } from "lucide-react";
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
  let bodyText = msg.body || msg.message || "";

  if (msg.attachments) {
    try {
      const atts = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;
      if (Array.isArray(atts)) {
        atts.forEach(a => {
          const t = a.type || guessType(a.name || a.url?.split("/").pop() || "");
          inlineAttachments.push({ ...a, name: a.name || a.url?.split("/").pop() || "arquivo", type: t });
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
        inlineAttachments.push({ name, url, type: guessType(name) });
      }
    } else if (trimmed.match(/^https?:\/\/\S+$/) && trimmed.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mp3|wav|ogg|pdf)/i)) {
      const url = trimmed;
      if (!inlineAttachments.some(a => a.url === url)) {
        const fileName = url.split("/").pop().split("?")[0] || "arquivo";
        inlineAttachments.push({ name: fileName, url, type: guessType(fileName) });
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

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioPlayer({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
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

export default function ChatMessage({ msg, isOwn }) {
  const { text, attachments } = parseAttachments(msg);

  const isAgent = msg.sender_type === "agent";
  const isSystem = msg.sender_type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 text-muted-foreground italic text-xs px-3 py-1.5 rounded-full">
          {text || msg.body || msg.message}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2.5", isOwn ? "flex-row-reverse" : "")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        isAgent ? "bg-emerald-100 text-emerald-700" : "bg-primary/20 text-primary"
      )}>
        {(msg.sender_name || "?")[0]?.toUpperCase()}
      </div>
      <div className={cn("max-w-[78%] flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{msg.sender_name}</span>
          <span className="text-xs text-muted-foreground">
            {msg.created_at ? format(new Date(msg.created_at), "HH:mm") : ""}
          </span>
        </div>
        {(text || attachments.length > 0) && (
          <div className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          )}>
            <MessageBody body={text} attachments={attachments} />
          </div>
        )}
      </div>
    </div>
  );
}