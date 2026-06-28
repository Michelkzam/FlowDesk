import { db } from '@/api/flowdeskClient';

import { useState, useEffect } from "react";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Save, CheckCircle } from "lucide-react";

export default function InformacoesPessoais() {
  const [formData, setFormData] = useState({ phone: "" });
  const [saved, setSaved] = useState(false);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => db.auth.me(),
  });

  useEffect(() => {
    if (me) setFormData({ phone: me.phone || "" });
  }, [me]);

  const updateMutation = useMutation({
    mutationFn: (data) => db.auth.updateMe(data),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return (
    <div className="space-y-4 pt-12 lg:pt-0">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Informações Pessoais</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize e edite seus dados de perfil</p>
      </div>

      <Card className="p-6 border border-border">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{me?.full_name || "—"}</h2>
            <p className="text-sm text-muted-foreground">{me?.email}</p>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1 inline-block font-medium">
              {me?.role === "admin" ? "Administrador" : "Usuário"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <Input value={me?.full_name || ""} disabled className="bg-muted/30" />
              <p className="text-xs text-muted-foreground">Gerenciado pela plataforma</p>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={me?.email || ""} disabled className="bg-muted/30" />
              <p className="text-xs text-muted-foreground">Gerenciado pela plataforma</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              placeholder="+55 (00) 00000-0000"
            />
          </div>
          <Button type="submit" className="bg-primary hover:bg-primary/90 gap-2" disabled={updateMutation.isPending}>
            {saved ? <><CheckCircle className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> Salvar alterações</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}