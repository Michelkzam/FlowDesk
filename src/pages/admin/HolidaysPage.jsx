import { supabase } from '@/lib/supabase';

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import FormDialog from "@/components/shared/FormDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const defaultForm = { name: "", date: "", recurring: false, notes: "" };

export default function HolidaysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('*').order('date', { ascending: false });
      if (error) { console.error('[Feriados] Erro query:', error); return []; }
      return data || [];
    },
  });

  const createM = useMutation({
    mutationFn: async (d) => {
      const { data, error } = await supabase.from('holidays').insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["holidays"] }); setDialogOpen(false); setEditing(null); setForm(defaultForm); toast({ title: "Sucesso", description: "Feriado criado com sucesso!" }); },
    onError: (e) => { console.error('[Feriados] Erro criar:', e); toast({ title: "Erro", description: "Erro ao criar feriado: " + (e.message || "Verifique os dados."), variant: "destructive" }); },
  });

  const updateM = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from('holidays').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["holidays"] }); setDialogOpen(false); setEditing(null); setForm(defaultForm); toast({ title: "Sucesso", description: "Feriado atualizado com sucesso!" }); },
    onError: (e) => { console.error('[Feriados] Erro atualizar:', e); toast({ title: "Erro", description: "Erro ao atualizar feriado: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });

  const deleteM = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["holidays"] }); toast({ title: "Sucesso", description: "Feriado excluído com sucesso!" }); },
    onError: (e) => { console.error('[Feriados] Erro excluir:', e); toast({ title: "Erro", description: "Erro ao excluir feriado: " + (e.message || "Tente novamente."), variant: "destructive" }); },
  });

  const openCreate = () => { setForm(defaultForm); setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditing(item); setDialogOpen(true); };
  const close = () => { setDialogOpen(false); setEditing(null); setForm(defaultForm); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      toast({ title: "Campo obrigatório", description: "Preencha nome e data do feriado.", variant: "destructive" });
      return;
    }
    if (editing) updateM.mutate({ id: editing.id, data: form });
    else createM.mutate(form);
  };

  const columns = [
    { key: "name", label: "Feriado" },
    { key: "date", label: "Data", render: v => v ? format(new Date(v + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—" },
    { key: "recurring", label: "Anual", render: v => <span className="text-xs">{v ? "Sim" : "Não"}</span> },
    { key: "notes", label: "Notas" },
  ];
  const fields = [
    { key: "name", label: "Nome do Feriado", required: true },
    { key: "date", label: "Data", type: "date", required: true },
    { key: "recurring", label: "Recorrente", type: "checkbox", checkLabel: "Repete todos os anos nessa data" },
    { key: "notes", label: "Notas", type: "textarea" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Feriados" subtitle="Exceções ao horário de funcionamento" action={openCreate} actionLabel="Novo Feriado" />
      <DataTable columns={columns} data={items} isLoading={isLoading} onEdit={openEdit} onDelete={item => deleteM.mutate(item.id)} searchKeys={["name"]} />
      <FormDialog open={dialogOpen} onClose={close} title={editing ? "Editar Feriado" : "Novo Feriado"} fields={fields} data={form} onChange={set} onSubmit={handleSubmit} isLoading={createM.isPending || updateM.isPending} />
    </div>
  );
}
