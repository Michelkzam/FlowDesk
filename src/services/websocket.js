const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.listeners = new Map();
    this.isConnected = false;
    this.url = WS_URL;
  }

  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(`${this.url}?token=${token}`);

      this.ws.onopen = () => {
        console.log("[WebSocket] Conectado");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (e) {
          console.error("[WebSocket] Erro ao processar mensagem:", e);
        }
      };

      this.ws.onclose = () => {
        console.log("[WebSocket] Desconectado");
        this.isConnected = false;
        this.emit("disconnected");
        this.attemptReconnect(token);
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocket] Erro:", error);
        this.isConnected = false;
      };
    } catch (error) {
      console.error("[WebSocket] Falha ao conectar:", error);
      this.attemptReconnect(token);
    }
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log("[WebSocket] Máximo de tentativas atingido");
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Tentativa ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    setTimeout(() => {
      this.connect(token);
    }, RECONNECT_DELAY * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[WebSocket] Erro no listener ${event}:`, e);
      }
    });
  }
}

export const wsService = new WebSocketService();

export function useWebSocket(token) {
  const connect = () => wsService.connect(token);
  const disconnect = () => wsService.disconnect();
  const send = (type, payload) => wsService.send(type, payload);
  const on = (event, callback) => wsService.on(event, callback);

  return { connect, disconnect, send, on, isConnected: wsService.isConnected };
}
