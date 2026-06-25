import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

// Tickets
export function useTickets(params = {}) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => api.getTickets(params),
    refetchInterval: 300000,
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.getTicket(id),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateTicket(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useClaimTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.claimTicket(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useTransferTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to_agent_id, to_agent_name, note }) =>
      api.transferTicket(id, to_agent_id, to_agent_name, note),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

// Messages
export function useTicketMessages(ticketId) {
  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: () => api.getTicketMessages(ticketId),
    enabled: !!ticketId,
    refetchInterval: 300000,
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, data }) => api.createTicketMessage(ticketId, data),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// SLA Plans
export function useSLAPlans() {
  return useQuery({
    queryKey: ['sla-plans'],
    queryFn: () => api.getSLAPlans(),
  });
}

export function useCreateSLAPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createSLAPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-plans'] });
    },
  });
}

export function useUpdateSLAPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateSLAPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-plans'] });
    },
  });
}

export function useDeleteSLAPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteSLAPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-plans'] });
    },
  });
}

// Agents
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => api.getAgents(),
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
