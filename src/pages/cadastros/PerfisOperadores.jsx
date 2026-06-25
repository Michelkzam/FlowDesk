import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const LEVEL_OPTIONS = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
];

const ALL_PERMISSIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clientes", label: "Cadastros > Clientes" },
  { key: "usuarios", label: "Cadastros > Usuários" },
  { key: "perfis_usuarios", label: "Cadastros > Perfis de Usuários" },
  { key: "operadores", label: "Cadastros > Operadores" },
  { key: "perfis_operadores", label: "Cadastros > Perfis de Operadores" },
  { key: "equipes", label: "Cadastros > Equipes" },
  { key: "categorias", label: "Cadastros > Categorias" },
  { key: "setores", label: "Cadastros > Setores" },
  { key: "feriados", label: "Cadastros > Feriados" },
  { key: "expedientes", label: "Cadastros > Expedientes" },
  { key: "documentos", label: "Cadastros > Documentos" },
  { key: "chats", label: "Chat > Chats" },
  { key: "historico", label: "Chat > Histórico" },
  { key: "filas", label: "Chat > Filas de Atendimento" },
  { key: "vincular_whatsapp", label: "Chat > Vincular WhatsApp" },
  { key: "vincular_telegram", label: "Chat > Vincular Telegram" },
  { key: "tickets", label: "Tickets > Listagem" },
  { key: "agenda", label: "Agenda" },
  { key: "meu_perfil", label: "Meu Perfil" },
];

export default function PerfisOperadores() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: "", level: "junior", description: "", permissions: [], status: "active" });
  const [selectAll, setSelectAll] = useState(false);
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["operator-profiles"],
    queryFn: () => db.entities.OperatorProfile.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.OperatorProfile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["operator-profiles"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.OperatorProfile.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["operator-profiles"] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.OperatorProfile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operator-profiles"] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormData({ name: "", level: "junior", description: "", permissions: [], status: "active" });
    setSelectAll(false);
  };

  const openEdit = (p) => {
    setFormData({ ...p, permissions: p.permissions || [] });
    setEditing(p);
    setSelectAll((p.permissions || []).length === ALL_PERMISSIONS.length);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setFormData({ name: "", level: "junior", description: "", permissions: [], status: "active" });
    setEditing(null);
    setSelectAll(false);
    setDialogOpen(true);
  };

  const togglePerm = (key) => {
    setFormData(prev => {
      const perms = prev.permissions || [];
      const has = perms.includes(key);
      const updated = has ? perms.filter(p => p !== key) : [...perms, key];
      setSelectAll(updated.length === ALL_PERMISSIONS.length);
      return { ...prev, permissions: updated };
    });
  };

  const toggleAll = (v) => {
    setSelectAll(v);
    setFormData(prev => ({ ...prev, permissions: v ? ALL_PERMISSIONS.map(p => p.key) : [] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filtered = profiles.filter(p => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()));

  const levelLabel = { junior: "Júnior", pleno: "Pleno", senior: "Sênior" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Perfis de Operadores</h1>
          <p className="text-sm text-muted-foreground">Gerencie os perfis e permissões de acesso</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase">Nome</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Nível</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Permissões</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum perfil encontrado</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        p.level === "senior" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        p.level === "pleno" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-muted text-muted-foreground border-border"
                      }>
                        {levelLabel[p.level] || p.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(p.permissions || []).length} permissões</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}>
                        {p.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Perfil de Operador</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nome do perfil" required />
              </div>
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Select value={formData.level} onValueChange={(v) => setFormData(p => ({ ...p, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.description || ""}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrição do perfil"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Permissões de Acesso</Label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-primary">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="rounded"
                  />
                  Selecionar tudo
                </label>
              </div>
              <div className="border border-border rounded-xl p-3 space-y-2 max-h-52 overflow-y-auto bg-muted/20">
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm.key} className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={(formData.permissions || []).includes(perm.key)}
                      onChange={() => togglePerm(perm.key)}
                      className="rounded"
                    />
                    <span className="text-sm">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}