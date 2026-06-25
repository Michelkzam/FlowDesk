import { db } from '@/api/flowdeskClient';

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
import { Plus, Search, Pencil, Trash2, Upload, FileText, ExternalLink } from "lucide-react";

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";

export default function Documentos() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", category: "", status: "active" });
  const [fileUploading, setFileUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.entities.Document.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Document.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Document.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormData({ title: "", description: "", category: "", status: "active" });
  };

  const openCreate = () => {
    setFormData({ title: "", description: "", category: "", status: "active" });
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (doc) => {
    setFormData(doc);
    setEditing(doc);
    setDialogOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    setFormData(p => ({ ...p, file_url, file_name: file.name }));
    setFileUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: formData });
    else createMutation.mutate(formData);
  };

  const filtered = docs.filter(d => !search || (d.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Documentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os documentos do sistema</p>
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
          <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase">Título</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Arquivo</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Categoria</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum documento encontrado</TableCell></TableRow>
                ) : filtered.map(doc => (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium">{doc.title}</TableCell>
                    <TableCell className="text-sm">
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <FileText className="w-3.5 h-3.5" />
                          {doc.file_name || "Abrir arquivo"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{doc.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={doc.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}>
                        {doc.status === "active" ? "Ativo" : "Arquivado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(doc)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(doc.id)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Título do documento" required />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.description || ""}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrição do documento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={formData.category || ""} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="Categoria" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label>Anexar Arquivo</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                {formData.file_url ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <FileText className="w-4 h-4" />
                      {formData.file_name || "Arquivo anexado"}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, file_url: "", file_name: "" }))}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input type="file" accept={ACCEPTED} className="hidden" onChange={handleFileUpload} />
                    <div className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm">{fileUploading ? "Enviando..." : "Clique para anexar arquivo"}</span>
                      <span className="text-xs">PDF, Word, Excel, PowerPoint, TXT</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={fileUploading}>
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}