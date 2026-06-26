import { db } from '@/api/flowdeskClient';

import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Plus, Search, Download, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";

function exportCSV(clients) {
  const headers = ["Nome", "Email", "Telefone", "Empresa", "CPF/CNPJ", "Status", "Cadastrado em"];
  const rows = clients.map(c => [
    c.name || "", c.email || "", c.phone || "", c.company || "",
    c.document || "", c.status || "",
    c.created_date ? format(new Date(c.created_date), "dd/MM/yyyy HH:mm") : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `clientes_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
  a.click();
}

const emptyForm = { name: "", email: "", phone: "", company: "", document: "", status: "active", notes: "" };

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();
  const { can } = usePermissions();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date", 300),
  });

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s) ||
      (c.company || "").toLowerCase().includes(s) ||
      (c.document || "").toLowerCase().includes(s);
  });

  const createM = useMutation({
    mutationFn: data => db.entities.Client.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); },
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.Client.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); },
  });
  const deleteM = useMutation({
    mutationFn: id => db.entities.Client.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name || "", email: c.email || "", phone: c.phone || "", company: c.company || "", document: c.document || "", status: c.status || "active", notes: c.notes || "" }); setOpen(true); };
  const closeDialog = () => { setOpen(false); setEditing(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateM.mutate({ id: editing.id, data: form });
    else createM.mutate(form);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportCSV(filtered)}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
          {can("users.manage") && (
            <Button size="sm" onClick={openNew} className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Novo Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email, empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Nome</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Email</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Telefone</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Empresa</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">CPF/CNPJ</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Nenhum cliente encontrado</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/20">
                  <TableCell className="py-2.5 font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{c.company || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground font-mono text-xs">{c.document || "—"}</TableCell>
                  <TableCell className="py-2.5"><StatusBadge value={c.status} /></TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex gap-1">
                      {can("users.manage") && (
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      {can("users.manage") && (
                        <button onClick={() => { if (confirm("Excluir este cliente?")) deleteM.mutate(c.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Nome *</Label><Input required value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              <div className="space-y-1"><Label>Empresa</Label><Input value={form.company} onChange={e => set("company", e.target.value)} /></div>
              <div className="space-y-1"><Label>CPF/CNPJ</Label><Input value={form.document} onChange={e => set("document", e.target.value)} /></div>
              <div className="space-y-1 col-span-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2"><Label>Observações</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createM.isPending || updateM.isPending}>
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}