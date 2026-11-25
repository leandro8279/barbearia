import {useQuery} from '@tanstack/react-query'
import {getPublicServiceCatalog} from '@/modules/site/api/services'

export function usePublicServiceCatalog(featuredOnly = false) {
  return useQuery({queryKey: ['services', {scope: 'public-catalog', featuredOnly}], queryFn: () => getPublicServiceCatalog(featuredOnly), staleTime: 5 * 60 * 1000})
}
