import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PriorityBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, User, Clock } from "lucide-react";
import { openTicketWindow } from "@/lib/ticketWindow";

const COLUMNS = [
  { id: "open",             label: "Pendente",           headerColor: "bg-yellow-400",  textColor: "text-yellow-800" },
  { id: "in_progress",      label: "Em Atendimento",     headerColor: "bg-blue-500",    textColor: "text-white" },
  { id: "waiting",          label: "Aguardando",         headerColor: "bg-purple-500",  textColor: "text-white" },
  { id: "pending_approval", label: "Aguard. Aprovacao",  headerColor: "bg-orange-500",  textColor: "text-white" },
  { id: "resolved",         label: "Resolvido",          headerColor: "bg-green-500",   textColor: "text-white" },
  { id: "closed",           label: "Finalizado",         headerColor: "bg-muted0",    textColor: "text-white" },
];

const priorityBorder = {
  emergency: "border-l-4 border-l-red-500",
  high: "border-l-4 border-l-orange-400",
  normal: "border-l-4 border-l-blue-400",
  low: "border-l-4 border-l-gray-300",
};

function TicketCard({ ticket, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(ticket)}
      className={`bg-white rounded-lg shadow-sm border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow min-w-0 ${priorityBorder[ticket.priority] || "border-l-4 border-l-gray-300"}`}
    >
      <div className="p-2.5 space-y-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-xs font-semibold leading-snug line-clamp-2 min-w-0">{ticket.title}</p>
          <button onClick={e => { e.stopPropagation(); openTicketWindow(ticket.id); }} className="shrink-0">
            <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-blue-500" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <PriorityBadge value={ticket.priority} className="text-[10px] px-1.5 py-0" />
          {ticket.number && <span className="text-muted-foreground text-[10px] font-mono">{ticket.number}</span>}
        </div>
        {ticket.user_name && (
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] min-w-0">
            <User className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate min-w-0">{ticket.user_name}</span>
          </div>
        )}
        {ticket.department_name && (
          <div className="text-[10px] text-muted-foreground truncate min-w-0">{ticket.department_name}</div>
        )}
        {ticket.created_date && (
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] shrink-0">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            {format(new Date(ticket.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ column, tickets, onDragStart, onDrop, onDragOver }) {
  return (
    <div
      className="flex flex-col min-w-0 rounded-lg border border-border bg-muted overflow-hidden"
      onDragOver={e => { e.preventDefault(); onDragOver(column.id); }}
      onDrop={() => onDrop(column.id)}
    >
      <div className={`${column.headerColor} rounded-t-lg px-2.5 py-1.5 flex items-center justify-between min-w-0`}>
        <span className={`text-[11px] font-bold truncate min-w-0 ${column.textColor}`}>{column.label}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-white/25 ${column.textColor} font-bold shrink-0`}>{tickets.length}</span>
      </div>
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-150px)] min-w-0">
        {tickets.map(t => (
          <TicketCard key={t.id} ticket={t} onDragStart={onDragStart} />
        ))}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-10 text-[10px] text-muted-foreground border border-dashed border-border rounded-lg">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tickets }) {
  const [dragging, setDragging] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => db.entities.Ticket.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const handleDrop = (targetStatus) => {
    if (dragging && dragging.status !== targetStatus) {
      updateMutation.mutate({ id: dragging.id, status: targetStatus });
    }
    setDragging(null);
    setOverCol(null);
  };

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tickets.filter(t => t.status === col.id);
    return acc;
  }, {});

  return (
    <div className="w-full overflow-hidden" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "6px" }}>
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col.id}
          column={col}
          tickets={grouped[col.id] || []}
          onDragStart={setDragging}
          onDrop={handleDrop}
          onDragOver={setOverCol}
        />
      ))}
    </div>
  );
}
