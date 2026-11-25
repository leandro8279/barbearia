import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard } from '@/modules/admin/dashboard/api/dashboard';

export function useAdminDashboard(from: string, to: string, enabled = true) {
  return useQuery({ queryKey: ['admin-dashboard', { from, to }], queryFn: () => getAdminDashboard(from, to), enabled, staleTime: 30_000 });
}
