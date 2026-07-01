import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { playSystemSound } from "@/lib/soundSystem";
import { Ticket, Clock } from "lucide-react";

const CATEGORIES = [
  { id: "ti_infra", name: "TI / Infraestrutura", color: "bg-blue-100 text-blue-700" },
  { id: "sistemas_software", name: "Sistemas / Software", color: "bg-purple-100 text-purple-700" },
  { id: "financeiro", name: "Financeiro", color: "bg-emerald-100 text-emerald-700" },
  { id: "rh_dp", name: "RH / Departamento Pessoal", color: "bg-amber-100 text-amber-700" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa", sla: "48h úteis", color: "bg-zinc-100 text-zinc-700", icon: "🟢" },
  { value: "normal", label: "Normal", sla: "24h úteis", color: "bg-blue-100 text-blue-700", icon: "🔵" },
  { value: "high", label: "Alta", sla: "8h úteis", color: "bg-amber-100 text-amber-700", icon: "🟠" },
  { value: "emergency", label: "Crítica", sla: "2h úteis", color: "bg-red-100 text-red-700", icon: "🔴" },
];

const SOURCES = [
  { value: "web", label: "Web" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
];

const defaultForm = {
  title: "",
  description: "",
  priority: "normal",
  source: "web",
  category_id: "",
  category_name: "",
  user_name: "",
  user_email: "",
  user_phone: "",
  client_name: "",
  department_id: "",
  department_name: "",
};

export default function NewTicketDialog({ open, onClose }) {
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          supabase.from('users').select('client_id, client_name, full_name, email, phone').eq('id', data.user.id).single().then(({ data: profile }) => {
            if (profile) {
              setForm(p => ({
                ...p,
                client_name: profile.client_name || "",
                user_name: profile.full_name || "",
                user_email: profile.email || "",
                user_phone: profile.phone || "",
              }));
            }
          });
        }
      });
    }
  }, [open]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name');
      return data || [];
    }
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('id, full_name, email').in('role', ['admin', 'agent']).eq('status', 'active').order('full_name');
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const ticketData = {
        title: data.title,
        description: data.description,
        status: "open",
        priority: data.priority,
        source: data.source,
        channel: data.source,
        user_id: user.id,
        user_name: data.user_name,
        user_email: data.user_email,
        user_phone: data.user_phone,
        client_name: data.client_name,
        department_id: data.department_id || null,
        department_name: data.department_name,
        category_id: data.category_id || null,
        category_name: data.category_name,
        agent_id: data.agent_id || null,
        agent_name: data.agent_name || null,
        number: `#${Date.now().toString().slice(-6)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setForm(defaultForm);
      onClose();
      playSystemSound('new_ticket');
      navigate(`/tickets/${newTicket.id}`);
    },
    onError: (error) => {
      console.error("[NewTicket] Erro ao criar:", error);
    }
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const selectedPriority = PRIORITIES.find(p => p.value === form.priority);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Abrir Novo Ticket
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4 py-2">
          {/* Informações do Usuário */}
          <div className="p-4 bg-muted/30 rounded-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações do Usuário</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.user_name} onChange={e => set("user_name", e.target.value)} placeholder="Nome completo" required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.user_email} onChange={e => set("user_email", e.target.value)} placeholder="email@exemplo.com" required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.user_phone} onChange={e => set("user_phone", e.target.value)} placeholder="(00) 00000-0000" className="h-9 text-sm" />
              </div>
            </div>
          </div>

          {/* Chamado */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Assunto *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Descreva brevemente o problema..." required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Detalhes do problema..."
              />
            </div>
          </div>

          {/* Categoria e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Categoria *</Label>
              <Select value={form.category_id} onValueChange={v => {
                const cat = CATEGORIES.find(c => c.id === v);
                set("category_id", v);
                set("category_name", cat?.name || "");
              }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prioridade *</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground ml-auto">({p.sla})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SLA Info */}
          {selectedPriority && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${selectedPriority.color}`}>
              <Clock className="w-4 h-4" />
              <span className="font-medium">SLA: {selectedPriority.sla}</span>
              <span className="text-muted-foreground ml-1">• Prazo para primeira resposta</span>
            </div>
          )}

          {/* Origem e Departamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Select value={form.source} onValueChange={v => set("source", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Select value={form.department_id || "none"} onValueChange={v => {
                const dept = departments.find(d => d.id === v);
                set("department_id", v === "none" ? "" : v);
                set("department_name", dept?.name || "");
              }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Atribuir Agente */}
          <div className="space-y-1">
            <Label className="text-xs">Atribuir Agente</Label>
            <Select value={form.agent_id || "none"} onValueChange={v => {
              const ag = agents.find(a => a.id === v);
              set("agent_id", v === "none" ? "" : v);
              set("agent_name", ag?.full_name || "");
            }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Nenhum (sem atribuição)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Abrir Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
