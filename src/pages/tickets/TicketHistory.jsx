import { db } from '@/api/flowdeskClient';

import React, { useState, useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, MessageSquare, Lock, CheckCircle, Archive, Clock, Headphones, Hourglass, ShieldAlert, FileText, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_ICONS = {
  open: Clock,
  in_progress: Headphones,
  waiting: Hourglass,
  pending_approval: ShieldAlert,
  resolved: CheckCircle,
  closed: Archive,
};

const STATUS_LABELS = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting: "Aguardando",
  pending_approval: "Aguard. Aprovação",
  resolved: "Resolvido",
  closed: "Fechado",
};

export default function TicketHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "flowdesk_tickets") {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }
      if (e.key === "chat_opened" || e.key === "chat_closed") {
        queryClient.invalidateQueries();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [queryClient]);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 500),
    refetchOnWindowFocus: true,
    refetchInterval: 300000,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["ticket-messages", selectedId],
    queryFn: () => db.entities.TicketMessage.filter({ ticket_id: selectedId }, "-created_date", 100),
    enabled: !!selectedId,
  });

  const historyTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed");

  const filtered = historyTickets.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.title || "").toLowerCase().includes(s) ||
      (t.number || "").toLowerCase().includes(s) ||
      (t.user_name || "").toLowerCase().includes(s) ||
      (t.user_email || "").toLowerCase().includes(s) ||
      (t.department_name || "").toLowerCase().includes(s) ||
      (t.agent_name || "").toLowerCase().includes(s);
  });

  const selectedTicket = historyTickets.find(t => t.id === selectedId);
  const sortedMessages = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const handlePrint = () => {
    window.print();
  };

  if (selectedTicket) {
    return (
      <div className="space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-3 print:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedId(null)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Relatório do Ticket</h1>
            <p className="text-sm text-muted-foreground">{selectedTicket.number} — {selectedTicket.title}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => {
            const lines = [
              `RELATÓRIO DE ATENDIMENTO`,
              `${selectedTicket.number} — ${selectedTicket.title}`,
              ``,
              `=== INFORMAÇÕES DO TICKET ===`,
              `Número: ${selectedTicket.number}`,
              `Assunto: ${selectedTicket.title}`,
              `Status: ${STATUS_LABELS[selectedTicket.status] || selectedTicket.status}`,
              `Prioridade: ${selectedTicket.priority || "—"}`,
              `Departamento: ${selectedTicket.department_name || "—"}`,
              `Tópico: ${selectedTicket.help_topic_name || "—"}`,
              ``,
              `=== DATAS ===`,
              `Criado em: ${selectedTicket.created_date ? format(new Date(selectedTicket.created_date), "dd/MM/yyyy HH:mm") : "—"}`,
              selectedTicket.closed_date ? `Fechado em: ${format(new Date(selectedTicket.closed_date), "dd/MM/yyyy HH:mm")}` : null,
              selectedTicket.due_date ? `Vencimento: ${format(new Date(selectedTicket.due_date), "dd/MM/yyyy HH:mm")}` : null,
              ``,
              `=== USUÁRIO ===`,
              `Nome: ${selectedTicket.user_name || "—"}`,
              `Email: ${selectedTicket.user_email || "—"}`,
              selectedTicket.user_phone ? `Telefone: ${selectedTicket.user_phone}` : null,
              selectedTicket.organization_name ? `Organização: ${selectedTicket.organization_name}` : null,
              ``,
              `=== ATENDIMENTO ===`,
              `Técnico: ${selectedTicket.agent_name || "—"}`,
              `Fonte: ${selectedTicket.source || "—"}`,
              ``,
              `=== MENSAGENS (${sortedMessages.length}) ===`,
              ``,
              ...sortedMessages.map(msg => [
                `[${msg.created_date ? format(new Date(msg.created_date), "dd/MM/yyyy HH:mm") : ""}] ${msg.sender_name || "Sistema"}${msg.is_internal ? " (Nota Interna)" : ""}:`,
                msg.body,
                ``,
              ]).flat(),
            ].filter(Boolean).join("\n");
            const blob = new Blob([lines], { type: "text/plain;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `relatorio_${selectedTicket.number || selectedTicket.id}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
        </div>

        <Card className="border border-border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Informações do Ticket</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-mono font-medium">{selectedTicket.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assunto:</span>
                    <span className="font-medium text-right max-w-[250px] truncate">{selectedTicket.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge value={selectedTicket.status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Prioridade:</span>
                    <PriorityBadge value={selectedTicket.priority} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departamento:</span>
                    <span>{selectedTicket.department_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tópico:</span>
                    <span>{selectedTicket.help_topic_name || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Datas</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{selectedTicket.created_date ? format(new Date(selectedTicket.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</span>
                  </div>
                  {selectedTicket.closed_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fechado em:</span>
                      <span>{format(new Date(selectedTicket.closed_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                  {selectedTicket.due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vencimento:</span>
                      <span>{format(new Date(selectedTicket.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Usuário</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{selectedTicket.user_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{selectedTicket.user_email || "—"}</span>
                  </div>
                  {selectedTicket.user_phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span>{selectedTicket.user_phone}</span>
                    </div>
                  )}
                  {selectedTicket.organization_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organização:</span>
                      <span>{selectedTicket.organization_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Atendimento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Técnico:</span>
                    <span className="font-medium">{selectedTicket.agent_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fonte:</span>
                    <span>{selectedTicket.source || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Histórico de Mensagens ({sortedMessages.length})</h3>
            {loadingMessages ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-3/4 rounded-xl" />)}
              </div>
            ) : sortedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem encontrada</p>
            ) : (
              <div className="space-y-4">
                {sortedMessages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-3", msg.sender_type === "agent" ? "flex-row-reverse" : "")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                      msg.sender_type === "agent" ? "bg-primary/20 text-primary" :
                      msg.sender_type === "system" ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {(msg.sender_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className={cn("max-w-[75%] flex flex-col gap-1", msg.sender_type === "agent" ? "items-end" : "items-start")}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">{msg.sender_name || "Sistema"}</span>
                        {msg.is_internal && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200"><Lock className="w-2.5 h-2.5 mr-1" />Nota Interna</Badge>}
                        <span className="text-xs text-muted-foreground">{msg.created_date ? format(new Date(msg.created_date), "dd/MM/yyyy HH:mm") : ""}</span>
                      </div>
                      <div className={cn("rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                        msg.is_internal ? "bg-amber-50 border border-amber-200 text-amber-900" :
                        msg.sender_type === "agent" ? "bg-primary text-primary-foreground" :
                        "bg-muted text-foreground"
                      )}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Histórico de Atendimentos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""} finalizado{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por título, número, usuário, técnico..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
      </div>

      <Card className="border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Número</th>
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Assunto</th>
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Usuário</th>
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Técnico</th>
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Status</th>
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Criado</th>
                  <th className="text-left text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5 px-4">Fechado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Nenhum ticket finalizado encontrado</td></tr>
                ) : filtered.map(t => {
                  const StatusIcon = STATUS_ICONS[t.status] || Archive;
                  return (
                    <tr key={t.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer border-t border-border"
                      onClick={() => setSelectedId(t.id)}>
                      <td className="py-2.5 px-4 text-xs font-mono text-muted-foreground">{t.number || "#—"}</td>
                      <td className="py-2.5 px-4">
                        <p className="text-sm font-medium truncate max-w-[250px]">{t.title}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="text-sm truncate">{t.user_name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.user_email || ""}</p>
                      </td>
                      <td className="py-2.5 px-4 text-sm text-muted-foreground">{t.agent_name || "—"}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className={cn("text-xs gap-1",
                          t.status === "resolved" ? "bg-green-50 text-green-700 border-green-200" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_LABELS[t.status]}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {t.created_date ? format(new Date(t.created_date), "dd/MM/yy HH:mm") : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {t.closed_date ? format(new Date(t.closed_date), "dd/MM/yy HH:mm") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
