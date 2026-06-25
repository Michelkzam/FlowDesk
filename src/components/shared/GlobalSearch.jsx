import { db } from '@/api/flowdeskClient';

import React, { useState, useRef, useEffect } from "react";
import { Search, Ticket, Users, X, UserCog, BookOpen, Monitor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { openTicketWindow } from "@/lib/ticketWindow";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-global"],
    queryFn: () => db.entities.Ticket.list("-created_date", 300),
    enabled: open,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-global"],
    queryFn: () => db.entities.Client.list(),
    enabled: open,
  });
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-global"],
    queryFn: () => db.entities.Agent.list(),
    enabled: open,
  });
  const { data: kbArticles = [] } = useQuery({
    queryKey: ["kb-global"],
    queryFn: () => db.entities.KBArticle.list(),
    enabled: open,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets-global"],
    queryFn: () => db.entities.Asset.list(),
    enabled: open,
  });

  const lq = q.toLowerCase();
  const results = q.length < 2 ? [] : [
    ...tickets.filter(t =>
      (t.title || "").toLowerCase().includes(lq) ||
      (t.number || "").toLowerCase().includes(lq) ||
      (t.user_name || "").toLowerCase().includes(lq) ||
      (t.department_name || "").toLowerCase().includes(lq)
    ).slice(0, 5).map(t => ({ type: "ticket", label: t.title, sub: `Ticket #${t.number || "—"} · ${t.user_name || ""}`, path: `/tickets/${t.id}`, section: "Tickets" })),
    ...clients.filter(c =>
      (c.name || "").toLowerCase().includes(lq) ||
      (c.email || "").toLowerCase().includes(lq) ||
      (c.phone || "").toLowerCase().includes(lq) ||
      (c.company || "").toLowerCase().includes(lq)
    ).slice(0, 5).map(c => ({ type: "client", label: c.name, sub: `Cliente · ${c.email || c.phone || ""}`, path: "/clientes", section: "Clientes" })),
    ...agents.filter(a =>
      (a.name || "").toLowerCase().includes(lq) ||
      (a.email || "").toLowerCase().includes(lq)
    ).slice(0, 3).map(a => ({ type: "agent", label: a.name, sub: `Técnico · ${a.email || ""}`, path: "/agentes", section: "Técnicos" })),
    ...kbArticles.filter(k =>
      (k.title || "").toLowerCase().includes(lq) ||
      (k.content || "").toLowerCase().includes(lq)
    ).slice(0, 3).map(k => ({ type: "kb", label: k.title, sub: "Artigo da Base de Conhecimento", path: "/kb/artigos", section: "Base de Conhecimento" })),
    ...assets.filter(a =>
      (a.name || "").toLowerCase().includes(lq) ||
      (a.serial || "").toLowerCase().includes(lq)
    ).slice(0, 3).map(a => ({ type: "asset", label: a.name, sub: `Ativo · ${a.serial || a.type || ""}`, path: "/inventario", section: "Inventário" })),
  ];

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 h-8 rounded-md border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:block text-xs">Busca global</span>
        <kbd className="hidden sm:inline-flex items-center px-1 rounded border border-border bg-background text-xs">⌘K</kbd>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar tickets, clientes, #número..."
                className="border-0 focus-visible:ring-0 shadow-none h-11 text-sm"
              />
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {q.length < 2 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Digite ao menos 2 caracteres para buscar</p>
              ) : results.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum resultado encontrado</p>
              ) : results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => r.type === "ticket" ? openTicketWindow(r.path.split("/").pop()) : go(r.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/40 last:border-0"
                >
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                    r.type === "ticket" ? "bg-blue-100 text-blue-600" :
                    r.type === "client" ? "bg-emerald-100 text-emerald-600" :
                    r.type === "agent" ? "bg-purple-100 text-purple-600" :
                    r.type === "kb" ? "bg-amber-100 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {r.type === "ticket" ? <Ticket className="w-3.5 h-3.5" /> :
                     r.type === "client" ? <Users className="w-3.5 h-3.5" /> :
                     r.type === "agent" ? <UserCog className="w-3.5 h-3.5" /> :
                     r.type === "kb" ? <BookOpen className="w-3.5 h-3.5" /> :
                     <Monitor className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.section} · {r.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}