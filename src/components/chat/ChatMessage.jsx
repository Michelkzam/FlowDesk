import { useState, useRef } from "react";
import { format } from "date-fns";
import { FileText, Download, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

const ATTACHMENT_LINE = /^📎\s*(.+?):\s*(https?:\/\/\S+)$/i;

function MessageBody({ body }) {
  if (!body) return null;
  const lines = body.split("\n");
  const hasAttachments = lines.some(l => ATTACHMENT_LINE.test(l));

  if (!hasAttachments) {
    return <p className="whitespace-pre-wrap">{body}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, i) => {
        const match = line.match(ATTACHMENT_LINE);
        if (!match) {
          return line ? <p key={i} className="whitespace-pre-wrap">{line}</p> : null;
        }
        const name = match[1].trim();
        const url = match[2].trim();
        const ext = name.split(".").pop()?.toLowerCase();
        const isImage = ["png","jpg","jpeg","gif","webp"].includes(ext);
        const isVideo = ["mp4","webm"].includes(ext);
        const isAudio = ["mp3","wav","ogg","webm"].includes(ext) || name.startsWith("audio_");
        if (isImage) return <a key={i} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={name} className="max-w-[280px] max-h-[220px] rounded-lg object-cover" /></a>;
        if (isVideo) return <video key={i} controls src={url} className="max-w-[280px] max-h-[220px] rounded-lg" />;
        if (isAudio) return <audio key={i} controls src={url} className="w-full h-10" />;
        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline">{name}</a>;
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

function AttachmentBubble({ attachment }) {
  const isImage = attachment.type?.startsWith("image/");
  const isAudio = attachment.type?.startsWith("audio/") || attachment.isAudio;

  if (isAudio) {
    return <AudioPlayer url={attachment.url} />;
  }

  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img src={attachment.url} alt={attachment.name} className="max-w-[250px] max-h-[200px] rounded-lg object-cover" />
      </a>
    );
  }

  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{attachment.name}</p>
        <p className="text-[10px] text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</p>
      </div>
      <Download className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </a>
  );
}

export default function ChatMessage({ msg, isOwn }) {
  const attachments = (() => {
    if (!msg.attachments) return [];
    if (typeof msg.attachments === "string") {
      try { return JSON.parse(msg.attachments); } catch { return []; }
    }
    return Array.isArray(msg.attachments) ? msg.attachments : [];
  })();

  const isAgent = msg.sender_type === "agent";
  const isSystem = msg.sender_type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 text-muted-foreground italic text-xs px-3 py-1.5 rounded-full">
          {msg.body || msg.message}
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
        {(msg.body || msg.message) && (
          <div className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          )}>
            <MessageBody body={msg.body || msg.message} />
          </div>
        )}
      </div>
    </div>
  );
}
