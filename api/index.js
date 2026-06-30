/**
 * API Routes - FlowDesk Ticket System
 * 
 * Endpoints para gerenciamento de tickets com segurança transacional.
 */

import { claimTicketHandler } from "./tickets/claim.js";
import { transferTicketHandler } from "./tickets/transfer.js";
import { autoCloseInactiveHandler } from "./cron/auto-close-inactive.js";
import { authenticate, cronAuth } from "./middleware/auth.js";

/**
 * Registra as rotas da API
 * @param {Express} app - Instância do Express
 * @param {Object} db - Instância do banco de dados
 */
export function registerRoutes(app, db) {
  // Middleware para injetar o db em todas as requisições
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  // Rotas de tickets (requer autenticação)
  app.post("/api/tickets/:id/claim", authenticate, claimTicketHandler);
  app.post("/api/tickets/:id/transfer", authenticate, transferTicketHandler);

  // Rotas de cron (requer secret)
  app.post("/api/cron/auto-close-inactive", cronAuth, autoCloseInactiveHandler);

  console.log("[API] Rotas registradas com sucesso");
}

export default {
  registerRoutes,
  claimTicketHandler,
  transferTicketHandler,
  autoCloseInactiveHandler,
};
