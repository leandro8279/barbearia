import {useQueries, useQuery} from '@tanstack/react-query'
import {getBarberNextAvailability, getPublicBarbers} from '@/modules/site/api/barbers'
import type {PublicBarber} from '@/modules/site/api/barbers'

export function usePublicBarbers() {
  const barbersQuery = useQuery({queryKey: ['barbers', {scope: 'public-site'}], queryFn: getPublicBarbers, staleTime: 5 * 60 * 1000})

  const availabilityQueries = useQueries({
    queries: (barbersQuery.data ?? []).map((barber: PublicBarber) => ({
      queryKey: ['availability-next', {barberId: barber.id, serviceId: 1}],
      queryFn: () => getBarberNextAvailability(barber.id),
      staleTime: 30 * 1000,
      retry: 1
    }))
  })

  return {barbersQuery, availabilityQueries}
}
