import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

const user1 = { id: "user-1", name: "João (Técnico)", role: "agent" };
const user2 = { id: "user-2", name: "Maria (Cliente)", role: "client" };

console.log("=== Teste de Chat em Tempo Real ===\n");

const socket1 = io(SOCKET_URL, { autoConnect: true });
const socket2 = io(SOCKET_URL, { autoConnect: true });

let passed = 0;
let failed = 0;

function assert(testName, condition) {
  if (condition) {
    console.log(`✅ ${testName}`);
    passed++;
  } else {
    console.log(`❌ ${testName}`);
    failed++;
  }
}

let s1Connected = false;
let s2Connected = false;

socket1.on("connect", () => {
  s1Connected = true;
  assert("Usuário 1 conectou", true);
  socket1.emit("user:online", user1);
  checkBothConnected();
});

socket2.on("connect", () => {
  s2Connected = true;
  assert("Usuário 2 conectou", true);
  socket2.emit("user:online", user2);
  checkBothConnected();
});

socket1.on("users:online", (users) => {
  assert("Lista de usuários online recebida", Array.isArray(users) && users.length >= 2);
  console.log(`   Usuários online: ${users.length}`);
  users.forEach(u => console.log(`   - ${u.name} (${u.role})`));
});

function checkBothConnected() {
  if (!s1Connected || !s2Connected) return;

  console.log("\n--- Teste 2: Join ticket room ---");
  socket1.emit("join:ticket", "ticket-test-1");
  socket2.emit("join:ticket", "ticket-test-1");
  assert("Ambos entraram na sala do ticket", true);

  console.log("\n--- Teste 3: Typing indicator ---");
  socket2.on("typing:start", (data) => {
    assert("Indicador de digitação recebido", data.userId === user1.id && data.ticketId === "ticket-test-1");
    console.log(`   ${data.userName} está digitando...`);
  });
  socket1.emit("typing:start", {
    ticketId: "ticket-test-1",
    userId: user1.id,
    userName: user1.name,
  });

  setTimeout(() => {
    console.log("\n--- Teste 4: Real-time message ---");
    socket2.on("message:created", (data) => {
      assert("Mensagem recebida em tempo real", data.body === "Olá! Esta é uma mensagem de teste");
      console.log(`   De: ${data.sender_name}`);
      console.log(`   Mensagem: ${data.body}`);
    });
    socket1.emit("message:created", {
      ticket_id: "ticket-test-1",
      sender_id: user1.id,
      sender_name: user1.name,
      body: "Olá! Esta é uma mensagem de teste",
      sender_type: "agent",
    });
  }, 1000);

  setTimeout(() => {
    console.log("\n--- Teste 5: Intercom message ---");
    socket2.on("intercom:message", (data) => {
      assert("Mensagem Intercom recebida", data.text === "Mensagem intercom de teste");
      console.log(`   Canal: ${data.channel}`);
      console.log(`   De: ${data.user}`);
    });
    socket1.emit("intercom:message", {
      id: String(Date.now()),
      user: user1.name,
      text: "Mensagem intercom de teste",
      time: new Date().toLocaleTimeString("pt-BR"),
      channel: "geral",
    });
  }, 2000);

  setTimeout(() => {
    console.log("\n--- Teste 6: Leave ticket room ---");
    socket1.emit("leave:ticket", "ticket-test-1");
    assert("Usuário 1 saiu da sala do ticket", true);

    console.log("\n--- Teste 7: Disconnect ---");
    socket1.disconnect();
    socket2.disconnect();
    assert("Ambos desconectaram", !socket1.connected && !socket2.connected);

    console.log("\n=== Resultado ===");
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);

    if (failed === 0) {
      console.log("\n🎉 Todos os testes passaram! Chat em tempo real funcionando!");
    } else {
      console.log("\n⚠️ Alguns testes falharam.");
    }
    process.exit(failed > 0 ? 1 : 0);
  }, 3000);
}

console.log("🔌 Conectando usuários...");

