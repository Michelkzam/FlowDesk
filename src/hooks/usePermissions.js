import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function usePermissions() {
  const { profile, isAdmin } = useAuth();

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ["role-permissions", profile?.role_id],
    queryFn: async () => {
      if (!profile?.role_id) return [];
      const { data } = await supabase
        .from('roles')
        .select('permissions')
        .eq('id', profile.role_id)
        .single();
      return data?.permissions || [];
    },
    enabled: !!profile?.role_id,
  });

  const allPermissions = isAdmin
    ? ["tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
       "kb.create", "kb.edit", "kb.delete", "kb.publish",
       "users.manage", "reports.view", "admin.access"]
    : rolePermissions;

  const can = (permission) => {
    if (isAdmin) return true;
    return allPermissions.includes(permission);
  };

  const canAny = (...permissions) => permissions.some(p => can(p));
  const canAll = (...permissions) => permissions.every(p => can(p));

  return { can, canAny, canAll, permissions: allPermissions, isAdmin };
}
