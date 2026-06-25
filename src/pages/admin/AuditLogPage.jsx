import { db } from '@/api/flowdeskClient';

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, User, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS = {
  status_changed: "Status alterado",
  client_edited: "Cliente editado",
  ticket_created: "Ticket criado",
  ticket_updated: "Ticket atualizado",
  ticket_closed: "Ticket fechado",
  agent_changed: "Agente alterado",
};

const ACTION_COLORS = {
  status_changed: "bg-amber-100 text-amber-700",
  client_edited: "bg-blue-100 text-blue-700",
  ticket_created: "bg-emerald-100 text-emerald-700",
  ticket_updated: "bg-purple-100 text-purple-700",
  ticket_closed: "bg-muted text-muted-foreground",
  agent_changed: "bg-cyan-100 text-cyan-700",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => db.entities.AuditLog.list("-created_date", 500),
    refetchInterval: 30000,
  });

  const entityTypes = useMemo(() => [...new Set(logs.map(l => l.entity_type).filter(Boolean))], [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (filterEntity !== "all" && l.entity_type !== filterEntity) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.user_name?.toLowerCase().includes(q) ||
        l.entity_label?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      );
    }
    return true;
  }), [logs, filterAction, filterEntity, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Log de Auditoria</h1>
          <p className="text-sm text-muted-foreground">Registro de todas as ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuário, registro..." className="pl-8 h-9 text-sm" />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {entityTypes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Log list */}
      <Card className="overflow-hidden border border-border">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando logs...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhum log encontrado.</p>
            <p className="text-xs mt-1">Os registros aparecerão aqui conforme as ações forem realizadas.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{log.user_name || "Sistema"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    {log.entity_type && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{log.entity_type}</span>
                    )}
                  </div>
                  {log.entity_label && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">→ {log.entity_label}</p>
                  )}
                  {log.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
                  )}
                  {(log.old_value || log.new_value) && (
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      {log.old_value && <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 line-through">{log.old_value}</span>}
                      {log.new_value && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">{log.new_value}</span>}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {log.created_date ? format(parseISO(log.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}