import { db } from '@/api/flowdeskClient';

import React, { useState, useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Download, ExternalLink, LayoutList, Columns, Calendar, X, CheckSquare, Square, History, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NewTicketDialog from "./NewTicketDialog";
import KanbanBoard from "@/components/tickets/KanbanBoard";
import BulkActionsBar from "@/components/tickets/BulkActionsBar";
import { openTicketWindow } from "@/lib/ticketWindow";
import SLATimer, { SLATimerMini } from "@/components/tickets/SLATimer";

const sourceEmoji = { web: "🌐", email: "📧", api: "⚙️", phone: "📞", whatsapp: "💬" };

function exportCSV(tickets) {
  const headers = ["Número", "Assunto", "Usuário", "Email", "Departamento", "Prioridade", "Status", "Técnico", "Criado", "Fechado"];
  const rows = tickets.map(t => [
    t.number || "", t.title || "", t.user_name || "", t.user_email || "",
    t.department_name || "", t.priority || "", t.status || "",
    t.agent_name || "",
    t.created_date ? format(new Date(t.created_date), "dd/MM/yyyy HH:mm") : "",
    t.closed_date ? format(new Date(t.closed_date), "dd/MM/yyyy HH:mm") : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `tickets_${format(new Date(), "yyyyMMdd_HHmm")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function TicketList({ myTickets = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const viewModeKey = myTickets ? "viewMode_meus" : "viewMode_todos";
  const [newOpen, setNewOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(viewModeKey) || "list");
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "flowdesk_tickets") {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }
      if (e.key === "chat_opened" || e.key === "chat_closed") {
        window.location.reload();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [queryClient]);

  const setViewModePersisted = (mode) => {
    setViewMode(mode);
    localStorage.setItem(viewModeKey, mode);
  };

  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => db.auth.me() });
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 300),
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });

  const filtered = tickets.filter(t => {
    if (t.status === "resolved" || t.status === "closed") return false;
    if (myTickets && currentUser && t.agent_id !== currentUser.id) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (clientFilter && !(t.user_name || "").toLowerCase().includes(clientFilter.toLowerCase()) &&
        !(t.organization_name || "").toLowerCase().includes(clientFilter.toLowerCase())) return false;
    if (dateFrom && t.created_date && t.created_date < dateFrom) return false;
    if (dateTo && t.created_date && t.created_date.substring(0, 10) > dateTo) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.title || "").toLowerCase().includes(s) ||
      (t.number || "").toLowerCase().includes(s) ||
      (t.user_name || "").toLowerCase().includes(s) ||
      (t.user_email || "").toLowerCase().includes(s) ||
      (t.department_name || "").toLowerCase().includes(s);
  });

  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };
  const toggleOne = (id) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const selectedIds = [...selected];

  const clearFilters = () => { setSearch(""); setClientFilter(""); setDateFrom(""); setDateTo(""); setStatusFilter("all"); setPriorityFilter("all"); };
  const hasFilters = dateFrom || dateTo || clientFilter || search || statusFilter !== "all" || priorityFilter !== "all";

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{myTickets ? "Meus Tickets" : "Todos os Tickets"}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} chamado{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md overflow-hidden h-8">
            <button onClick={() => setViewModePersisted("list")}
              className={`px-2 h-full flex items-center text-xs gap-1 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              <LayoutList className="w-3.5 h-3.5" /> Lista
            </button>
            <button onClick={() => setViewModePersisted("kanban")}
              className={`px-2 h-full flex items-center text-xs gap-1 transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              <Columns className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate("/tickets/historico")}>
            <History className="w-3.5 h-3.5" /> Histórico de Tickets
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportCSV(filtered)}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
          <Button onClick={() => setNewOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 gap-1.5 h-8 text-xs">
            <Plus className="w-3.5 h-3.5" /> Novo Ticket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por título, número, usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <div className="relative min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Filtrar por cliente..." value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="waiting">Aguardando</SelectItem>
            <SelectItem value="pending_approval">Aguard. Aprovação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="emergency">Emergência</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm w-36" />
          <span className="text-muted-foreground text-xs">até</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm w-36" />
          {hasFilters && (
            <button onClick={clearFilters} className="h-8 px-2 rounded border border-border text-xs text-muted-foreground hover:bg-muted flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <BulkActionsBar selectedIds={selectedIds} onClear={() => setSelected(new Set())} />
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        isLoading
          ? <div className="w-full overflow-hidden" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "6px" }}>{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}</div>
          : <KanbanBoard tickets={filtered} />
      )}

      {/* Table */}
      {viewMode === "list" && <Card className="border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-8 py-2.5">
                    <button onClick={toggleAll} className="flex items-center justify-center">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Número</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Assunto</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Usuário</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Departamento</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Prioridade</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Técnico</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide font-semibold text-muted-foreground py-2.5">Criado</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-sm">Nenhum ticket encontrado</TableCell></TableRow>
                ) : filtered.map(t => {
                  const isInProgressByOther = t.status === "in_progress" && currentUser && t.agent_id !== currentUser.id;
                  return (
                  <TableRow key={t.id}
                    className={`hover:bg-muted/20 transition-colors cursor-pointer ${selected.has(t.id) ? "bg-primary/5" : ""} ${isInProgressByOther ? "opacity-60 bg-zinc-50 dark:bg-zinc-900/50" : ""}`}
                    onClick={() => openTicketWindow(t.id)}>
                    <TableCell className="py-2.5" onClick={e => { e.stopPropagation(); toggleOne(t.id); }}>
                      {selected.has(t.id)
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs font-mono text-muted-foreground">{t.number || "#—"}</TableCell>
                    <TableCell className="py-2.5">
                      <div className="max-w-[250px]">
                        <p className={`text-sm font-medium truncate ${isInProgressByOther ? "text-muted-foreground" : ""}`}>{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sourceEmoji[t.source]} {t.help_topic_name || ""}
                          {isInProgressByOther && <span className="ml-1 text-blue-500">• Em atendimento</span>}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <p className="text-sm truncate">{t.user_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.user_email || ""}</p>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">{t.department_name || "—"}</TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-col gap-1">
                        <PriorityBadge value={t.priority} />
                        {!["resolved", "closed"].includes(t.status) && t.created_date && (
                          <SLATimerMini createdDate={t.created_date} priority={t.priority} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5"><StatusBadge value={t.status} /></TableCell>
                    <TableCell className="py-2.5 text-sm">
                      {isInProgressByOther ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1 animate-pulse">
                          <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Atendido por</span>
                            <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">{t.agent_name || "—"}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t.agent_name || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {t.created_date ? format(new Date(t.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <button onClick={e => { e.stopPropagation(); openTicketWindow(t.id); }}>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>}

      <NewTicketDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}