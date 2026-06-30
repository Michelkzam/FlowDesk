import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { connectRealtime, broadcastTicketEvent, onGlobalEvent } from "@/services/realtime";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TEST_CHANNEL = "flowdesk:realtime-test";

export default function RealtimeTestPage() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("disconnected");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState(null);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const logsEndRef = useRef(null);

  const addLog = (type, text) => {
    setLogs(prev => [...prev, { id: Date.now(), type, text, time: new Date().toLocaleTimeString("pt-BR") }]);
  };

  // Test 1: Basic Supabase connection
  const testConnection = async () => {
    addLog("info", "Testando conexão com Supabase...");
    try {
      const { data, error } = await supabase.from("users").select("count").limit(1);
      if (error) throw error;
      addLog("success", "Conexão com banco OK");
      setStatus("connected");
    } catch (e) {
      addLog("error", `Falha na conexão: ${e.message}`);
      setStatus("error");
    }
  };

  // Test 2: Supabase Realtime channel
  const testRealtimeChannel = async () => {
    addLog("info", "Criando canal de teste...");
    try {
      const ch = supabase.channel(TEST_CHANNEL, {
        config: { presence: { key: crypto.randomUUID() } },
      });

      // Listen for broadcast
      ch.on("broadcast", { event: "test:message" }, ({ payload }) => {
        addLog("success", `Broadcast recebido: ${JSON.stringify(payload)}`);
        setBroadcasts(prev => [...prev, { ...payload, time: new Date().toLocaleTimeString("pt-BR") }]);
      });

      // Listen for presence
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        const users = [];
        for (const [key, val] of Object.entries(state)) {
          if (val && val[0]) users.push(val[0]);
        }
        setPresenceUsers(users);
        addLog("success", `Presença sincronizada: ${users.length} usuário(s)`);
      });

      // Subscribe
      const status = await ch.subscribe(async (st) => {
        addLog("info", `Status do canal: ${st}`);
        if (st === "SUBSCRIBED") {
          addLog("success", "Canal conectado com sucesso!");
          await ch.track({ user: "test-user", joined_at: Date.now() });
          addLog("info", "Presença registrada");
        }
      });

      setChannel(ch);
    } catch (e) {
      addLog("error", `Falha ao criar canal: ${e.message}`);
    }
  };

  // Test 3: Broadcast message
  const testBroadcast = async () => {
    if (!channel) {
      addLog("error", "Canal não conectado. Crie o canal primeiro.");
      return;
    }
    addLog("info", "Enviando broadcast...");
    try {
      const payload = {
        message: message || `Teste ${new Date().toLocaleTimeString("pt-BR")}`,
        user: "test-user",
        timestamp: Date.now(),
      };
      await channel.send({
        type: "broadcast",
        event: "test:message",
        payload,
      });
      addLog("success", `Broadcast enviado: ${JSON.stringify(payload)}`);
    } catch (e) {
      addLog("error", `Falha ao enviar broadcast: ${e.message}`);
    }
  };

  // Test 4: Global realtime service
  const testGlobalRealtime = async () => {
    addLog("info", "Testando serviço global de realtime...");
    try {
      connectRealtime();
      addLog("success", "Serviço global conectado");

      const unsub = onGlobalEvent("test:global", (data) => {
        addLog("success", `Evento global recebido: ${JSON.stringify(data)}`);
      });

      await broadcastTicketEvent("test:global", { msg: "Hello from global!" });
      addLog("info", "Evento global enviado (aguarde receber)");

      setTimeout(() => unsub(), 5000);
    } catch (e) {
      addLog("error", `Falha no serviço global: ${e.message}`);
    }
  };

  // Test 5: Auth token
  const testAuthToken = async () => {
    addLog("info", "Verificando token de autenticação...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addLog("error", "Nenhuma sessão ativa. Faça login primeiro.");
        return;
      }
      addLog("success", `Token OK. Usuário: ${session.user.email}`);
      addLog("info", `Token expires: ${new Date(session.expires_at * 1000).toLocaleString("pt-BR")}`);
    } catch (e) {
      addLog("error", `Falha ao verificar token: ${e.message}`);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teste de Supabase Realtime</h1>
        <p className="text-muted-foreground">Verifique se o Realtime está funcionando corretamente.</p>
      </div>

      {/* Status */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={status === "connected" ? "default" : status === "error" ? "destructive" : "secondary"}>
            {status === "connected" ? "Conectado" : status === "error" ? "Erro" : "Desconectado"}
          </Badge>
          {channel && <Badge variant="outline">Canal ativo</Badge>}
        </div>
      </Card>

      {/* Test buttons */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Testes</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={testAuthToken}>1. Verificar Token</Button>
          <Button size="sm" onClick={testConnection}>2. Testar Conexão</Button>
          <Button size="sm" onClick={testRealtimeChannel}>3. Criar Canal</Button>
          <Button size="sm" onClick={testGlobalRealtime}>4. Testar Global</Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Mensagem de teste..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" onClick={testBroadcast} disabled={!channel}>5. Enviar Broadcast</Button>
        </div>
      </Card>

      {/* Presence */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-2">Presença (Online)</h2>
        {presenceUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum usuário online detectado</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presenceUsers.map((u, i) => (
              <Badge key={i} variant="outline">{u.user || u.id || JSON.stringify(u)}</Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Broadcasts */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-2">Broadcasts Recebidos</h2>
        {broadcasts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum broadcast recebido</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {broadcasts.map((b, i) => (
              <div key={i} className="text-xs bg-muted/50 rounded p-2">
                <span className="text-muted-foreground">{b.time}</span> — {b.message}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Logs */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-2">Logs</h2>
        <div className="bg-black rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 && (
            <span className="text-zinc-500">Clique nos testes acima para iniciar...</span>
          )}
          {logs.map(log => (
            <div key={log.id} className={
              log.type === "success" ? "text-green-400" :
              log.type === "error" ? "text-red-400" :
              "text-zinc-300"
            }>
              <span className="text-zinc-500">[{log.time}]</span> {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 text-xs text-muted-foreground space-y-2">
        <h2 className="font-semibold text-foreground">Instruções</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Clique em "Verificar Token" para confirmar que está logado</li>
          <li>Clique em "Testar Conexão" para verificar o banco</li>
          <li>Clique em "Criar Canal" para criar um canal de teste</li>
          <li>Abra esta página em outra aba/janela e repita os passos</li>
          <li>Em uma aba, envie um broadcast — a outra deve receber</li>
          <li>A presença deve mostrar os 2 usuários online</li>
        </ol>
      </Card>
    </div>
  );
}
