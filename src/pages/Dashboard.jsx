import { supabase } from '@/lib/supabase';
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Ticket, Users, Clock, AlertTriangle, CheckCircle, TrendingUp, UserCog, BookOpen, ShieldCheck, MessageSquare, Settings, FolderOpen, BarChart3, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { subDays, differenceInMinutes } from "date-fns";
import SLADashboard from "@/components/dashboard/SLADashboard";
import { cn } from "@/lib/utils";

const COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#f97316", "#10b981", "#6b7280"];

function StatCard({ title, value, icon: IconComponent, color, subtitle, onClick }) {
  const Icon = IconComponent;
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    gray: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Card className="hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]" onClick={onClick}>
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
  );
}

function QuickLink({ icon: Icon, label, to, color }) {
  return (
    <Link to={to} className="block">
      <Card className={`hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] border-l-4 border-l-${color}-500`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-${color}-100 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState(null);

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*").in("role", ["admin", "agent"]);
      return data || [];
    },
  });

  const open = tickets.filter(t => t.status === "open").length;
  const inProgress = tickets.filter(t => t.status === "in_progress").length;
  const waiting = tickets.filter(t => t.status === "waiting").length;
  const pendingApproval = tickets.filter(t => t.status === "pending_approval").length;
  const resolved = tickets.filter(t => t.status === "resolved").length;
  const closed = tickets.filter(t => t.status === "closed").length;
  const emergency = tickets.filter(t => t.priority === "emergency" && !["resolved", "closed"].includes(t.status)).length;
  const totalActive = open + inProgress + waiting + pendingApproval;

  const statusData = [
    { name: "Pendente", value: open },
    { name: "Em Atendimento", value: inProgress },
    { name: "Aguardando", value: waiting },
    { name: "Aguard. Aprovação", value: pendingApproval },
    { name: "Resolvido", value: resolved },
    { name: "Finalizado", value: closed },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: "Baixa", value: tickets.filter(t => t.priority === "low").length },
    { name: "Média", value: tickets.filter(t => t.priority === "normal").length },
    { name: "Alta", value: tickets.filter(t => t.priority === "high").length },
    { name: "Crítica", value: tickets.filter(t => t.priority === "emergency").length },
  ];

  const recent = tickets.slice(0, 8);

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

  const closedWithDates = tickets.filter(t =>
    ["resolved", "closed"].includes(t.status) && t.closed_date && t.created_at
  );
  const avgMinutes = closedWithDates.length > 0
    ? Math.round(closedWithDates.reduce((sum, t) =>
        sum + differenceInMinutes(new Date(t.closed_date), new Date(t.created_at)), 0
      ) / closedWithDates.length)
    : null;

  const avgLabel = avgMinutes === null ? "—"
    : avgMinutes < 60 ? `${avgMinutes}min`
    : `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}min`;

  const isLoading = loadingTickets || loadingAgents;

  const filteredTickets = useMemo(() => {
    if (!selectedFilter) return [];
    return tickets.filter(t => {
      if (selectedFilter.type === "status") return t.status === selectedFilter.value;
      if (selectedFilter.type === "priority") return t.priority === selectedFilter.value && !["resolved", "closed"].includes(t.status);
      return false;
    });
  }, [selectedFilter, tickets]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do FlowDesk</p>
        </div>
        <Badge variant="outline" className="text-xs">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}</Badge>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Abertos" value={open} icon={Ticket} color="blue" onClick={() => setSelectedFilter({ type: "status", value: "open", label: "Tickets Abertos" })} />
        <StatCard title="Em Atendimento" value={inProgress} icon={Clock} color="amber" onClick={() => setSelectedFilter({ type: "status", value: "in_progress", label: "Em Atendimento" })} />
        <StatCard title="Aguardando" value={waiting} icon={Clock} color="purple" onClick={() => setSelectedFilter({ type: "status", value: "waiting", label: "Aguardando" })} />
        <StatCard title="Aprovação" value={pendingApproval} icon={ShieldCheck} color="orange" onClick={() => setSelectedFilter({ type: "status", value: "pending_approval", label: "Aguardando Aprovação" })} />
        <StatCard title="Resolvidos" value={resolved} icon={CheckCircle} color="emerald" onClick={() => setSelectedFilter({ type: "status", value: "resolved", label: "Tickets Resolvidos" })} />
        <StatCard title="Críticos" value={emergency} icon={AlertTriangle} color="red" onClick={() => setSelectedFilter({ type: "priority", value: "emergency", label: "Tickets Críticos" })} />
      </div>

      {/* SLA Metrics */}
      <SLADashboard />

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickLink icon={Ticket} label="Todos os Tickets" to="/tickets/todos" color="blue" />
          <QuickLink icon={MessageSquare} label="Meus Atendimentos" to="/tickets/meus" color="amber" />
          <QuickLink icon={ShieldCheck} label="Fila de Aprovação" to="/tickets/aprovacao" color="orange" />
          <QuickLink icon={CheckCircle} label="Histórico" to="/tickets/historico" color="emerald" />
          <QuickLink icon={UserCog} label="Agentes" to="/agentes" color="purple" />
          <QuickLink icon={BarChart3} label="Relatórios" to="/relatorios" color="red" />
          <QuickLink icon={FolderOpen} label="Categorias" to="/admin/categorias" color="blue" />
          <QuickLink icon={Settings} label="Configurações" to="/admin/configuracoes" color="gray" />
          <QuickLink icon={BookOpen} label="Base de Conhecimento" to="/kb/artigos" color="green" />
          <QuickLink icon={Users} label="Usuários" to="/usuarios" color="cyan" />
        </div>
      </div>

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
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={11}>
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
            <ResponsiveContainer width="100%" height={220}>
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

      {/* Tempo Médio + Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/tickets/historico")}>
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

      {/* Resumo + Tickets Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/agentes")}>
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
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/usuarios")}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de Usuários</p>
                <p className="text-xl font-bold">{agents.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/tickets/todos")}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tickets Ativos</p>
                <p className="text-xl font-bold">{totalActive}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/tickets/historico")}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Finalizados Hoje</p>
                <p className="text-xl font-bold">{closed}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Tickets Recentes</CardTitle>
              <Link to="/tickets/todos" className="text-xs text-primary hover:underline font-medium">Ver todos →</Link>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhum ticket encontrado</div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map(t => (
                    <button key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors w-full text-left">
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

      <Dialog open={!!selectedFilter} onOpenChange={() => setSelectedFilter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedFilter?.label} ({filteredTickets.length})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket nesta categoria.</p>
            ) : (
              filteredTickets.map(ticket => (
                <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{ticket.number || ticket.id?.slice(0, 8)}</span>
                      <PriorityBadge value={ticket.priority} />
                      <StatusBadge value={ticket.status} />
                    </div>
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    {ticket.user_name && <p className="text-xs text-muted-foreground">{ticket.user_name}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => { setSelectedFilter(null); navigate(`/tickets/${ticket.id}`); }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
