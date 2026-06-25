/**
 * Ticket API Client
 * 
 * Cliente para chamadas aos endpoints de tickets.
 * Usado quando o backend está disponível.
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro na requisição" }));
    throw new Error(error.message || "Erro na requisição");
  }

  return response.json();
}

/**
 * Assume um ticket (claim) com trava transacional
 * @param {string} ticketId - ID do ticket
 * @param {string} agentId - ID do técnico
 * @param {string} agentName - Nome do técnico
 * @returns {Promise<{success: boolean, ticket: Object, message: string}>}
 */
export async function claimTicket(ticketId, agentId, agentName) {
  return apiCall(`/api/tickets/${ticketId}/claim`, {
    method: "POST",
    body: JSON.stringify({
      agent_id: agentId,
      agent_name: agentName,
    }),
  });
}

/**
 * Transfere um ticket com nota interna obrigatória
 * @param {string} ticketId - ID do ticket
 * @param {string} fromAgentId - ID do técnico atual
 * @param {string} fromAgentName - Nome do técnico atual
 * @param {string} toAgentId - ID do novo técnico
 * @param {string} toAgentName - Nome do novo técnico
 * @param {string} note - Justificativa da transferência
 * @returns {Promise<{success: boolean, ticket: Object, message: string}>}
 */
export async function transferTicket(ticketId, fromAgentId, fromAgentName, toAgentId, toAgentName, note) {
  return apiCall(`/api/tickets/${ticketId}/transfer`, {
    method: "POST",
    body: JSON.stringify({
      from_agent_id: fromAgentId,
      from_agent_name: fromAgentName,
      to_agent_id: toAgentId,
      to_agent_name: toAgentName,
      note,
    }),
  });
}

/**
 * Executa o cron job de encerramento de tickets inativos
 * @returns {Promise<{success: boolean, closed_count: number, closed_tickets: string[]}>}
 */
export async function runAutoCloseCron() {
  return apiCall("/api/cron/auto-close-inactive", {
    method: "POST",
  });
}

export default {
  claimTicket,
  transferTicket,
  runAutoCloseCron,
};
