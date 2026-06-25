/**
 * API Routes - FlowDesk Ticket System
 * 
 * Endpoints para gerenciamento de tickets com segurança transacional.
 */

import { claimTicketHandler } from "./tickets/claim.js";
import { transferTicketHandler } from "./tickets/transfer.js";
import { autoCloseInactiveHandler } from "./cron/auto-close-inactive.js";

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

  // Rotas de tickets
  app.post("/api/tickets/:id/claim", claimTicketHandler);
  app.post("/api/tickets/:id/transfer", transferTicketHandler);

  // Rotas de cron
  app.post("/api/cron/auto-close-inactive", autoCloseInactiveHandler);

  console.log("[API] Rotas registradas com sucesso");
}

export default {
  registerRoutes,
  claimTicketHandler,
  transferTicketHandler,
  autoCloseInactiveHandler,
};
