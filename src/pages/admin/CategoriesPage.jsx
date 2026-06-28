import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

const DEFAULT_CATEGORIES = [
  { name: "TI / Infraestrutura", description: "Redes, servidores, hardware, infraestrutura", color: "#3b82f6" },
  { name: "Sistemas / Software", description: "Instalação, configuração e suporte a software", color: "#8b5cf6" },
  { name: "Financeiro", description: "Financeiro, faturamento, pagamentos", color: "#10b981" },
  { name: "RH / Departamento Pessoal", description: "Recursos humanos, ponto, benefícios", color: "#f59e0b" },
];

export default function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", color: "#3b82f6" });
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => db.entities.Category.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Category.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Category.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Category.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const cat of DEFAULT_CATEGORIES) {
        const exists = categories.find(c => c.name === cat.name);
        if (!exists) {
          await db.entities.Category.create({ ...cat, status: "active" });
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", color: "#3b82f6" });
  };

  const openEdit = (cat) => {
    setFormData({ name: cat.name, description: cat.description || "", color: cat.color || "#3b82f6" });
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCategory) updateMutation.mutate({ id: editingCategory.id, data: formData });
    else createMutation.mutate({ ...formData, status: "active" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as categorias de atendimento</p>
        </div>
        <div className="flex items-center gap-2">
          {categories.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              <Tag className="w-4 h-4 mr-2" /> Carregar Padrões
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Categoria
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card className="border border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Tag className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-lg font-medium text-foreground">Nenhuma categoria</p>
            <p className="text-sm mt-1">Clique em "Carregar Padrões" ou crie uma nova categoria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} className="border border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: cat.color || "#6b7280" }}
                    >
                      {(cat.name || "?")[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{cat.name}</h3>
                      {cat.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                      if (window.confirm(`Excluir a categoria "${cat.name}"?`)) deleteMutation.mutate(cat.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className={`text-xs ${cat.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}`}>
                    {cat.status === "active" ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: TI / Infraestrutura"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Descreva o escopo desta categoria"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border border-border"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingCategory ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
