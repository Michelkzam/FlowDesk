import { useAuth } from '@/lib/AuthContext';

export function usePermissions() {
  const { permissions, isAdmin } = useAuth();

  const can = (permission) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const canAny = (...perms) => perms.some(p => can(p));
  const canAll = (...perms) => perms.every(p => can(p));

  return { can, canAny, canAll, permissions, isAdmin };
}
