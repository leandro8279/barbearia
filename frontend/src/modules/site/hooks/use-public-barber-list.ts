import { useQuery } from '@tanstack/react-query';
import { getPublicBarbers } from '@/modules/site/api/barbers';

export function usePublicBarberList() {
  return useQuery({ queryKey: ['barbers', { scope: 'public-site' }], queryFn: getPublicBarbers, staleTime: 5 * 60 * 1000 });
}
