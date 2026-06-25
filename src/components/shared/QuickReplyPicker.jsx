import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_COLORS = {
  greeting: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closing: "bg-blue-50 text-blue-700 border-blue-200",
  info: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-muted text-muted-foreground border-border",
};
const TYPE_LABELS = { greeting: "Saudação", closing: "Encerramento", info: "Informação", other: "Outro" };

export default function QuickReplyPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState("");

  const { data: replies = [] } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: () => db.entities.QuickReply.filter({ status: "active" }),
  });

  const filtered = replies.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title?.toLowerCase().includes(q) || r.content?.toLowerCase().includes(q) || r.shortcut?.toLowerCase().includes(q);
  });

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl z-20 max-h-72 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-2 border-b border-border">
        <Zap className="w-4 h-4 text-primary shrink-0" />
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar resposta rápida..."
            className="h-7 text-xs pl-7"
          />
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhuma resposta encontrada</p>
        ) : (
          filtered.map(r => (
            <button
              key={r.id}
              onClick={() => { onSelect(r.content); onClose(); }}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold">{r.title}</span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded border", TYPE_COLORS[r.type] || TYPE_COLORS.other)}>
                  {TYPE_LABELS[r.type] || r.type}
                </span>
                {r.shortcut && (
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{r.shortcut}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.content}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}