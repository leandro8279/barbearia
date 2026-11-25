import { useQuery } from '@tanstack/react-query';
import { getTeamWeekData } from '@/modules/admin/team/api/team';

export function useTeamWeek(from: string, to: string) {
  return useQuery({ queryKey: ['admin-team-week', from, to], queryFn: () => getTeamWeekData(from, to), enabled: Boolean(from && to), refetchInterval: 60_000, refetchOnWindowFocus: true });
}
