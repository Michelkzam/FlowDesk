import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemName, setSystemName] = useState('FlowDesk');
  const [logoUrl, setLogoUrl] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      const savedLogo = localStorage.getItem("appLogo");
      if (savedLogo) setLogoUrl(savedLogo);
      const savedName = localStorage.getItem("appName");
      if (savedName) setSystemName(savedName);
      try {
        const { data } = await supabase.from('system_settings').select('*');
        if (data) {
          const map = {};
          data.forEach(s => { map[s.key] = s.value; });
          if (map.helpdesk_name) {
            setSystemName(map.helpdesk_name);
            document.title = map.helpdesk_name;
          }
          if (map.helpdesk_logo) {
            setLogoUrl(map.helpdesk_logo);
          }
        }
      } catch {}
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: 'Sucesso', description: 'Login realizado com sucesso!' });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.message || 'Credenciais inválidas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {logoUrl ? (
            <div className="w-20 h-20 rounded-xl mx-auto mb-4 overflow-hidden bg-white dark:bg-zinc-800 border border-border flex items-center justify-center">
              <img src={logoUrl} alt={systemName} className="w-full h-full object-contain p-2" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6 text-white" />
            </div>
          )}
          <CardTitle className="text-2xl">{systemName}</CardTitle>
          <CardDescription>Faça login para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
