import { db } from '@/api/flowdeskClient';
import { playSystemSound } from '@/lib/soundSystem';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Search, Pencil, RefreshCw, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  open: { label: "Pendente", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  in_progress: { label: "Em Atendimento", class: "bg-amber-100 text-amber-700 border-amber-200" },
  waiting: { label: "Aguardando", class: "bg-purple-100 text-purple-700 border-purple-200" },
  pending_approval: { label: "Aguard. Aprovação", class: "bg-orange-100 text-orange-700 border-orange-200" },
  resolved: { label: "Resolvido", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Finalizado", class: "bg-muted text-muted-foreground border-border" },
};

const priorityConfig = {
  low: { label: "Baixa", class: "bg-muted text-muted-foreground" },
  normal: { label: "Média", class: "bg-blue-100 text-blue-700" },
  high: { label: "Alta", class: "bg-amber-100 text-amber-700" },
  emergency: { label: "Crítica", class: "bg-red-100 text-red-700" },
};

const channelEmoji = { whatsapp: "🟢", telegram: "🔵", email: "📧", phone: "📞", portal: "🌐" };

export default function ListagemTickets() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", priority: "normal", status: "open", channel: "portal", client_name: "" });
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => db.entities.Ticket.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Ticket.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); closeDialog(); playSystemSound('new_ticket'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Ticket.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); closeDialog(); },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTicket(null);
    setFormData({ title: "", description: "", priority: "normal", status: "open", channel: "portal", client_name: "" });
  };

  const openEdit = (ticket) => {
    setFormData(ticket);
    setEditingTicket(ticket);
    setDialogOpen(true);
  };

  const reopenTicket = (ticket) => {
    updateMutation.mutate({ id: ticket.id, data: { ...ticket, status: "open" } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTicket) updateMutation.mutate({ id: editingTicket.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filtered = tickets.filter(t => {
    const matchSearch = !search || (t.title || "").toLowerCase().includes(search.toLowerCase()) || (t.client_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    const matchChannel = filterChannel === "all" || t.channel === filterChannel;
    return matchSearch && matchStatus && matchPriority && matchChannel;
  });

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Listagem de Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os chamados do sistema</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Abrir Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border border-border">
        <div className="flex flex-wrap items-end gap-3">
          <Filter className="w-4 h-4 text-muted-foreground mb-2" />
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar ticket..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(statusConfig).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Prioridades</SelectItem>
              {Object.entries(priorityConfig).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); setFilterChannel("all"); }}>
            Limpar
          </Button>
        </div>
      </Card>

      <Card className="border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase">#</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Título</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Cliente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Operador</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Canal</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Prioridade</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Data</TableHead>
                  <TableHead className="text-xs font-semibold uppercase w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum ticket encontrado</TableCell></TableRow>
                ) : filtered.map(ticket => {
                  const st = statusConfig[ticket.status] || statusConfig.open;
                  const pr = priorityConfig[ticket.priority] || priorityConfig.medium;
                  return (
                    <TableRow key={ticket.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground font-mono">{ticket.id?.slice(-6)}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[180px] truncate">{ticket.title}</TableCell>
                      <TableCell className="text-sm">{ticket.client_name || "—"}</TableCell>
                      <TableCell className="text-sm">{ticket.operator_name || "—"}</TableCell>
                      <TableCell className="text-sm">{channelEmoji[ticket.channel]} {ticket.channel || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={st.class}>{st.label}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={pr.class}>{pr.label}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ticket.created_date ? format(new Date(ticket.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEdit(ticket)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reabrir" onClick={() => reopenTicket(ticket)}>
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Agendar">
                            <Calendar className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTicket ? "Editar Ticket" : "Abrir Novo Ticket"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Título do ticket" required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={formData.client_name || ""} onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))} placeholder="Nome do cliente" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData(p => ({ ...p, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={formData.category_name || ""} onChange={(e) => setFormData(p => ({ ...p, category_name: e.target.value }))} placeholder="Categoria" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.description || ""}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Descreva o problema..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{editingTicket ? "Salvar" : "Criar Ticket"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}