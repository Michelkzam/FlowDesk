import { db } from '@/api/flowdeskClient';

import React from "react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Ticket, Users, Clock, AlertTriangle, CheckCircle, TrendingUp, UserCog, BookOpen, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { subDays, isAfter, differenceInMinutes } from "date-fns";
import { openTicketWindow } from "@/lib/ticketWindow";
import SLADashboard from "@/components/dashboard/SLADashboard";

const sourceMap = { web: "Web", email: "Email", api: "API", phone: "Telefone", whatsapp: "WhatsApp" };

function StatCard({ title, value, icon: IconComponent, color, subtitle, to }) {
  const Icon = IconComponent;
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    gray: "bg-muted text-muted-foreground border-border",
  };
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className="block">
      <Card className={`hover:shadow-md transition-shadow ${to ? "cursor-pointer" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color] || colorMap.gray}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}

const COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#f97316", "#10b981", "#6b7280"];

export default function Dashboard() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 200),
  });
  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => db.entities.Agent.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["user-accounts"],
    queryFn: () => db.entities.UserAccount.list(),
  });

  const open = tickets.filter(t => t.status === "open").length;
  const inProgress = tickets.filter(t => t.status === "in_progress").length;
  const waiting = tickets.filter(t => t.status === "waiting").length;
  const pendingApproval = tickets.filter(t => t.status === "pending_approval").length;
  const resolved = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
  const emergency = tickets.filter(t => t.priority === "emergency" && !["resolved","closed"].includes(t.status)).length;

  const statusData = [
    { name: "Aberto", value: open },
    { name: "Em Andamento", value: inProgress },
    { name: "Aguardando", value: waiting },
    { name: "Aguard. Aprovação", value: pendingApproval },
    { name: "Resolvido", value: resolved },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: "Baixa", value: tickets.filter(t => t.priority === "low").length },
    { name: "Normal", value: tickets.filter(t => t.priority === "normal").length },
    { name: "Alta", value: tickets.filter(t => t.priority === "high").length },
    { name: "Emergência", value: tickets.filter(t => t.priority === "emergency").length },
  ];

  const recent = tickets.slice(0, 8);

  // Tickets finalizados por dia (últimos 7 dias)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const label = format(day, "dd/MM", { locale: ptBR });
    const dayStr = format(day, "yyyy-MM-dd");
    const count = tickets.filter(t =>
      ["resolved", "closed"].includes(t.status) &&
      t.closed_date &&
      format(new Date(t.closed_date), "yyyy-MM-dd") === dayStr
    ).length;
    return { label, count };
  });

  // Tempo médio de resposta em minutos (tickets com closed_date e created_date)
  const closedWithDates = tickets.filter(t =>
    ["resolved", "closed"].includes(t.status) && t.closed_date && t.created_date
  );
  const avgMinutes = closedWithDates.length > 0
    ? Math.round(closedWithDates.reduce((sum, t) =>
        sum + differenceInMinutes(new Date(t.closed_date), new Date(t.created_date)), 0
      ) / closedWithDates.length)
    : null;

  const avgLabel = avgMinutes === null ? "—"
    : avgMinutes < 60 ? `${avgMinutes}min`
    : `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}min`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do helpdesk</p>
        </div>
        <Badge variant="outline" className="text-xs">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Abertos" value={open} icon={Ticket} color="blue" to="/tickets/todos" />
        <StatCard title="Em Andamento" value={inProgress} icon={Clock} color="amber" to="/tickets/todos" />
        <StatCard title="Aguardando" value={waiting} icon={Clock} color="purple" to="/tickets/todos" />
        <StatCard title="Aguard. Aprovação" value={pendingApproval} icon={ShieldCheck} color="red" to="/tickets/todos?status=pending_approval" />
        <StatCard title="Resolvidos" value={resolved} icon={CheckCircle} color="emerald" to="/tickets/todos" />
        <StatCard title="Emergência" value={emergency} icon={AlertTriangle} color="red" to="/tickets/todos" />
      </div>

      {/* SLA Metrics */}
      <SLADashboard />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tickets por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tickets por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Novos indicadores: Tempo Médio + Volume por dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tempo médio de resolução */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Tempo Médio de Resolução
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-5xl font-bold text-primary">{avgLabel}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Baseado em {closedWithDates.length} ticket{closedWithDates.length !== 1 ? "s" : ""} finalizados
            </p>
          </CardContent>
        </Card>

        {/* Volume de finalizados por dia */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Tickets Finalizados — Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={last7} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, "Finalizados"]} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards + Recent tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick stats */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agentes Ativos</p>
                <p className="text-xl font-bold">{agents.filter(a => a.status === "active").length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Usuários Cadastrados</p>
                <p className="text-xl font-bold">{users.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Tickets</p>
                <p className="text-xl font-bold">{tickets.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent tickets */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Tickets Recentes</CardTitle>
              <Link to="/tickets/todos" className="text-xs text-primary hover:underline">Ver todos</Link>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhum ticket encontrado</div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map(t => (
                    <button key={t.id} onClick={() => openTicketWindow(t.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors w-full text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.user_name || "—"} · {t.department_name || "Sem departamento"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PriorityBadge value={t.priority} />
                        <StatusBadge value={t.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}