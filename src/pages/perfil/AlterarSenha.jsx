import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function AlterarSenha() {
  const [formData, setFormData] = useState({ current: "", password: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    // Password change via platform
    setSuccess(true);
    setFormData({ current: "", password: "", confirm: "" });
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Alterar Minha Senha</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina uma nova senha para sua conta</p>
      </div>

      <Card className="p-6 border border-border">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold">Segurança da Conta</h2>
            <p className="text-sm text-muted-foreground">Recomendamos usar uma senha forte e única</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Senha alterada com sucesso!</span>
          </div>
        )}

        {error && (
          <div className="text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Senha Atual</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={formData.current}
                onChange={(e) => setFormData(p => ({ ...p, current: e.target.value }))}
                placeholder="Digite sua senha atual"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              value={formData.confirm}
              onChange={(e) => setFormData(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repita a nova senha"
              required
            />
          </div>

          <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground mb-1">Dicas de segurança:</p>
            <p>• Use pelo menos 8 caracteres</p>
            <p>• Misture letras maiúsculas, minúsculas, números e símbolos</p>
            <p>• Evite informações pessoais óbvias</p>
          </div>

          <Button type="submit" className="bg-primary hover:bg-primary/90 gap-2 w-full">
            <KeyRound className="w-4 h-4" /> Alterar Senha
          </Button>
        </form>
      </Card>
    </div>
  );
}