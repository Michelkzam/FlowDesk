import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Monitor, Package, Key, Cpu, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const typeIcons = { hardware: Monitor, software: Package, license: Key, other: Cpu };
const typeLabels = { hardware: "Hardware", software: "Software", license: "Licença", other: "Outro" };
const statusColors = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-amber-100 text-amber-700 border-amber-200",
  retired: "bg-red-100 text-red-700 border-red-200",
};
const statusLabels = { active: "Ativo", inactive: "Inativo", maintenance: "Em Manutenção", retired: "Aposentado" };

const defaultForm = { name: "", type: "hardware", status: "active", serial: "", model: "", brand: "", client_name: "", location: "", notes: "" };

export default function InventarioPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const qc = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => db.entities.Asset.list("-created_date", 500),
  });

  const createM = useMutation({
    mutationFn: d => db.entities.Asset.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); closeDialog(); },
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.Asset.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); closeDialog(); },
  });
  const deleteM = useMutation({
    mutationFn: id => db.entities.Asset.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openEdit = (a) => { setForm(a); setEditing(a); setDialogOpen(true); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateM.mutate({ id: editing.id, data: form });
    else createM.mutate(form);
  };

  const filtered = assets.filter(a => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (a.name || "").toLowerCase().includes(s) ||
        (a.serial || "").toLowerCase().includes(s) ||
        (a.brand || "").toLowerCase().includes(s) ||
        (a.client_name || "").toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inventário</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ativo{filtered.length !== 1 ? "s" : ""} cadastrado{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-primary hover:bg-primary/90 gap-1.5">
          <Plus className="w-4 h-4" /> Novo Ativo
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por nome, serial, cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="license">Licença</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="maintenance">Em Manutenção</SelectItem>
            <SelectItem value="retired">Aposentado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-muted-foreground border-dashed border border-border">
          <Monitor className="w-10 h-10 opacity-30 mb-3" />
          <p className="font-medium">Nenhum ativo encontrado</p>
          <p className="text-sm mt-1">Cadastre equipamentos, softwares e licenças</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const IconComp = typeIcons[a.type] || Cpu;
            return (
              <Card key={a.id} className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow border border-border">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <IconComp className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-1 min-w-0">
                  <div>
                    <p className="text-sm font-semibold truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.brand} {a.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Serial</p>
                    <p className="text-sm font-mono">{a.serial || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-sm truncate">{a.client_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Localização</p>
                    <p className="text-sm truncate">{a.location || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${statusColors[a.status] || ""}`}>{statusLabels[a.status] || a.status}</Badge>
                  <Badge variant="outline" className="text-xs">{typeLabels[a.type] || a.type}</Badge>
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteM.mutate(a.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Ativo" : "Novo Ativo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Notebook Dell Latitude" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="license">Licença</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="maintenance">Em Manutenção</SelectItem>
                    <SelectItem value="retired">Aposentado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input value={form.brand || ""} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Dell, HP, Microsoft..." />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input value={form.model || ""} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Latitude 5520" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Número de Série</Label>
                <Input value={form.serial || ""} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} placeholder="SN-12345" />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={form.client_name || ""} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nome do cliente" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Localização</Label>
              <Input value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ex: Sala 3, andar 2" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createM.isPending || updateM.isPending}>
                {(createM.isPending || updateM.isPending) ? "Salvando..." : (editing ? "Salvar" : "Criar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}