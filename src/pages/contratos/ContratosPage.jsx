import { db } from '@/api/flowdeskClient';
import { supabase } from '@/lib/supabase';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, AlertTriangle, Pencil, Trash2, Paperclip, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

const statusColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-muted text-muted-foreground border-border",
  expired: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};
const statusLabels = { active: "Ativo", inactive: "Inativo", expired: "Vencido", pending: "Pendente" };

const defaultForm = {
  title: "", client_name: "", type: "support", status: "active",
  start_date: "", end_date: "", value: "", sla_hours: "", notes: "", clauses: "", attachments: []
};

export default function ContratosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [viewingAttachments, setViewingAttachments] = useState(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('*').limit(200);
      if (error) { console.error('[Contratos] Erro:', error); return []; }
      return data || [];
    },
  });

  const createM = useMutation({
    mutationFn: async (d) => {
      const payload = { ...d };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (!payload.value) delete payload.value;
      if (!payload.sla_hours) delete payload.sla_hours;
      const { data, error } = await supabase.from('contracts').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); close_(); toast({ title: "Sucesso", description: "Contrato criado com sucesso!" }); },
    onError: (e) => { console.error('[Contratos] Erro ao criar:', e); toast({ title: "Erro", description: "Erro ao criar contrato: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });
  const updateM = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = { ...data };
      if (!payload.start_date) payload.start_date = null;
      if (!payload.end_date) payload.end_date = null;
      if (!payload.value) payload.value = null;
      if (!payload.sla_hours) payload.sla_hours = null;
      delete payload.id;
      delete payload.created_at;
      const { data: result, error } = await supabase.from('contracts').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); close_(); toast({ title: "Sucesso", description: "Contrato atualizado com sucesso!" }); },
    onError: (e) => { console.error('[Contratos] Erro ao atualizar:', e); toast({ title: "Erro", description: "Erro ao atualizar contrato: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });
  const deleteM = useMutation({
    mutationFn: id => db.entities.Contract.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast({ title: "Sucesso", description: "Contrato excluído com sucesso!" }); },
    onError: (e) => { console.error('[Contratos] Erro ao excluir:', e); toast({ title: "Erro", description: "Erro ao excluir contrato: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });

  const close_ = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openEdit = (c) => { setForm(c); setEditing(c); setDialogOpen(true); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateM.mutate({ id: editing.id, data: form });
    else createM.mutate(form);
  };

  const getExpiryInfo = (end_date) => {
    if (!end_date) return null;
    const days = differenceInDays(parseISO(end_date), new Date());
    if (days < 0) return { label: "Vencido", color: "text-red-600", urgent: true };
    if (days <= 30) return { label: `Vence em ${days}d`, color: "text-amber-600", urgent: true };
    return { label: `Vence em ${days}d`, color: "text-muted-foreground", urgent: false };
  };

  const filtered = contracts.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.title || "").toLowerCase().includes(s) || (c.client_name || "").toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} contrato{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-primary hover:bg-primary/90 gap-1.5">
          <Plus className="w-4 h-4" /> Novo Contrato
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por título ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="expired">Vencido</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-muted-foreground border-dashed border border-border">
          <FileText className="w-10 h-10 opacity-30 mb-3" />
          <p className="font-medium">Nenhum contrato cadastrado</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const expiry = getExpiryInfo(c.end_date);
            return (
              <Card key={c.id} className={`p-4 flex items-center gap-4 hover:shadow-md transition-shadow border border-border ${expiry?.urgent ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-1 min-w-0">
                  <div>
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.client_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Início</p>
                    <p className="text-sm">{c.start_date ? format(parseISO(c.start_date), "dd/MM/yyyy") : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className={`text-sm font-medium ${expiry?.color || ""}`}>
                      {c.end_date ? format(parseISO(c.end_date), "dd/MM/yyyy") : "—"}
                    </p>
                    {expiry?.urgent && (
                      <p className={`text-xs flex items-center gap-1 ${expiry.color}`}>
                        <AlertTriangle className="w-3 h-3" />{expiry.label}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-sm font-medium">{c.value ? `R$ ${parseFloat(c.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(c.attachments || []).length > 0 && (
                    <button onClick={() => setViewingAttachments(c)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer" title="Ver anexos">
                      <Paperclip className="w-3.5 h-3.5" />{c.attachments.length}
                    </button>
                  )}
                  <Badge variant="outline" className={`text-xs ${statusColors[c.status] || ""}`}>{statusLabels[c.status] || c.status}</Badge>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteM.mutate(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Contrato de Suporte Anual" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={form.client_name || ""} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="expired">Vencido</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Início</Label>
                <Input type="date" value={form.start_date || ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data Vencimento</Label>
                <Input type="date" value={form.end_date || ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.value || ""} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>SLA (horas)</Label>
                <Input type="number" value={form.sla_hours || ""} onChange={e => setForm(f => ({ ...f, sla_hours: e.target.value }))} placeholder="8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cláusulas / Regras</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                value={form.clauses || ""} onChange={e => setForm(f => ({ ...f, clauses: e.target.value }))} placeholder="Descreva as cláusulas e regras do contrato..." />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações adicionais..." />
            </div>
            <div className="space-y-1.5">
              <Label>Anexos (contrato, documentos, alterações)</Label>
              <div className="border border-dashed border-border rounded-lg p-3">
                <input type="file" multiple id="contract-files" className="hidden" onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const uploadPromises = files.map(async (file) => {
                    const path = `contracts/${Date.now()}_${file.name}`;
                    const { error } = await supabase.storage.from('contract-attachments').upload(path, file);
                    if (error) { console.error('[Upload]', error); return null; }
                    const { data: urlData } = supabase.storage.from('contract-attachments').getPublicUrl(path);
                    return { name: file.name, size: file.size, type: file.type, url: urlData?.publicUrl || path, path };
                  });
                  const results = (await Promise.all(uploadPromises)).filter(Boolean);
                  setForm(f => ({ ...f, attachments: [...(f.attachments || []), ...results] }));
                  e.target.value = "";
                }} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => document.getElementById("contract-files")?.click()}>
                  <Paperclip className="w-3.5 h-3.5" /> Adicionar arquivo
                </Button>
                {(form.attachments || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {form.attachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted rounded-md px-2.5 py-1.5 text-xs">
                        <a href={att.url || '#'} target="_blank" rel="noopener noreferrer" className="truncate flex-1 text-primary hover:underline">{att.name}</a>
                        <button type="button" onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))} className="ml-2 text-muted-foreground hover:text-destructive">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close_}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createM.isPending || updateM.isPending}>
                {(createM.isPending || updateM.isPending) ? "Salvando..." : (editing ? "Salvar" : "Criar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Attachments Dialog */}
      <Dialog open={!!viewingAttachments} onOpenChange={() => setViewingAttachments(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anexos — {viewingAttachments?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(!viewingAttachments?.attachments || viewingAttachments.attachments.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo</p>
            ) : viewingAttachments.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{att.size ? `${(att.size / 1024).toFixed(1)} KB` : ""}</p>
                </div>
                {att.url && (
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted text-primary transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}