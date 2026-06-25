import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PainelAtendentes() {
  const [months, setMonths] = useState("3");

  const { data: tickets = [] } = useQuery({ queryKey: ["tickets"], queryFn: () => db.entities.Ticket.list("-created_date", 1000) });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });

  const numMonths = parseInt(months);
  const now = new Date();

  // Monthly resolved per agent (last N months)
  const monthLabels = Array.from({ length: numMonths }, (_, i) => {
    const d = subMonths(now, numMonths - 1 - i);
    return { label: format(d, "MMM/yy", { locale: ptBR }), start: startOfMonth(d), end: endOfMonth(d) };
  });

  // Resolved tickets per agent per month
  const resolved = tickets.filter(t => ["resolved", "closed"].includes(t.status) && t.closed_date);
  const activeAgents = agents.filter(a => resolved.some(t => t.agent_id === a.id)).slice(0, 6);

  const agentMonthlyData = monthLabels.map(m => {
    const row = { month: m.label };
    activeAgents.forEach(ag => {
      row[ag.name] = resolved.filter(t =>
        t.agent_id === ag.id &&
        new Date(t.closed_date) >= m.start &&
        new Date(t.closed_date) <= m.end
      ).length;
    });
    return row;
  });

  // Avg resolution time per category
  const categories = [...new Set(tickets.map(t => t.help_topic_name || "Geral").filter(Boolean))];
  const categoryData = categories.slice(0, 8).map(cat => {
    const catTickets = resolved.filter(t => (t.help_topic_name || "Geral") === cat && t.created_date && t.closed_date);
    const avg = catTickets.length
      ? Math.round(catTickets.reduce((acc, t) => acc + (new Date(t.closed_date) - new Date(t.created_date)), 0) / catTickets.length / (1000 * 60 * 60))
      : 0;
    return { category: cat.length > 16 ? cat.slice(0, 16) + "…" : cat, horas: avg, total: catTickets.length };
  }).sort((a, b) => b.total - a.total);

  // Agent summary table
  const agentSummary = agents.map(ag => {
    const agTickets = resolved.filter(t => t.agent_id === ag.id);
    const withDates = agTickets.filter(t => t.created_date && t.closed_date);
    const avgH = withDates.length
      ? Math.round(withDates.reduce((acc, t) => acc + (new Date(t.closed_date) - new Date(t.created_date)), 0) / withDates.length / (1000 * 60 * 60))
      : null;
    return { name: ag.name, resolved: agTickets.length, avgH };
  }).filter(a => a.resolved > 0).sort((a, b) => b.resolved - a.resolved);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Painel de Atendentes</h1>
          <p className="text-sm text-muted-foreground">Desempenho por técnico e categoria</p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Último mês</SelectItem>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets resolvidos por atendente/mês */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tickets Resolvidos por Atendente</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket resolvido no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agentMonthlyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                {activeAgents.map((ag, i) => (
                  <Bar key={ag.id} dataKey={ag.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tempo médio por categoria */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tempo Médio por Categoria (horas)</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v) => [`${v}h`, "Tempo médio"]} />
                  <Bar dataKey="horas" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ranking de atendentes */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking de Atendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {agentSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {agentSummary.map((ag, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ag.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{ag.resolved} resolvidos</p>
                      <p className="text-xs text-muted-foreground">{ag.avgH !== null ? `${ag.avgH}h médio` : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}