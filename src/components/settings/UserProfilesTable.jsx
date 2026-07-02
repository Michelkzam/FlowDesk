import { supabase } from '@/lib/supabase';
import { db } from '@/api/flowdeskClient';

import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";

import { SYSTEM_PAGES } from "@/lib/constants";

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700 border-red-200",
  supervisor: "bg-purple-100 text-purple-700 border-purple-200",
  agent: "bg-blue-100 text-blue-700 border-blue-200",
};

const PAGE_ID_TO_NAME = {};
SYSTEM_PAGES.forEach(p => { PAGE_ID_TO_NAME[p.id] = p.label; });

const allScreens = SYSTEM_PAGES.map(p => p.label);

export default function UserProfilesTable() {
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["agents-profiles"],
    queryFn: () => db.entities.Agent.list("-created_date", 200),
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*");
      if (error) throw error;
      return (data || []).map(r => {
        let pages = r.pages || [];
        if (typeof pages === "string") { try { pages = JSON.parse(pages); } catch { pages = []; } }
        if (!Array.isArray(pages)) pages = [];
        return { ...r, pages };
      });
    },
  });

  const roleMap = {};
  roles.forEach(r => { roleMap[r.id] = r; });

  const isLoading = loadingAgents || loadingRoles;

  const userScreens = (agent) => {
    const role = roleMap[agent.role_id];
    if (role && Array.isArray(role.pages)) {
      const screenNames = role.pages.map(id => PAGE_ID_TO_NAME[id]).filter(Boolean);
      return new Set(screenNames);
    }
    if (agent.role === 'admin') {
      return new Set(allScreens);
    }
    return new Set();
  };

  const getRoleBadge = (agent) => {
    if (agent.role === 'admin') {
      return { label: "Administrador", cls: ROLE_COLORS.admin };
    }
    const role = roleMap[agent.role_id];
    if (role) {
      return { label: role.name, cls: ROLE_COLORS[agent.role] || "bg-gray-100 text-gray-700 border-gray-200" };
    }
    return { label: agent.role === 'agent' ? "Agente" : "Usuário", cls: ROLE_COLORS[agent.role] || "bg-gray-100 text-gray-700 border-gray-200" };
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
            const badge = getRoleBadge(agent);
            return (
              <TableRow key={agent.id} className="hover:bg-muted/20">
                <TableCell className="text-sm font-medium whitespace-nowrap">{agent.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{agent.email}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="outline" className={`text-xs font-medium ${badge.cls}`}>{badge.label}</Badge>
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