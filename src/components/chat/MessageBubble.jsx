import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Star, MoreVertical, X, Save } from "lucide-react";

function parseBody(msg) {
  const atts = [];
  let bodyText = msg.body || "";
  if (msg.attachments) {
    try {
      const a = typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments;
      if (Array.isArray(a)) {
        a.forEach(x => {
          const ext = (x.name || "").split(".").pop()?.toLowerCase() || "";
          const t = ["png","jpg","jpeg","gif","webp","svg"].includes(ext) ? "image/" : ["mp4","webm"].includes(ext) ? "video/" : ["mp3","wav","ogg"].includes(ext) || x.name?.startsWith("audio_") ? "audio/" : "other";
          atts.push({ name: x.name || x.url?.split("/").pop() || "arquivo", url: x.url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" || x.isAudio });
        });
      }
    } catch {}
  }
  const lines = bodyText.split("\n");
  const textLines = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.match(/^https?:\/\/\S+$/) && line.match(/\.(png|jpg|jpeg|gif|webp|mp4|webm|mp3|wav|ogg|pdf)/i)) {
      if (!atts.some(a => a.url === line)) {
        const fn = line.split("/").pop().split("?")[0] || "arquivo";
        const ext = fn.split(".").pop()?.toLowerCase() || "";
        const t = ["png","jpg","jpeg","gif","webp"].includes(ext) ? "image/" : ["mp4","webm"].includes(ext) ? "video/" : ["mp3","wav","ogg"].includes(ext) ? "audio/" : "other";
        atts.push({ name: fn, url: line, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" });
      }
    } else if (line.includes("\uD83D\uDCCE") && line.includes("://")) {
      const rest = line.replace(/^\uD83D\uDCCE\s*/, "");
      const colonIdx = rest.indexOf(": ");
      if (colonIdx > 0) {
        const name = rest.substring(0, colonIdx).trim();
        const url = rest.substring(colonIdx + 2).trim();
        if (url.match(/^https?:\/\//) && !atts.some(a => a.url === url || a.name === name)) {
          const ext = name.split(".").pop()?.toLowerCase() || "";
          const t = ["png","jpg","jpeg","gif","webp"].includes(ext) ? "image/" : ["mp4","webm"].includes(ext) ? "video/" : ["mp3","wav","ogg"].includes(ext) ? "audio/" : "other";
          atts.push({ name, url, isImage: t === "image/", isVideo: t === "video/", isAudio: t === "audio/" });
        } else { textLines.push(raw); }
      } else { textLines.push(raw); }
    } else {
      textLines.push(raw);
    }
  }
  return { text: textLines.join("\n").trim(), attachments: atts };
}

export default function MessageBubble({ msg, isOwn, currentUser, ticketId }) {
  const [openMenu, setOpenMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const queryClient = useQueryClient();

  const editMutation = useMutation({
    mutationFn: async ({ id, body }) => {
      const { error } = await supabase.from("ticket_messages").update({ body }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", ticketId] }); setIsEditing(false); setEditText(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("ticket_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", ticketId] }); setOpenMenu(false); },
  });

  const highlightMutation = useMutation({
    mutationFn: async ({ id, isHighlighted }) => {
      const { error } = await supabase.from("ticket_messages").update({ is_highlighted: isHighlighted }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["chat-messages", ticketId] }); setOpenMenu(false); },
  });

  const { text, attachments: atts } = parseBody(msg);
  const isHighlighted = msg.is_highlighted;
  const isCurrentUser = currentUser?.id === msg.sender_id;
  const showMenu = isCurrentUser && msg.sender_type !== "system";

  return (
    <div className={`group relative flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className="max-w-xs lg:max-w-md">
        {isHighlighted && <div className="text-[10px] text-amber-600 mb-0.5 ml-1 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> Destacada</div>}
        <div className={`rounded-2xl px-4 py-2.5 ${
          isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" :
          msg.sender_type === "system" ? "bg-muted/50 text-muted-foreground italic text-xs" :
          "bg-muted rounded-tl-sm"
        }`}>
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea className="text-sm bg-background text-foreground border border-border rounded-lg p-2 w-full resize-none" value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); editMutation.mutate({ id: msg.id, body: editText }); } }} autoFocus rows={2} />
              <div className="flex gap-1 justify-end">
                <button onClick={() => setIsEditing(false)} className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80"><X className="w-3 h-3" /></button>
                <button onClick={() => editMutation.mutate({ id: msg.id, body: editText })} className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"><Save className="w-3 h-3" /></button>
              </div>
            </div>
          ) : (
            <>
              {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
              {atts.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {atts.map((a, i) => a.isImage ? <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="max-w-[280px] max-h-[220px] rounded-lg object-cover" /></a> : a.isVideo ? <video key={i} controls src={a.url} className="max-w-[280px] max-h-[220px] rounded-lg" /> : a.isAudio ? <div key={i} className="bg-muted rounded-lg p-2"><audio controls src={a.url} className="w-full h-10" preload="metadata" /></div> : <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-xs"><span className="truncate">{a.name}</span></a>)}
                </div>
              )}
            </>
          )}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "justify-end mr-1" : "ml-1"}`}>
          <p className="text-xs text-muted-foreground">
            {msg.sender_name || (isOwn ? "Operador" : "Cliente")} • {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
          {showMenu && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setOpenMenu(!openMenu)} className="p-0.5 rounded hover:bg-muted"><MoreVertical className="w-3 h-3 text-muted-foreground" /></button>
              {openMenu && (
                <div className="absolute right-0 top-6 z-10 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                  <button onClick={() => { setIsEditing(true); setEditText(msg.body); setOpenMenu(false); }} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted w-full text-left"><Pencil className="w-3 h-3" /> Editar</button>
                  <button onClick={() => { highlightMutation.mutate({ id: msg.id, isHighlighted: !isHighlighted }); }} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted w-full text-left"><Star className={`w-3 h-3 ${isHighlighted ? "fill-amber-400 text-amber-400" : ""}`} /> {isHighlighted ? "Remover destaque" : "Destacar"}</button>
                  <button onClick={() => { if (confirm("Excluir esta mensagem?")) deleteMutation.mutate(msg.id); }} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"><Trash2 className="w-3 h-3" /> Excluir</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}