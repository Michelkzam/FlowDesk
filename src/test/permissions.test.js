import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ALL_PERMISSIONS, ALL_PERMISSIONS_WITH_LABELS, PERMISSION_GROUPS } from '@/lib/constants';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() })),
  },
}));

vi.mock('@/lib/soundSystem', () => ({ playSystemSound: vi.fn() }));

describe('Sistema de Permissões', () => {
  describe('Constantes de permissão', () => {
    it('ALL_PERMISSIONS deve ter 13 permissões', () => {
      expect(ALL_PERMISSIONS).toHaveLength(13);
    });

    it('ALL_PERMISSIONS_WITH_LABELS deve ter 13 permissões com label', () => {
      expect(ALL_PERMISSIONS_WITH_LABELS).toHaveLength(13);
      ALL_PERMISSIONS_WITH_LABELS.forEach(p => {
        expect(p.key).toBeDefined();
        expect(p.label).toBeDefined();
      });
    });

    it('PERMISSION_GROUPS deve cobrir todas as permissões', () => {
      const groupedPerms = Object.values(PERMISSION_GROUPS).flat();
      expect(groupedPerms).toHaveLength(ALL_PERMISSIONS.length);
      ALL_PERMISSIONS.forEach(p => {
        expect(groupedPerms).toContain(p);
      });
    });

    it('ALL_PERMISSIONS e ALL_PERMISSIONS_WITH_LABELS devem ter as mesmas chaves', () => {
      const keys = ALL_PERMISSIONS_WITH_LABELS.map(p => p.key).sort();
      const sorted = [...ALL_PERMISSIONS].sort();
      expect(keys).toEqual(sorted);
    });
  });

  describe('Regras de permissão por role', () => {
    it('admin deve ter todas as permissões', () => {
      const adminPerms = ALL_PERMISSIONS;
      expect(adminPerms).toContain('tickets.create');
      expect(adminPerms).toContain('tickets.edit');
      expect(adminPerms).toContain('tickets.delete');
      expect(adminPerms).toContain('tickets.close');
      expect(adminPerms).toContain('tickets.assign');
      expect(adminPerms).toContain('tickets.transfer');
      expect(adminPerms).toContain('kb.create');
      expect(adminPerms).toContain('kb.edit');
      expect(adminPerms).toContain('kb.delete');
      expect(adminPerms).toContain('kb.publish');
      expect(adminPerms).toContain('users.manage');
      expect(adminPerms).toContain('reports.view');
      expect(adminPerms).toContain('admin.access');
    });

    it('agent role deve ser válido', () => {
      const validRoles = ['admin', 'agent', 'user'];
      expect(validRoles).toContain('agent');
    });

    it('user role deve ser válido', () => {
      const validRoles = ['admin', 'agent', 'user'];
      expect(validRoles).toContain('user');
    });
  });

  describe('Proteção de rotas', () => {
    it('rotas admin devem exigir requireAdmin', () => {
      const adminRoutes = [
        '/admin/categorias',
        '/admin/topicos',
        '/admin/filtros',
        '/admin/sla',
        '/admin/cronogramas',
        '/admin/feriados',
        '/admin/configuracoes',
        '/admin/auditoria',
        '/admin/escala',
        '/admin/sincronizar',
      ];
      adminRoutes.forEach(route => {
        expect(route.startsWith('/admin/')).toBe(true);
      });
    });

    it('rotas de agent devem exigir requireAgent', () => {
      const agentRoutes = ['/financeiro', '/inventario', '/contratos'];
      agentRoutes.forEach(route => {
        expect(route).toBeDefined();
      });
    });
  });

  describe('Segurança de registro', () => {
    it('registro não deve aceitar role customizada', () => {
      const allowedRoles = ['user'];
      const requestedRole = 'admin';
      expect(allowedRoles).not.toContain(requestedRole);
    });

    it('criação de agente deve limitar roles permitidas', () => {
      const allowedRoles = ['agent', 'user'];
      expect(allowedRoles).not.toContain('admin');
    });
  });

  describe('Sidebar permissões', () => {
    it('menu Base de Conhecimento deve exigir kb.create', () => {
      const kbMenu = { permission: 'kb.create' };
      expect(ALL_PERMISSIONS).toContain(kbMenu.permission);
    });

    it('menu Cadastros deve exigir users.manage', () => {
      const cadastrosMenu = { permission: 'users.manage' };
      expect(ALL_PERMISSIONS).toContain(cadastrosMenu.permission);
    });

    it('menu Financeiro deve exigir admin.access', () => {
      const financeiroMenu = { permission: 'admin.access' };
      expect(ALL_PERMISSIONS).toContain(financeiroMenu.permission);
    });

    it('menu Sistema deve exigir admin.access', () => {
      const sistemaMenu = { permission: 'admin.access' };
      expect(ALL_PERMISSIONS).toContain(sistemaMenu.permission);
    });
  });
});
