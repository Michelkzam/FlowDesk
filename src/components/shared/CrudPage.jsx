import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";

export default function CrudPage({
  title, subtitle, entityApi, queryKey, columns, formFields, defaultValues = {}
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(defaultValues);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => entityApi.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entityApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entityApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entityApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormData(defaultValues);
  };

  const openCreate = () => {
    setFormData(defaultValues);
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setFormData(item);
    setEditing(item);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredItems = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return columns.some(col => {
      const val = item[col.key];
      return val && String(val).toLowerCase().includes(s);
    });
  });

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      <Card className="border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columns.map(col => (
                    <TableHead key={col.key} className="text-xs font-semibold uppercase tracking-wider">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold uppercase tracking-wider w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      {columns.map(col => (
                        <TableCell key={col.key} className="text-sm">
                          {col.render ? col.render(item[col.key], item) : (
                            col.type === "status" ? (
                              <Badge variant="outline" className={
                                item[col.key] === "active" || item[col.key] === "online" || item[col.key] === "connected"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item[col.key] === "busy" || item[col.key] === "pending"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-muted text-muted-foreground border-border"
                              }>
                                {item[col.key]}
                              </Badge>
                            ) : col.type === "date" && item[col.key] ? (
                              format(new Date(item[col.key]), "dd/MM/yyyy")
                            ) : (
                              item[col.key] || "—"
                            )
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} {title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm font-medium">{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    value={formData[field.key] || ""}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, [field.key]: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {field.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    type={field.type || "text"}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}