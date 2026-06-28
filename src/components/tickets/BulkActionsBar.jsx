import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, CheckSquare } from "lucide-react";

export default function BulkActionsBar({ selectedIds, onClear }) {
  const queryClient = useQueryClient();
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAgent, setBulkAgent] = useState("");

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: () => db.entities.Agent.list() });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const updates = {};
      if (bulkStatus) updates.status = bulkStatus;
      if (bulkAgent) {
        const ag = agents.find(a => a.id === bulkAgent);
        updates.agent_id = bulkAgent;
        updates.agent_name = ag?.name || "";
      }
      await Promise.all(selectedIds.map(id => db.entities.Ticket.update(id, updates)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setBulkStatus("");
      setBulkAgent("");
      onClear();
    }
  });

  return (
    <div className="flex flex-wrap items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
      <span className="text-sm font-medium text-primary">{selectedIds.length} selecionado{selectedIds.length !== 1 ? "s" : ""}</span>
      <div className="flex items-center gap-2 ml-2">
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Alterar status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="waiting">Aguardando</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bulkAgent} onValueChange={setBulkAgent}>
          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Atribuir técnico..." /></SelectTrigger>
          <SelectContent>
            {agents.filter(a => a.status === "active").map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-7 text-xs" disabled={(!bulkStatus && !bulkAgent) || applyMutation.isPending}
          onClick={() => applyMutation.mutate()}>
          Aplicar
        </Button>
      </div>
      <button onClick={onClear} className="ml-auto text-muted-foreground hover:text-foreground p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}