import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Zap } from "lucide-react";

const typeLabels = { greeting: "Saudação", closing: "Encerramento", info: "Informação", other: "Outro" };
const typeColors = {
  greeting: "bg-blue-100 text-blue-700 border-blue-200",
  closing: "bg-purple-100 text-purple-700 border-purple-200",
  info: "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-muted text-muted-foreground border-border",
};

const defaultForm = { title: "", content: "", type: "greeting", shortcut: "", status: "active" };

export default function RespostasRapidas() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: () => db.entities.QuickReply.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.QuickReply.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quick-replies"] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.QuickReply.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quick-replies"] }); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.QuickReply.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quick-replies"] }),
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };

  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (r) => { setForm(r); setEditing(r); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = replies.filter(r => {
    const matchSearch = !search ||
      (r.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.content || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.shortcut || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || r.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Respostas Rápidas</h1>
          <p className="text-sm text-muted-foreground mt-1">Textos prontos para agilizar o atendimento via WhatsApp</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Nova Resposta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar resposta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "greeting", "closing", "info", "other"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filterType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {t === "all" ? "Todos" : typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-muted-foreground border-dashed border border-border">
          <Zap className="w-10 h-10 opacity-30 mb-3" />
          <p className="font-medium">Nenhuma resposta rápida cadastrada</p>
          <p className="text-sm mt-1">Crie respostas prontas para agilizar seus atendimentos</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(r => (
            <Card key={r.id} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  {r.shortcut && (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block text-primary">{r.shortcut}</code>
                  )}
                </div>
                <Badge variant="outline" className={`text-xs flex-shrink-0 ${typeColors[r.type] || typeColors.other}`}>
                  {typeLabels[r.type] || r.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 flex-1 bg-muted/30 rounded-lg p-2">{r.content}</p>
              <div className="flex items-center gap-1 justify-end pt-1 border-t border-border">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} Resposta Rápida</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Saudação inicial" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greeting">Saudação</SelectItem>
                    <SelectItem value="closing">Encerramento</SelectItem>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Atalho</Label>
                <Input value={form.shortcut || ""} onChange={(e) => setForm(p => ({ ...p, shortcut: e.target.value }))} placeholder="/ola" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Texto da Resposta *</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={form.content}
                onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Digite o texto da resposta aqui..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}