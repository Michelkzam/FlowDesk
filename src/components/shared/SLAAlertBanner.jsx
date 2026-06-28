import { db } from '@/api/flowdeskClient';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AlertTriangle, X, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { openTicketWindow } from "@/lib/ticketWindow";

// Shows a sticky banner when any active ticket is within 2h of SLA deadline or already overdue
export default function SLAAlertBanner() {
  const [dismissed, setDismissed] = useState([]);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list(),
    refetchInterval: 300000, // refresh every 5 minutes
  });

  const now = new Date();
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  const alerts = tickets.filter(t => {
    if (!t.due_date) return false;
    if (["resolved", "closed"].includes(t.status)) return false;
    if (dismissed.includes(t.id)) return false;
    const due = new Date(t.due_date);
    return due - now <= TWO_HOURS; // within 2h or already past
  }).slice(0, 5); // max 5 alerts at once

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-full">
      {alerts.map(t => {
        const due = parseISO(t.due_date);
        const isOverdue = due < now;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-3 rounded-xl shadow-lg border text-sm animate-in slide-in-from-right-5 ${
              isOverdue
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${isOverdue ? "text-red-500" : "text-amber-500"}`}>
              {isOverdue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs uppercase tracking-wide mb-0.5">
                {isOverdue ? "⚠ SLA Vencido" : "⏰ SLA Próximo"}
              </p>
              <button onClick={() => openTicketWindow(t.id)} className="font-medium hover:underline truncate block text-xs text-left">
                {t.number && <span className="font-mono mr-1">[{t.number}]</span>}{t.title}
              </button>
              <p className="text-xs opacity-75 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isOverdue
                  ? `Vencido ${formatDistanceToNow(due, { addSuffix: true, locale: ptBR })}`
                  : `Vence ${formatDistanceToNow(due, { addSuffix: true, locale: ptBR })}`}
              </p>
            </div>
            <button
              onClick={() => setDismissed(d => [...d, t.id])}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}