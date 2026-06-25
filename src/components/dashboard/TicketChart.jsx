import React from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function TicketsByStatusChart({ tickets }) {
  const statusLabels = {
    open: "Aberto", in_progress: "Em Andamento", waiting: "Aguardando",
    resolved: "Resolvido", closed: "Fechado"
  };

  const data = Object.entries(
    tickets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([key, value]) => ({ name: statusLabels[key] || key, value }));

  return (
    <Card className="border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Tickets por Status</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function TicketsByPriorityChart({ tickets }) {
  const priorityLabels = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };
  const priorityColors = { low: "#94a3b8", medium: "#3b82f6", high: "#f59e0b", urgent: "#ef4444" };

  const data = Object.entries(
    tickets.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {})
  ).map(([key, value]) => ({
    name: priorityLabels[key] || key,
    value,
    fill: priorityColors[key] || "#94a3b8"
  }));

  return (
    <Card className="border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Tickets por Prioridade</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}