import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {
  duplicateService,
  getAdminService,
  getAdminServices,
  getCatalogBarbers,
  getServiceCategories,
  saveAdminService,
  setServiceActive,
  type AdminService,
  type AdminServiceQuery,
  type AdminServiceSaveInput
} from '@/modules/admin/catalog/api/catalog'

export function useAdminServices(params: AdminServiceQuery) {
  return useQuery({queryKey: ['admin-services', params], queryFn: () => getAdminServices(params)})
}

export function useServiceCategories() {
  return useQuery({queryKey: ['serviceCategories', {page: 1, pageSize: 100}], queryFn: getServiceCategories, staleTime: 5 * 60 * 1000})
}

export function useAdminService(id: string | null, enabled = true) {
  return useQuery({queryKey: ['admin-service', id], queryFn: () => getAdminService(id || ''), enabled: Boolean(id) && enabled})
}

export function useCatalogBarbers(enabled = true) {
  return useQuery({queryKey: ['catalog-barbers'], queryFn: getCatalogBarbers, enabled})
}

function useInvalidateServiceCatalog() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([queryClient.invalidateQueries({queryKey: ['admin-services']}), queryClient.invalidateQueries({queryKey: ['services']})])
  }
}

export function useSetServiceActive() {
  const invalidate = useInvalidateServiceCatalog()
  return useMutation({
    mutationFn: ({id, active}: {id: number; active: boolean}) => setServiceActive(id, active),
    onSuccess: async (_result, variables) => {
      await invalidate()
      toast.success(variables.active ? 'Serviço ativado.' : 'Serviço desativado.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o serviço.')
  })
}

export function useDuplicateService() {
  const invalidate = useInvalidateServiceCatalog()
  return useMutation({
    mutationFn: (service: AdminService) => duplicateService(service),
    onSuccess: async () => {
      await invalidate()
      toast.success('Cópia criada como serviço inativo.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível duplicar o serviço.')
  })
}

export function useSaveAdminService() {
  const invalidate = useInvalidateServiceCatalog()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, service}: {id: string | null; service: AdminServiceSaveInput}) => saveAdminService(id, service),
    onSuccess: async (_result, variables) => {
      await Promise.all([invalidate(), queryClient.invalidateQueries({queryKey: ['admin-service']})])
      toast.success(variables.id ? 'Serviço atualizado.' : 'Serviço cadastrado.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o serviço.')
  })
}
