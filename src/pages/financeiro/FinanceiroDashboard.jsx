import { db } from '@/api/flowdeskClient';

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Ticket, Users, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const PRIORITY_LABELS = { low: "Baixa", normal: "Normal", high: "Alta", emergency: "Emergência" };
const STATUS_LABELS = { open: "Aberto", in_progress: "Em Andamento", waiting: "Aguardando", resolved: "Resolvido", closed: "Fechado" };

function StatCard({ title, value, subtitle, icon: IconComp, color }) {
  return (
    <Card className="p-5 border border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <IconComp className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

export default function FinanceiroDashboard() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const { data: tickets = [] } = useQuery({ queryKey: ["tickets"], queryFn: () => db.entities.Ticket.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-fin"], queryFn: () => db.entities.Client.list() });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });

  const thisMonth = useMemo(() => tickets.filter(t =>
    t.created_date && isWithinInterval(parseISO(t.created_date), { start: thisMonthStart, end: thisMonthEnd })
  ), [tickets]);

  const lastMonth = useMemo(() => tickets.filter(t =>
    t.created_date && isWithinInterval(parseISO(t.created_date), { start: lastMonthStart, end: lastMonthEnd })
  ), [tickets]);

  // Volume por status (mês atual)
  const byStatus = useMemo(() => {
    const map = {};
    thisMonth.forEach(t => {
      const label = STATUS_LABELS[t.status] || t.status;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [thisMonth]);

  // Volume por prioridade
  const byPriority = useMemo(() => {
    const map = {};
    thisMonth.forEach(t => {
      const label = PRIORITY_LABELS[t.priority] || t.priority || "Normal";
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [thisMonth]);

  // Volume por departamento
  const byDept = useMemo(() => {
    const map = {};
    thisMonth.forEach(t => {
      const label = t.department_name || "Sem Departamento";
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [thisMonth]);

  // Evolução últimos 6 meses
  const monthlyEvolution = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      const count = tickets.filter(t => t.created_date && isWithinInterval(parseISO(t.created_date), { start: s, end: e })).length;
      return { mes: format(d, "MMM/yy", { locale: ptBR }), tickets: count };
    });
  }, [tickets]);

  const resolvedThisMonth = thisMonth.filter(t => t.status === "resolved" || t.status === "closed").length;
  const avgResolution = resolvedThisMonth > 0 ? Math.round(thisMonth.length / Math.max(agents.length, 1)) : 0;

  const handleExportCSV = () => {
    const rows = [["#", "Título", "Status", "Prioridade", "Departamento", "Agente", "Criado em"]];
    thisMonth.forEach(t => {
      rows.push([
        t.number || t.id?.slice(0, 8),
        t.title,
        STATUS_LABELS[t.status] || t.status,
        PRIORITY_LABELS[t.priority] || t.priority,
        t.department_name || "",
        t.agent_name || "",
        t.created_date ? format(parseISO(t.created_date), "dd/MM/yyyy HH:mm") : "",
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `atendimentos_${format(now, "yyyy-MM")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground capitalize">Volume de atendimentos — {monthLabel}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="w-4 h-4" /> Exportar CSV do Mês
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tickets este mês" value={thisMonth.length} subtitle={`${lastMonth.length} no mês anterior`} icon={Ticket} color="bg-blue-500" />
        <StatCard title="Resolvidos" value={resolvedThisMonth} subtitle={`${thisMonth.length > 0 ? Math.round(resolvedThisMonth / thisMonth.length * 100) : 0}% do total`} icon={TrendingUp} color="bg-emerald-500" />
        <StatCard title="Agentes ativos" value={agents.filter(a => a.status === "active").length} subtitle={`${agents.length} total`} icon={Users} color="bg-purple-500" />
        <StatCard title="Média por agente" value={avgResolution} subtitle="tickets / agente" icon={Clock} color="bg-amber-500" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 border border-border">
          <h3 className="font-semibold mb-4 text-sm">Evolução Mensal (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyEvolution} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border border-border">
          <h3 className="font-semibold mb-4 text-sm">Volume por Status (mês atual)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 border border-border">
          <h3 className="font-semibold mb-4 text-sm">Por Departamento (mês atual)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDept} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} name="Tickets" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border border-border">
          <h3 className="font-semibold mb-4 text-sm">Por Prioridade (mês atual)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {byPriority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}