import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

import { initWebSocket } from './services/websocket.js';
import { startAutoCloseCron } from './cron/autoCloseInactive.js';

import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import categoryRoutes from './routes/categories.js';
import slaRoutes from './routes/sla.js';
import agentRoutes from './routes/agents.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sla-plans', slaRoutes);
app.use('/api/agents', agentRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ message: 'Erro interno no servidor' });
});

// Initialize WebSocket
initWebSocket(server);

// Start cron jobs
startAutoCloseCron();

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║           FlowDesk Server v1.0.0                 ║
║──────────────────────────────────────────────────║
║  🚀 Servidor rodando em: http://localhost:${PORT}  ║
║  📡 WebSocket: ws://localhost:${PORT}              ║
║  🗄️  Banco: PostgreSQL                           ║
║  ⏰ Cron: Auto-close às 02:00 diariamente        ║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
