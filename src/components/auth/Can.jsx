import { usePermissions } from '@/hooks/usePermissions';

export default function Can({ permission, children, fallback = null }) {
  const { can } = usePermissions();
  return can(permission) ? children : fallback;
}
