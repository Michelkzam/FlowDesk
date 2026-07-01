import { db } from '@/api/flowdeskClient';

import { useState } from "react";

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
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { usePermissions } from "@/hooks/usePermissions";

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

function exportCSV(clients) {
  const headers = ["Razão Social","Nome Fantasia","CNPJ","Cidade","Estado","Contato","Telefone","Email","Status"];
  const rows = clients.map(c => [
    c.razao_social || "", c.nome_fantasia || "", c.cnpj || "", c.cidade || "",
    c.estado || "", c.contato_principal || "", c.telefone || "", c.email_financeiro || "",
    c.status || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `empresas_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
  a.click();
}

const emptyForm = {
  razao_social: "", nome_fantasia: "", endereco: "", cidade: "", estado: "",
  cnpj: "", inscricao_estadual: "", contato_principal: "", telefone: "",
  email_financeiro: "", observacoes: "", status: "active",
};

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list("-created_date", 300),
  });

  const filtered = clients.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.razao_social || "").toLowerCase().includes(s) ||
      (c.nome_fantasia || "").toLowerCase().includes(s) ||
      (c.cnpj || "").toLowerCase().includes(s) ||
      (c.cidade || "").toLowerCase().includes(s) ||
      (c.contato_principal || "").toLowerCase().includes(s) ||
      (c.email_financeiro || "").toLowerCase().includes(s);
  });

  const createM = useMutation({
    mutationFn: data => db.entities.Client.create({ ...data, name: data.razao_social || data.nome_fantasia || "Sem nome" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); toast({ title: "Sucesso", description: "Empresa criada com sucesso!" }); },
    onError: (err) => { console.error("[Clientes]", err); toast({ title: "Erro", description: "Falha ao criar empresa: " + (err.message || "Erro desconhecido"), variant: "destructive" }); },
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.Client.update(id, { ...data, name: data.razao_social || data.nome_fantasia || "Sem nome" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); toast({ title: "Sucesso", description: "Empresa atualizada com sucesso!" }); },
    onError: (err) => { console.error("[Clientes]", err); toast({ title: "Erro", description: "Falha ao atualizar: " + (err.message || "Erro desconhecido"), variant: "destructive" }); },
  });
  const deleteM = useMutation({
    mutationFn: id => db.entities.Client.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      razao_social: c.razao_social || "", nome_fantasia: c.nome_fantasia || "",
      endereco: c.endereco || "", cidade: c.cidade || "", estado: c.estado || "",
      cnpj: c.cnpj || "", inscricao_estadual: c.inscricao_estadual || "",
      contato_principal: c.contato_principal || "", telefone: c.telefone || "",
      email_financeiro: c.email_financeiro || "", observacoes: c.observacoes || "",
      status: c.status || "active",
    });
    setOpen(true);
  };
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
          <h1 className="text-xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} empresa{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => exportCSV(filtered)}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
          {can("users.manage") && (
            <Button size="sm" onClick={openNew} className="gap-1.5 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Nova Empresa
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Buscar por razão social, CNPJ, cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Razão Social</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Fantasia</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">CNPJ</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Cidade/UF</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Contato</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Telefone</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground py-2.5">Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Nenhuma empresa encontrada</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/20">
                  <TableCell className="py-2.5 font-medium text-sm">{c.razao_social || c.name || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{c.nome_fantasia || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground font-mono text-xs">{c.cnpj || c.document || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{[c.cidade, c.estado].filter(Boolean).join("/") || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{c.contato_principal || "—"}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{c.telefone || c.phone || "—"}</TableCell>
                  <TableCell className="py-2.5"><StatusBadge value={c.status} /></TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex gap-1">
                      {can("users.manage") && (
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      )}
                      {can("users.manage") && (
                        <button onClick={() => { if (confirm("Excluir esta empresa?")) deleteM.mutate(c.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Razão Social *</Label>
                <Input required value={form.razao_social} onChange={e => set("razao_social", e.target.value)} placeholder="Razão social da empresa" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Nome de Fantasia</Label>
                <Input value={form.nome_fantasia} onChange={e => set("nome_fantasia", e.target.value)} placeholder="Nome fantasia" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={e => set("endereco", e.target.value)} placeholder="Rua, número, bairro, complemento" />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-1">
                <Label>Estado (UF)</Label>
                <Select value={form.estado} onValueChange={v => set("estado", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1">
                <Label>Inscrição Estadual</Label>
                <Input value={form.inscricao_estadual} onChange={e => set("inscricao_estadual", e.target.value)} placeholder="IE" />
              </div>
              <div className="space-y-1">
                <Label>Contato Principal *</Label>
                <Input required value={form.contato_principal} onChange={e => set("contato_principal", e.target.value)} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Email</Label>
                <Input type="email" value={form.email_financeiro} onChange={e => set("email_financeiro", e.target.value)} placeholder="email@empresa.com" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Observações gerais" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
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