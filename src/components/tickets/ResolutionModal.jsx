import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle } from "lucide-react";

const MIN_SOLUTION_LENGTH = 15;

export default function ResolutionModal({
  open,
  onOpenChange,
  category,
  onCategoryChange,
  solution,
  onSolutionChange,
  onConfirm,
  isPending,
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) return [];
      return data || [];
    },
  });

  const solutionError = solution.trim().length > 0 && solution.trim().length < MIN_SOLUTION_LENGTH;
  const canConfirm = !solutionError && solution.trim().length >= MIN_SOLUTION_LENGTH && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Finalizar Atendimento
          </DialogTitle>
          <DialogDescription>
            Confirme a categoria do chamado e descreva a solução aplicada (mínimo {MIN_SOLUTION_LENGTH} caracteres).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Categoria Métrica de Fechamento</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.status === "active").map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Resumo da Solução Aplicada *</Label>
            <Textarea
              placeholder={`Descreva detalhadamente como o problema foi resolvido (mínimo ${MIN_SOLUTION_LENGTH} caracteres)...`}
              value={solution}
              onChange={e => onSolutionChange(e.target.value)}
              className={`h-24 ${solutionError ? "border-red-500 focus:ring-red-500" : ""}`}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Esta descrição será registrada como mensagem do sistema e alimentará a base de auditoria.</p>
              <span className={`text-xs font-medium ${solutionError ? "text-red-500" : solution.trim().length >= MIN_SOLUTION_LENGTH ? "text-green-600" : "text-muted-foreground"}`}>
                {solution.trim().length}/{MIN_SOLUTION_LENGTH} mín.
              </span>
            </div>
            {solutionError && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                <AlertCircle className="w-3 h-3" />
                A solução deve ter no mínimo {MIN_SOLUTION_LENGTH} caracteres.
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? "Finalizando..." : "Confirmar Finalização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
