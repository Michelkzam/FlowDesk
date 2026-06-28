import { db } from '@/api/flowdeskClient';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Filter, Search } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";

const STATUS_LABELS = { open: "Aberto", in_progress: "Em Andamento", waiting: "Aguardando", resolved: "Resolvido", closed: "Fechado" };
const PRIORITY_LABELS = { low: "Baixa", normal: "Normal", high: "Alta", emergency: "Emergência" };

const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting: "bg-purple-100 text-purple-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-muted text-muted-foreground",
};

export default function RelatoriosPage() {
  const now = new Date();
  const [filters, setFilters] = useState({
    dateFrom: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    dateTo: format(now, "yyyy-MM-dd"),
    status: "all",
    priority: "all",
    department: "all",
    search: "",
  });

  const { data: tickets = [], isLoading } = useQuery({ queryKey: ["tickets"], queryFn: () => db.entities.Ticket.list() });

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filters.dateFrom && t.created_date) {
        const d = parseISO(t.created_date);
        if (d < startOfDay(parseISO(filters.dateFrom))) return false;
      }
      if (filters.dateTo && t.created_date) {
        const d = parseISO(t.created_date);
        if (d > endOfDay(parseISO(filters.dateTo))) return false;
      }
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.department !== "all" && t.department_name !== filters.department) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.title?.toLowerCase().includes(q) && !t.user_name?.toLowerCase().includes(q) && !t.number?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, filters]);

  const departments = useMemo(() => [...new Set(tickets.map(t => t.department_name).filter(Boolean))], [tickets]);

  const summary = useMemo(() => ({
    total: filteredTickets.length,
    open: filteredTickets.filter(t => t.status === "open").length,
    resolved: filteredTickets.filter(t => t.status === "resolved" || t.status === "closed").length,
    overdue: filteredTickets.filter(t => t.is_overdue).length,
  }), [filteredTickets]);

  const handleExportCSV = () => {
    const headers = ["Número", "Título", "Status", "Prioridade", "Departamento", "Agente", "Usuário", "Email", "Telefone", "Criado em", "Vencimento", "SLA"];
    const rows = filteredTickets.map(t => [
      t.number || t.id?.slice(0, 8) || "",
      t.title || "",
      STATUS_LABELS[t.status] || t.status || "",
      PRIORITY_LABELS[t.priority] || t.priority || "",
      t.department_name || "",
      t.agent_name || "",
      t.user_name || "",
      t.user_email || "",
      t.user_phone || "",
      t.created_date ? format(parseISO(t.created_date), "dd/MM/yyyy HH:mm") : "",
      t.due_date ? format(parseISO(t.due_date), "dd/MM/yyyy HH:mm") : "",
      t.sla_name || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${filters.dateFrom}_${filters.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Relatório de Tickets - FlowDesk", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${filters.dateFrom} a ${filters.dateTo} | Total: ${filteredTickets.length} registros`, 14, 22);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
    const rows = filteredTickets.map(t => [
      t.number || t.id?.slice(0, 8) || "",
      t.title?.substring(0, 30) || "",
      STATUS_LABELS[t.status] || t.status || "",
      PRIORITY_LABELS[t.priority] || t.priority || "",
      t.department_name || "",
      t.agent_name || "",
      t.user_name || "",
      t.created_date ? format(parseISO(t.created_date), "dd/MM/yy HH:mm") : "",
    ]);
    doc.autoTable({
      startY: 32,
      head: [["#", "Título", "Status", "Prioridade", "Depto", "Agente", "Usuário", "Criado"]],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`relatorio_${filters.dateFrom}_${filters.dateTo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Extraia e exporte dados dos atendimentos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" /> CSV ({filteredTickets.length})
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Filtros</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <Select value={filters.priority} onValueChange={v => setFilters(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Departamento</Label>
            <Select value={filters.department} onValueChange={v => setFilters(f => ({ ...f, department: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Busca</Label>
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2.5 text-muted-foreground" />
              <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Número, título..." className="h-8 text-xs pl-6" />
            </div>
          </div>
        </div>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total filtrado", value: summary.total, cls: "text-blue-600" },
          { label: "Abertos", value: summary.open, cls: "text-amber-600" },
          { label: "Resolvidos/Fechados", value: summary.resolved, cls: "text-emerald-600" },
          { label: "Vencidos", value: summary.overdue, cls: "text-red-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className="p-4 text-center border border-border">
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["#", "Título", "Status", "Prioridade", "Departamento", "Agente", "Usuário", "Criado em", "Vencimento"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Carregando...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Nenhum registro encontrado com os filtros aplicados.</td></tr>
              ) : filteredTickets.slice(0, 200).map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{t.number || t.id?.slice(0, 8)}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate font-medium">{t.title}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{PRIORITY_LABELS[t.priority] || t.priority}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.department_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.agent_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.user_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {t.created_date ? format(parseISO(t.created_date), "dd/MM/yy HH:mm") : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {t.due_date ? (
                      <span className={new Date(t.due_date) < new Date() && !["resolved","closed"].includes(t.status) ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {format(parseISO(t.due_date), "dd/MM/yy HH:mm")}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTickets.length > 200 && (
          <p className="text-xs text-muted-foreground text-center py-3 border-t">
            Exibindo 200 de {filteredTickets.length} registros. Exporte o CSV para ver todos.
          </p>
        )}
      </Card>
    </div>
  );
}