import { useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

export function usePermissions() {
  const { permissions, pages, isAdmin, canAccessPage } = useAuth();

  const can = useCallback((permission) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  }, [isAdmin, permissions]);

  const canAny = useCallback((...perms) => perms.some(p => can(p)), [can]);
  const canAll = useCallback((...perms) => perms.every(p => can(p)), [can]);

  return { can, canAny, canAll, permissions, pages, isAdmin, canAccessPage };
}
