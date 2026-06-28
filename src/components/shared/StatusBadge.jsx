import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  open: { label: "Pendente", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  in_progress: { label: "Em Atendimento", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  waiting: { label: "Aguardando", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  pending_approval: { label: "Aguard. Aprovação", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  resolved: { label: "Resolvido", cls: "bg-green-100 text-green-700 border-green-200" },
  closed: { label: "Finalizado", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  active: { label: "Ativo", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  inactive: { label: "Inativo", cls: "bg-muted text-muted-foreground border-border" },
  published: { label: "Publicado", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  draft: { label: "Rascunho", cls: "bg-muted text-muted-foreground border-border" },
};

const priorityConfig = {
  low: { label: "Baixa", cls: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Média", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  high: { label: "Alta", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  emergency: { label: "Crítica", cls: "bg-red-100 text-red-700 border-red-200" },
};

export function StatusBadge({ value }) {
  const cfg = statusConfig[value] || { label: value, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cn("text-xs font-medium", cfg.cls)}>{cfg.label}</Badge>;
}

export function PriorityBadge({ value, className }) {
  const cfg = priorityConfig[value] || { label: value, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cn("text-xs font-medium", cfg.cls, className)}>{cfg.label}</Badge>;
}

export default StatusBadge;