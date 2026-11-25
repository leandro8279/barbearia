import {useQuery} from '@tanstack/react-query'
import {getPublicUnit} from '@/modules/site/api/unit'

export function usePublicUnit() {
  return useQuery({queryKey: ['units', {id: 1}], queryFn: getPublicUnit, staleTime: 5 * 60 * 1000})
}
