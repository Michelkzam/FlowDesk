import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SYSTEM_PAGES } from "@/lib/constants";
import PageHeader from "@/components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Plus, Pencil, Trash2, Check, LayoutDashboard, Ticket, BookOpen, Users, DollarSign, BarChart3, Settings, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  Geral: LayoutDashboard,
  Atendimento: Ticket,
  "Base de Conhecimento": BookOpen,
  Cadastros: Users,
  Financeiro: DollarSign,
  Relatórios: BarChart3,
  Sistema: Settings,
};

const CATEGORY_COLORS = {
  Geral: "bg-blue-50 text-blue-700 border-blue-200",
  Atendimento: "bg-amber-50 text-amber-700 border-amber-200",
  "Base de Conhecimento": "bg-purple-50 text-purple-700 border-purple-200",
  Cadastros: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Financeiro: "bg-green-50 text-green-700 border-green-200",
  Relatórios: "bg-orange-50 text-orange-700 border-orange-200",
  Sistema: "bg-red-50 text-red-700 border-red-200",
};

const defaultForm = { name: "", description: "", pages: [], status: "active" };

export default function UserProfilesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [searchPage, setSearchPage] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(new Set(Object.keys(CATEGORY_ICONS)));
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return (data || []).map(r => {
        let pages = r.pages || [];
        if (typeof pages === "string") { try { pages = JSON.parse(pages); } catch { pages = []; } }
        if (!Array.isArray(pages)) pages = [];
        let permissions = r.permissions || [];
        if (typeof permissions === "string") { try { permissions = JSON.parse(permissions); } catch { permissions = []; } }
        if (!Array.isArray(permissions)) permissions = [];
        return { ...r, pages, permissions };
      });
    },
  });

  const { data: userCounts = {} } = useQuery({
    queryKey: ["profile-user-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("role_id");
      const counts = {};
      (data || []).forEach(u => {
        if (u.role_id) counts[u.role_id] = (counts[u.role_id] || 0) + 1;
      });
      return counts;
    },
  });

  const createM = useMutation({
    mutationFn: async (d) => {
      const pagesArray = Array.isArray(d.pages) ? d.pages : [];
      const { error } = await supabase.from("roles").insert({
        name: d.name,
        description: d.description,
        pages: JSON.stringify(pagesArray),
        permissions: JSON.stringify(pagesArray),
        status: d.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user-profiles"] }); closeDialog(); toast({ title: "Perfil criado com sucesso!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); },
  });

  const updateM = useMutation({
    mutationFn: async ({ id, data }) => {
      const pagesArray = Array.isArray(data.pages) ? data.pages : [];
      const { error } = await supabase.from("roles").update({
        name: data.name,
        description: data.description,
        pages: JSON.stringify(pagesArray),
        permissions: JSON.stringify(pagesArray),
        status: data.status,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user-profiles"] }); closeDialog(); toast({ title: "Perfil atualizado!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); },
  });

  const deleteM = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user-profiles"] }); setDeleteConfirm(null); toast({ title: "Perfil excluído!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message, variant: "destructive" }); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); setSearchPage(""); };

  const openCreate = () => { setEditing(null); setForm({ ...defaultForm, pages: SYSTEM_PAGES.map(p => p.id) }); setDialogOpen(true); };

  const openEdit = (profile) => {
    setEditing(profile);
    const pages = Array.isArray(profile.pages) ? profile.pages : [];
    setForm({ name: profile.name, description: profile.description || "", pages, status: profile.status || "active" });
    setDialogOpen(true);
  };

  const togglePage = (pageId) => {
    setForm(f => ({
      ...f,
      pages: f.pages.includes(pageId) ? f.pages.filter(p => p !== pageId) : [...f.pages, pageId],
    }));
  };

  const toggleCategory = (category) => {
    const categoryPages = SYSTEM_PAGES.filter(p => p.category === category).map(p => p.id);
    setForm(f => {
      const allSelected = categoryPages.every(p => f.pages.includes(p));
      return {
        ...f,
        pages: allSelected ? f.pages.filter(p => !categoryPages.includes(p)) : [...new Set([...f.pages, ...categoryPages])],
      };
    });
  };

  const toggleAllPages = () => {
    setForm(f => ({
      ...f,
      pages: f.pages.length === SYSTEM_PAGES.length ? [] : SYSTEM_PAGES.map(p => p.id),
    }));
  };

  const categories = [...new Set(SYSTEM_PAGES.map(p => p.category))];
  const filteredPages = searchPage
    ? SYSTEM_PAGES.filter(p => p.label.toLowerCase().includes(searchPage.toLowerCase()) || p.category.toLowerCase().includes(searchPage.toLowerCase()))
    : SYSTEM_PAGES;

  const groupedPages = {};
  filteredPages.forEach(p => {
    if (!groupedPages[p.category]) groupedPages[p.category] = [];
    groupedPages[p.category].push(p);
  });

  return (
    <div>
      <PageHeader title="Perfis de Usuário" subtitle="Defina permissões de acesso para cada tipo de usuário" action={openCreate} actionLabel="Novo Perfil" actionIcon={Plus} canCreate={can("users.manage")} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : profiles.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum perfil criado</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie perfis para definir quais páginas cada tipo de usuário pode acessar.</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Criar Primeiro Perfil</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => {
            const pageCount = (profile.pages || []).length;
            const userCount = userCounts[profile.id] || 0;
            return (
              <Card key={profile.id} className="hover:shadow-md transition-all group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{profile.name}</CardTitle>
                        {profile.description && <p className="text-xs text-muted-foreground mt-0.5">{profile.description}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${profile.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {profile.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs text-muted-foreground">{pageCount} página{pageCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">{userCount} usuário{userCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {categories.slice(0, 4).map(cat => {
                      const catPages = SYSTEM_PAGES.filter(p => p.category === cat);
                      const enabledCount = catPages.filter(p => (profile.pages || []).includes(p.id)).length;
                      if (enabledCount === 0) return null;
                      return (
                        <Badge key={cat} variant="outline" className={`text-[10px] ${CATEGORY_COLORS[cat] || ""}`}>
                          {cat}: {enabledCount}/{catPages.length}
                        </Badge>
                      );
                    })}
                    {categories.length > 4 && <Badge variant="outline" className="text-[10px]">+{categories.length - 4}</Badge>}
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(profile)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(profile)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {editing ? "Editar Perfil" : "Novo Perfil de Usuário"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="config" className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="config">Configurações</TabsTrigger>
              <TabsTrigger value="pages">Páginas ({form.pages.length}/{SYSTEM_PAGES.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4 mt-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome do Perfil *</Label>
                  <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Técnico Nível 1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch checked={form.status === "active"} onCheckedChange={v => setForm(f => ({ ...f, status: v ? "active" : "inactive" }))} />
                    <span className="text-sm text-muted-foreground">{form.status === "active" ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do perfil (opcional)" />
              </div>
            </TabsContent>

            <TabsContent value="pages" className="flex-1 flex flex-col min-h-0 mt-4 overflow-hidden">
              <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar página..." value={searchPage} onChange={e => setSearchPage(e.target.value)} className="pl-9" />
                </div>
                <Button variant="outline" size="sm" onClick={toggleAllPages}>
                  {form.pages.length === SYSTEM_PAGES.length ? "Desmarcar Todas" : "Marcar Todas"}
                </Button>
              </div>

              <ScrollArea className="flex-1 pr-2 max-h-[50vh]">
                <div className="space-y-4">
                  {Object.entries(groupedPages).map(([category, pages]) => {
                    const CatIcon = CATEGORY_ICONS[category] || Settings;
                    const allSelected = pages.every(p => form.pages.includes(p.id));
                    const someSelected = pages.some(p => form.pages.includes(p.id));
                    const isExpanded = expandedCategories.has(category);

                    return (
                      <div key={category} className="border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedCategories(prev => {
                              const next = new Set(prev);
                              isExpanded ? next.delete(category) : next.add(category);
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", CATEGORY_COLORS[category])}>
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{category}</p>
                              <p className="text-xs text-muted-foreground">{pages.filter(p => form.pages.includes(p.id)).length}/{pages.length} páginas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleCategory(category); }}
                              className={cn(
                                "w-6 h-6 rounded border flex items-center justify-center transition-colors",
                                allSelected ? "bg-primary border-primary text-white" : someSelected ? "bg-primary/20 border-primary" : "border-border bg-background hover:border-primary"
                              )}
                            >
                              {allSelected && <Check className="w-3.5 h-3.5" />}
                              {someSelected && !allSelected && <div className="w-2.5 h-0.5 bg-primary rounded" />}
                            </button>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border bg-muted/20 p-3 grid grid-cols-2 gap-2">
                            {pages.map(page => {
                              const isSelected = form.pages.includes(page.id);
                              return (
                                <button
                                  key={page.id}
                                  type="button"
                                  onClick={() => togglePage(page.id)}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-all",
                                    isSelected ? "bg-primary/10 border border-primary/30 text-foreground" : "bg-background border border-border text-muted-foreground hover:border-primary/50"
                                  )}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    isSelected ? "bg-primary border-primary text-white" : "border-border"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{page.label}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{page.path}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => { editing ? updateM.mutate({ id: editing.id, data: form }) : createM.mutate(form); }} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? "Salvando..." : editing ? "Atualizar" : "Criar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Perfil</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o perfil <strong>{deleteConfirm?.name}</strong>?
            {userCounts[deleteConfirm?.id] > 0 && (
              <span className="block mt-2 text-amber-600 font-medium">
                ⚠️ {userCounts[deleteConfirm?.id]} usuário(s) estão vinculados a este perfil.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteM.mutate(deleteConfirm?.id)} disabled={deleteM.isPending}>
              {deleteM.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
