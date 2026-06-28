import { db } from '@/api/flowdeskClient';

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, User, Check } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { ALL_PERMISSIONS_WITH_LABELS, PERMISSION_GROUPS } from "@/lib/constants";

const defaultForm = { name: "", description: "", status: "active" };

export default function ProfilesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => db.entities.Role.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["system-users"],
    queryFn: () => db.entities.User.list(),
  });

  const usersByProfile = {};
  users.forEach(u => {
    if (u.role_id) {
      if (!usersByProfile[u.role_id]) usersByProfile[u.role_id] = [];
      usersByProfile[u.role_id].push(u);
    }
  });

  const adminCount = users.filter(u => u.role === 'admin').length;

  const createM = useMutation({
    mutationFn: d => db.entities.Role.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); close(); toast({ title: "Sucesso", description: "Perfil criado com sucesso!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" }); }
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }) => db.entities.Role.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); close(); toast({ title: "Sucesso", description: "Perfil atualizado com sucesso!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" }); }
  });

  const deleteM = useMutation({
    mutationFn: id => db.entities.Role.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); toast({ title: "Sucesso", description: "Perfil excluído com sucesso!" }); },
    onError: (e) => { toast({ title: "Erro", description: e.message || "Tente novamente.", variant: "destructive" }); }
  });

  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); setSelectedPerms([]); };
  const openCreate = () => { setForm(defaultForm); setEditing(null); setSelectedPerms([]); setDialogOpen(true); };
  const openEdit = (item) => {
    setForm(item);
    setEditing(item);
    setSelectedPerms(item.permissions || []);
    setDialogOpen(true);
  };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const togglePerm = (key) => setSelectedPerms(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  const toggleGroup = (groupPerms) => {
    const allSelected = groupPerms.every(p => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, permissions: selectedPerms };
    editing ? updateM.mutate({ id: editing.id, data }) : createM.mutate(data);
  };

  const columns = [
    {
      key: "name", label: "Perfil", render: (v, row) => (
        <div>
          <span className="font-medium">{v}</span>
          {row.description && <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>}
        </div>
      )
    },
    {
      key: "permissions", label: "Permissões", render: (v) => {
        const count = (v || []).length;
        return <Badge variant="outline" className="text-xs">{count} / {ALL_PERMISSIONS_WITH_LABELS.length}</Badge>;
      }
    },
    {
      key: "_users", label: "Usuários", render: (_, row) => {
        const count = (usersByProfile[row.id] || []).length;
        return <span className="text-xs text-muted-foreground">{count} usuário{count !== 1 ? "s" : ""}</span>;
      }
    },
    { key: "status", label: "Status", render: v => <StatusBadge value={v} /> },
  ];

  return (
    <div>
      <PageHeader title="Perfis de Acesso" subtitle="Gerencie perfis de permissão vinculados a usuários e técnicos" action={openCreate} actionLabel="Novo Perfil" canCreate={can("users.manage")} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Perfis</span>
          </div>
          <p className="text-2xl font-bold">{profiles.length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium">Usuários</span>
          </div>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Administradores</span>
          </div>
          <p className="text-2xl font-bold">{adminCount}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={profiles}
        isLoading={loadingProfiles}
        onEdit={openEdit}
        onDelete={item => deleteM.mutate(item.id)}
        searchKeys={["name"]}
        canEdit={can("users.manage")}
        canDelete={can("users.manage")}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Perfil *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Ex: Técnico Nível 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Descrição do perfil" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-sm font-semibold">Permissões ({selectedPerms.length}/{ALL_PERMISSIONS_WITH_LABELS.length})</Label>
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <div key={group} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{group}</span>
                    <button type="button" onClick={() => toggleGroup(perms)} className="text-xs text-primary hover:underline">
                      {perms.every(p => selectedPerms.includes(p)) ? "Desmarcar todas" : "Marcar todas"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 pl-2">
                    {perms.map(key => {
                      const perm = ALL_PERMISSIONS_WITH_LABELS.find(p => p.key === key);
                      const checked = selectedPerms.includes(key);
                      return (
                        <label key={key} className="flex items-center gap-2 cursor-pointer text-xs py-0.5" onClick={() => togglePerm(key)}>
                          <span className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", checked ? "bg-primary border-primary text-white" : "border-border bg-background")}>
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                          {perm?.label || key}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {editing && usersByProfile[editing.id]?.length > 0 && (
              <div className="border-t border-border pt-4">
                <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Usuários com este perfil</Label>
                <div className="flex flex-wrap gap-1.5">
                  {usersByProfile[editing.id].map(u => (
                    <Badge key={u.id} variant="outline" className="text-xs">{u.full_name || u.email}</Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={createM.isPending || updateM.isPending}>
                {createM.isPending || updateM.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
