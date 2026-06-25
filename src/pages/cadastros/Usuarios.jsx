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
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Pencil, Trash2, UserCheck, UserX, KeyRound, AlertTriangle } from "lucide-react";

export default function Usuarios() {
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteData, setInviteData] = useState({ email: "", role: "user", full_name: "", phone: "" });
  const [editData, setEditData] = useState({});

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => db.entities.User.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.entities.Client.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteConfirm(null);
    },
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    await db.users.inviteUser(inviteData.email, inviteData.role);
    setInviteOpen(false);
    setInviteData({ email: "", role: "user", full_name: "", phone: "" });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setEditData({
      role: user.role || "user",
      status: user.status || "active",
      phone: user.phone || "",
      client_ids: user.client_ids || [],
      must_change_password: user.must_change_password || false,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({ id: selectedUser.id, data: editData });
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">Usuários registrados no sistema</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" /> Cadastrar Usuário
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
                  <TableHead className="text-xs font-semibold uppercase">Nome</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Telefone</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Papel</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                ) : filtered.map(user => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => openEdit(user)}
                  >
                    <TableCell className="text-sm font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {user.role === "admin" ? "Admin" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.status === "inactive" ? "bg-muted text-muted-foreground border-border" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                        {user.status === "inactive" ? "Inativo" : "Ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(user)}>
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

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={inviteData.full_name}
                onChange={(e) => setInviteData(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={inviteData.phone}
                onChange={(e) => setInviteData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+55 (00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData(p => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={inviteData.role} onValueChange={(v) => setInviteData(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              Um convite será enviado para o email informado. O usuário precisará aceitar o convite para acessar o sistema.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Enviar Convite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário — {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Status toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
              <div className="flex items-center gap-2">
                {editData.status === "inactive" ? <UserX className="w-4 h-4 text-destructive" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                <span className="text-sm font-medium">Usuário {editData.status === "inactive" ? "Inativo" : "Ativo"}</span>
              </div>
              <Switch
                checked={editData.status !== "inactive"}
                onCheckedChange={(v) => setEditData(p => ({ ...p, status: v ? "active" : "inactive" }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Perfil de Acesso</Label>
              <Select value={editData.role} onValueChange={(v) => setEditData(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={editData.phone || ""}
                onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+55 (00) 00000-0000"
              />
            </div>

            {/* Clients */}
            <div className="space-y-1.5">
              <Label>Clientes Vinculados</Label>
              <div className="border border-border rounded-lg p-3 max-h-36 overflow-y-auto space-y-2">
                {clients.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado</p>
                ) : clients.map(client => (
                  <label key={client.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={(editData.client_ids || []).includes(client.id)}
                      onChange={(e) => {
                        const ids = editData.client_ids || [];
                        setEditData(p => ({
                          ...p,
                          client_ids: e.target.checked ? [...ids, client.id] : ids.filter(id => id !== client.id)
                        }));
                      }}
                    />
                    <span className="text-sm">{client.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Must change password */}
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Solicitar troca de senha no próximo login</span>
              </div>
              <Switch
                checked={!!editData.must_change_password}
                onCheckedChange={(v) => setEditData(p => ({ ...p, must_change_password: v }))}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5 sm:mr-auto"
              onClick={() => { setDeleteConfirm(selectedUser); setEditOpen(false); }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Deletar Usuário
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/90" disabled={updateMutation.isPending}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o usuário <strong>{deleteConfirm?.full_name || deleteConfirm?.email}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}