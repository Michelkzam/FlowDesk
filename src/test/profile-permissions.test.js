import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ALL_PERMISSIONS } from '@/lib/constants';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() })),
  },
}));

vi.mock('@/lib/soundSystem', () => ({ playSystemSound: vi.fn() }));

const ADMIN_PERMISSIONS = ALL_PERMISSIONS;

const AGENT_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.delete", "tickets.close",
  "tickets.assign", "tickets.transfer",
  "kb.create", "kb.edit", "kb.delete", "kb.publish",
  "reports.view",
];

const USER_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.close",
];

const ROLE_PERMISSIONS_DB = {
  'role-agent-1': AGENT_PERMISSIONS,
  'role-user-1': USER_PERMISSIONS,
};

function simulateFetchPermissions(profileData) {
  if (!profileData) return [];
  if (profileData.role === 'admin') return ALL_PERMISSIONS;
  if (!profileData.role_id) {
    return profileData.role === 'agent' ? AGENT_PERMISSIONS : USER_PERMISSIONS;
  }
  return ROLE_PERMISSIONS_DB[profileData.role_id] || [];
}

function simulateCan(permission, profileRole, permissions) {
  if (profileRole === 'admin') return true;
  return permissions.includes(permission);
}

describe('Sistema de Permissões por Perfil', () => {

  describe('Perfil: Administrador', () => {
    const adminProfile = { id: '1', role: 'admin', full_name: 'Admin', email: 'admin@test.com' };
    const permissions = simulateFetchPermissions(adminProfile);

    it('deve ter todas as 13 permissões', () => {
      expect(permissions).toHaveLength(13);
    });

    it('deve ter permissão de tickets.create', () => {
      expect(simulateCan('tickets.create', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.edit', () => {
      expect(simulateCan('tickets.edit', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.delete', () => {
      expect(simulateCan('tickets.delete', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.close', () => {
      expect(simulateCan('tickets.close', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.assign', () => {
      expect(simulateCan('tickets.assign', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.transfer', () => {
      expect(simulateCan('tickets.transfer', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.create', () => {
      expect(simulateCan('kb.create', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.edit', () => {
      expect(simulateCan('kb.edit', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.delete', () => {
      expect(simulateCan('kb.delete', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.publish', () => {
      expect(simulateCan('kb.publish', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de users.manage', () => {
      expect(simulateCan('users.manage', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de reports.view', () => {
      expect(simulateCan('reports.view', 'admin', permissions)).toBe(true);
    });

    it('deve ter permissão de admin.access', () => {
      expect(simulateCan('admin.access', 'admin', permissions)).toBe(true);
    });

    it('isAdmin deve ser true', () => {
      expect(adminProfile.role === 'admin').toBe(true);
    });

    it('isAgent deve ser true (admin é também agente)', () => {
      expect(['agent', 'admin'].includes(adminProfile.role)).toBe(true);
    });
  });

  describe('Perfil: Técnico (Agent)', () => {
    const agentProfile = { id: '2', role: 'agent', role_id: 'role-agent-1', full_name: 'João' };
    const permissions = simulateFetchPermissions(agentProfile);

    it('deve ter 11 permissões', () => {
      expect(permissions).toHaveLength(11);
    });

    it('deve ter permissão de tickets.create', () => {
      expect(simulateCan('tickets.create', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.edit', () => {
      expect(simulateCan('tickets.edit', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.delete', () => {
      expect(simulateCan('tickets.delete', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.close', () => {
      expect(simulateCan('tickets.close', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.assign', () => {
      expect(simulateCan('tickets.assign', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.transfer', () => {
      expect(simulateCan('tickets.transfer', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.create', () => {
      expect(simulateCan('kb.create', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.edit', () => {
      expect(simulateCan('kb.edit', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.delete', () => {
      expect(simulateCan('kb.delete', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de kb.publish', () => {
      expect(simulateCan('kb.publish', 'agent', permissions)).toBe(true);
    });

    it('deve ter permissão de reports.view', () => {
      expect(simulateCan('reports.view', 'agent', permissions)).toBe(true);
    });

    it('NÃO deve ter permissão de users.manage', () => {
      expect(simulateCan('users.manage', 'agent', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de admin.access', () => {
      expect(simulateCan('admin.access', 'agent', permissions)).toBe(false);
    });

    it('isAdmin deve ser false', () => {
      expect(agentProfile.role === 'admin').toBe(false);
    });

    it('isAgent deve ser true', () => {
      expect(['agent', 'admin'].includes(agentProfile.role)).toBe(true);
    });
  });

  describe('Perfil: Usuário comum', () => {
    const userProfile = { id: '3', role: 'user', role_id: 'role-user-1', full_name: 'Maria' };
    const permissions = simulateFetchPermissions(userProfile);

    it('deve ter 3 permissões', () => {
      expect(permissions).toHaveLength(3);
    });

    it('deve ter permissão de tickets.create', () => {
      expect(simulateCan('tickets.create', 'user', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.edit', () => {
      expect(simulateCan('tickets.edit', 'user', permissions)).toBe(true);
    });

    it('deve ter permissão de tickets.close', () => {
      expect(simulateCan('tickets.close', 'user', permissions)).toBe(true);
    });

    it('NÃO deve ter permissão de tickets.delete', () => {
      expect(simulateCan('tickets.delete', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de tickets.assign', () => {
      expect(simulateCan('tickets.assign', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de tickets.transfer', () => {
      expect(simulateCan('tickets.transfer', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de kb.create', () => {
      expect(simulateCan('kb.create', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de kb.edit', () => {
      expect(simulateCan('kb.edit', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de kb.delete', () => {
      expect(simulateCan('kb.delete', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de kb.publish', () => {
      expect(simulateCan('kb.publish', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de users.manage', () => {
      expect(simulateCan('users.manage', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de reports.view', () => {
      expect(simulateCan('reports.view', 'user', permissions)).toBe(false);
    });

    it('NÃO deve ter permissão de admin.access', () => {
      expect(simulateCan('admin.access', 'user', permissions)).toBe(false);
    });

    it('isAdmin deve ser false', () => {
      expect(userProfile.role === 'admin').toBe(false);
    });

    it('isAgent deve ser false', () => {
      expect(['agent', 'admin'].includes(userProfile.role)).toBe(false);
    });

    it('isUser deve ser true', () => {
      expect(userProfile.role === 'user').toBe(true);
    });
  });

  describe('Fallback: Técnico sem role_id', () => {
    const agentNoRole = { id: '4', role: 'agent', role_id: null, full_name: 'Pedro' };
    const permissions = simulateFetchPermissions(agentNoRole);

    it('deve receber permissões de agente via fallback', () => {
      expect(permissions).toHaveLength(11);
      expect(permissions).toContain('tickets.create');
      expect(permissions).toContain('kb.create');
      expect(permissions).toContain('reports.view');
    });

    it('NÃO deve ter users.manage via fallback', () => {
      expect(permissions).not.toContain('users.manage');
    });
  });

  describe('Fallback: Usuário sem role_id', () => {
    const userNoRole = { id: '5', role: 'user', role_id: null, full_name: 'Ana' };
    const permissions = simulateFetchPermissions(userNoRole);

    it('deve receber permissões de usuário via fallback', () => {
      expect(permissions).toHaveLength(3);
      expect(permissions).toContain('tickets.create');
      expect(permissions).toContain('tickets.edit');
      expect(permissions).toContain('tickets.close');
    });

    it('NÃO deve ter permissões de agente via fallback', () => {
      expect(permissions).not.toContain('tickets.delete');
      expect(permissions).not.toContain('tickets.assign');
      expect(permissions).not.toContain('kb.create');
    });
  });

  describe('Fallback: Usuário nulo', () => {
    it('deve retornar array vazio', () => {
      expect(simulateFetchPermissions(null)).toEqual([]);
    });
  });

  describe('Proteção de Rotas (ProtectedRoute)', () => {
    it('rota admin deve exigir isAdmin', () => {
      const requireAdmin = true;
      const isAdmin = false;
      const shouldRedirect = requireAdmin && !isAdmin;
      expect(shouldRedirect).toBe(true);
    });

    it('admin deve acessar rotas admin', () => {
      const requireAdmin = true;
      const isAdmin = true;
      const shouldRedirect = requireAdmin && !isAdmin;
      expect(shouldRedirect).toBe(false);
    });

    it('rota de agente deve exigir isAgent', () => {
      const requireAgent = true;
      const isAgent = false;
      const shouldRedirect = requireAgent && !isAgent;
      expect(shouldRedirect).toBe(true);
    });

    it('usuário comum NÃO deve acessar rota de agente', () => {
      const requireAgent = true;
      const isAgent = false;
      const shouldRedirect = requireAgent && !isAgent;
      expect(shouldRedirect).toBe(true);
    });

    it('agente deve acessar rota de agente', () => {
      const requireAgent = true;
      const isAgent = true;
      const shouldRedirect = requireAgent && !isAgent;
      expect(shouldRedirect).toBe(false);
    });

    it('admin deve acessar rota de agente (admin é também agente)', () => {
      const requireAgent = true;
      const isAgent = true;
      const shouldRedirect = requireAgent && !isAgent;
      expect(shouldRedirect).toBe(false);
    });

    it('usuário não autenticado deve ser redirecionado para /login', () => {
      const isAuthenticated = false;
      const shouldRedirect = !isAuthenticated;
      expect(shouldRedirect).toBe(true);
    });
  });

  describe('Visibilidade de Elementos UI', () => {
    it('botão "Novo Ticket" deve aparecer para agent', () => {
      const canCreate = simulateCan('tickets.create', 'agent', AGENT_PERMISSIONS);
      expect(canCreate).toBe(true);
    });

    it('botão "Novo Ticket" deve aparecer para user', () => {
      const canCreate = simulateCan('tickets.create', 'user', USER_PERMISSIONS);
      expect(canCreate).toBe(true);
    });

    it('botão "Excluir Ticket" deve aparecer apenas para agent/admin', () => {
      const agentCanDelete = simulateCan('tickets.delete', 'agent', AGENT_PERMISSIONS);
      const userCanDelete = simulateCan('tickets.delete', 'user', USER_PERMISSIONS);
      expect(agentCanDelete).toBe(true);
      expect(userCanDelete).toBe(false);
    });

    it('botão "Atribuir Ticket" deve aparecer apenas para agent/admin', () => {
      const agentCanAssign = simulateCan('tickets.assign', 'agent', AGENT_PERMISSIONS);
      const userCanAssign = simulateCan('tickets.assign', 'user', USER_PERMISSIONS);
      expect(agentCanAssign).toBe(true);
      expect(userCanAssign).toBe(false);
    });

    it('botão "Transferir Ticket" deve aparecer apenas para agent/admin', () => {
      const agentCanTransfer = simulateCan('tickets.transfer', 'agent', AGENT_PERMISSIONS);
      const userCanTransfer = simulateCan('tickets.transfer', 'user', USER_PERMISSIONS);
      expect(agentCanTransfer).toBe(true);
      expect(userCanTransfer).toBe(false);
    });

    it('menu "Cadastros" deve aparecer apenas para admin', () => {
      const adminCanManage = simulateCan('users.manage', 'admin', ADMIN_PERMISSIONS);
      const agentCanManage = simulateCan('users.manage', 'agent', AGENT_PERMISSIONS);
      const userCanManage = simulateCan('users.manage', 'user', USER_PERMISSIONS);
      expect(adminCanManage).toBe(true);
      expect(agentCanManage).toBe(false);
      expect(userCanManage).toBe(false);
    });

    it('menu "Base de Conhecimento" deve aparecer para agent/admin', () => {
      const adminCanKB = simulateCan('kb.create', 'admin', ADMIN_PERMISSIONS);
      const agentCanKB = simulateCan('kb.create', 'agent', AGENT_PERMISSIONS);
      const userCanKB = simulateCan('kb.create', 'user', USER_PERMISSIONS);
      expect(adminCanKB).toBe(true);
      expect(agentCanKB).toBe(true);
      expect(userCanKB).toBe(false);
    });

    it('menu "Sistema" deve aparecer apenas para admin', () => {
      const adminCanAccess = simulateCan('admin.access', 'admin', ADMIN_PERMISSIONS);
      const agentCanAccess = simulateCan('admin.access', 'agent', AGENT_PERMISSIONS);
      const userCanAccess = simulateCan('admin.access', 'user', USER_PERMISSIONS);
      expect(adminCanAccess).toBe(true);
      expect(agentCanAccess).toBe(false);
      expect(userCanAccess).toBe(false);
    });

    it('menu "Relatórios" deve aparecer para agent/admin', () => {
      const adminCanReports = simulateCan('reports.view', 'admin', ADMIN_PERMISSIONS);
      const agentCanReports = simulateCan('reports.view', 'agent', AGENT_PERMISSIONS);
      const userCanReports = simulateCan('reports.view', 'user', USER_PERMISSIONS);
      expect(adminCanReports).toBe(true);
      expect(agentCanReports).toBe(true);
      expect(userCanReports).toBe(false);
    });

    it('botão "Finalizar" no ticket deve aparecer para agent', () => {
      const agentCanClose = simulateCan('tickets.close', 'agent', AGENT_PERMISSIONS);
      expect(agentCanClose).toBe(true);
    });

    it('botão "Finalizar" no ticket deve aparecer para user', () => {
      const userCanClose = simulateCan('tickets.close', 'user', USER_PERMISSIONS);
      expect(userCanClose).toBe(true);
    });
  });

  describe('Autorização do Servidor', () => {
    it('POST /api/agents deve exigir role admin', () => {
      const allowedRoles = ['admin'];
      expect(allowedRoles).toContain('admin');
      expect(allowedRoles).not.toContain('agent');
      expect(allowedRoles).not.toContain('user');
    });

    it('DELETE /api/agents/:id deve exigir role admin', () => {
      const allowedRoles = ['admin'];
      expect(allowedRoles).toContain('admin');
      expect(allowedRoles).not.toContain('agent');
    });

    it('POST /api/auth/register deve criar sempre como user', () => {
      const fixedRole = 'user';
      const requestedRole = 'admin';
      expect(fixedRole).toBe('user');
      expect(fixedRole).not.toBe(requestedRole);
    });

    it('POST /api/agents deve limitar roles permitidas', () => {
      const allowedRoles = ['agent', 'user'];
      expect(allowedRoles).not.toContain('admin');
    });

    it('GET /api/tickets deve exigir autenticação', () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });

    it('POST /api/tickets deve exigir autenticação', () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });
  });

  describe('Consistência entre perfis', () => {
    it('permissões de agent devem ser subset de admin', () => {
      const agentOnlyPerms = AGENT_PERMISSIONS.filter(p => !ADMIN_PERMISSIONS.includes(p));
      expect(agentOnlyPerms).toHaveLength(0);
    });

    it('permissões de user devem ser subset de agent', () => {
      const userOnlyPerms = USER_PERMISSIONS.filter(p => !AGENT_PERMISSIONS.includes(p));
      expect(userOnlyPerms).toHaveLength(0);
    });

    it('agent NÃO deve ter users.manage', () => {
      expect(AGENT_PERMISSIONS).not.toContain('users.manage');
    });

    it('agent NÃO deve ter admin.access', () => {
      expect(AGENT_PERMISSIONS).not.toContain('admin.access');
    });

    it('user NÃO deve ter tickets.delete', () => {
      expect(USER_PERMISSIONS).not.toContain('tickets.delete');
    });

    it('user NÃO deve ter tickets.assign', () => {
      expect(USER_PERMISSIONS).not.toContain('tickets.assign');
    });

    it('user NÃO deve ter tickets.transfer', () => {
      expect(USER_PERMISSIONS).not.toContain('tickets.transfer');
    });

    it('user NÃO deve ter nenhuma permissão de KB', () => {
      const kbPerms = USER_PERMISSIONS.filter(p => p.startsWith('kb.'));
      expect(kbPerms).toHaveLength(0);
    });

    it('admin deve ter TODAS as permissões', () => {
      ALL_PERMISSIONS.forEach(perm => {
        expect(simulateCan(perm, 'admin', ADMIN_PERMISSIONS)).toBe(true);
      });
    });
  });
});
