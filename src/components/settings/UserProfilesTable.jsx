import { db } from '@/api/flowdeskClient';

import React from "react";

import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff, Check, X } from "lucide-react";

// Defines which screens each profile can access
const profilePermissions = {
  tecnico: {
    label: "Técnico",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    screens: [
      { name: "Dashboard", path: "/" },
      { name: "Meus Tickets", path: "/tickets/meus" },
      { name: "Acesso Remoto", path: "/acesso-remoto" },
      { name: "Videoconferência", path: "/videoconferencia" },
      { name: "Agendamentos", path: "/agendamentos" },
    ]
  },
  analista: {
    label: "Analista",
    cls: "bg-purple-100 text-purple-700 border-purple-200",
    screens: [
      { name: "Dashboard", path: "/" },
      { name: "Todos os Tickets", path: "/tickets/todos" },
      { name: "Meus Tickets", path: "/tickets/meus" },
      { name: "Clientes", path: "/clientes" },
      { name: "Acesso Remoto", path: "/acesso-remoto" },
      { name: "Videoconferência", path: "/videoconferencia" },
      { name: "Agendamentos", path: "/agendamentos" },
      { name: "Base de Conhecimento", path: "/kb/artigos" },
      { name: "Inventário", path: "/inventario" },
      { name: "Contratos", path: "/contratos" },
      { name: "Relatórios", path: "/relatorios" },
    ]
  },
  administrador: {
    label: "Administrador",
    cls: "bg-red-100 text-red-700 border-red-200",
    screens: [
      { name: "Dashboard", path: "/" },
      { name: "Todos os Tickets", path: "/tickets/todos" },
      { name: "Meus Tickets", path: "/tickets/meus" },
      { name: "Clientes", path: "/clientes" },
      { name: "Técnicos", path: "/agentes" },
      { name: "Departamentos", path: "/departamentos" },
      { name: "Equipes", path: "/equipes" },
      { name: "Funções", path: "/funcoes" },
      { name: "Organizações", path: "/organizacoes" },
      { name: "Usuários", path: "/usuarios" },
      { name: "Acesso Remoto", path: "/acesso-remoto" },
      { name: "Videoconferência", path: "/videoconferencia" },
      { name: "Agendamentos", path: "/agendamentos" },
      { name: "Base de Conhecimento", path: "/kb/artigos" },
      { name: "Inventário", path: "/inventario" },
      { name: "Contratos", path: "/contratos" },
      { name: "Financeiro", path: "/financeiro" },
      { name: "Relatórios", path: "/relatorios" },
      { name: "Configurações", path: "/admin/configuracoes" },
      { name: "Escalas de Trabalho", path: "/admin/escala" },
      { name: "Feriados", path: "/admin/feriados" },
      { name: "Planos SLA", path: "/admin/sla" },
      { name: "Sincronizar", path: "/admin/sincronizar" },
      { name: "Log de Auditoria", path: "/admin/auditoria" },
    ]
  },
};

const allScreens = [
  "Dashboard", "Todos os Tickets", "Meus Tickets", "Clientes", "Técnicos",
  "Departamentos", "Equipes", "Funções", "Organizações", "Usuários",
  "Acesso Remoto", "Videoconferência", "Agendamentos", "Base de Conhecimento",
  "Inventário", "Contratos", "Financeiro", "Relatórios",
  "Configurações", "Escalas de Trabalho", "Feriados", "Planos SLA",
  "Sincronizar", "Log de Auditoria",
];

export default function UserProfilesTable() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents-profiles"],
    queryFn: () => db.entities.Agent.list("-created_date", 200),
  });

  const userScreens = (agent) => {
    const perfil = agent.perfil || "tecnico";
    const permissions = profilePermissions[perfil] || profilePermissions.tecnico;
    return new Set(permissions.screens.map(s => s.name));
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (agents.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Nenhum técnico cadastrado.</p>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs font-semibold whitespace-nowrap">Técnico</TableHead>
            <TableHead className="text-xs font-semibold whitespace-nowrap">Email</TableHead>
            <TableHead className="text-xs font-semibold whitespace-nowrap">Perfil</TableHead>
            {allScreens.map(s => (
              <TableHead key={s} className="text-xs font-semibold whitespace-nowrap text-center">{s}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map(agent => {
            const screens = userScreens(agent);
            const cfg = profilePermissions[agent.perfil] || profilePermissions.tecnico;
            return (
              <TableRow key={agent.id} className="hover:bg-muted/20">
                <TableCell className="text-sm font-medium whitespace-nowrap">{agent.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{agent.email}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</Badge>
                </TableCell>
                {allScreens.map(s => (
                  <TableCell key={s} className="text-center">
                    {screens.has(s)
                      ? <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                      : <X className="w-3.5 h-3.5 text-muted-foreground/30 mx-auto" />}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}