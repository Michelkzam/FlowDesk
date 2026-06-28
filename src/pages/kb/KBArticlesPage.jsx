import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const defaultForm = { title: "", content: "", category_id: "", category_name: "", keywords: "", visibility: "public", status: "draft" };

export default function KBArticlesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["kb-articles"], queryFn: () => db.entities.KBArticle.list("-created_date") });
  const { data: categories = [] } = useQuery({ queryKey: ["kb-categories"], queryFn: () => db.entities.KBCategory.list() });

  const createM = useMutation({ mutationFn: d => db.entities.KBArticle.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["kb-articles"] }); close(); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => db.entities.KBArticle.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["kb-articles"] }); close(); } });
  const deleteM = useMutation({ mutationFn: id => db.entities.KBArticle.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kb-articles"] }) });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm(item); setEditing(item); setDialogOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = e => {
    e.preventDefault();
    const cat = categories.find(c => c.id === form.category_id);
    const data = { ...form, category_name: cat?.name || form.category_name };
    editing ? updateM.mutate({ id: editing.id, data }) : createM.mutate(data);
  };

  const columns = [
    { key: "title", label: "Título" },
    { key: "category_name", label: "Categoria" },
    { key: "visibility", label: "Visibilidade", render: v => <span className="text-xs">{v === "public" ? "Pública" : "Privada"}</span> },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  return (
    <div>
      <PageHeader title="Artigos" subtitle="Base de conhecimento e FAQs" action={openCreate} actionLabel="Novo Artigo" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["title", "keywords", "category_name"]} />

      <Dialog open={dialogOpen} onOpenChange={close}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Artigo" : "Novo Artigo"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1"><Label>Título *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={v => set("category_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Visibilidade</Label>
                <Select value={form.visibility} onValueChange={v => set("visibility", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="public">Pública</SelectItem><SelectItem value="private">Privada</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Palavras-chave</Label><Input value={form.keywords} onChange={e => set("keywords", e.target.value)} placeholder="Separadas por vírgula" /></div>
            <div className="space-y-1">
              <Label>Conteúdo *</Label>
              <textarea required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-ring resize-none" value={form.content} onChange={e => set("content", e.target.value)} placeholder="Escreva o artigo aqui..." />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="published">Publicado</SelectItem></SelectContent>
              </Select>
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