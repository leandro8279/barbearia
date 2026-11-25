import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {adjustProductStock, getAdminProducts, getProduct, getProductCategories, saveProduct, type ProductQuery, type ProductSaveInput} from '@/modules/admin/catalog/api/products'

export function useAdminProducts(params: ProductQuery) {
  return useQuery({queryKey: ['admin-products', params], queryFn: () => getAdminProducts(params)})
}

export function useProductCategories() {
  return useQuery({queryKey: ['productCategories', {page: 1, pageSize: 100}], queryFn: getProductCategories, staleTime: 5 * 60 * 1000})
}

export function useProduct(id: string | null, enabled = true) {
  return useQuery({queryKey: ['product', id], queryFn: () => getProduct(id || ''), enabled: Boolean(id) && enabled})
}

async function invalidateProductData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({queryKey: ['admin-products']}),
    queryClient.invalidateQueries({queryKey: ['product']}),
    queryClient.invalidateQueries({queryKey: ['products']}),
    queryClient.invalidateQueries({queryKey: ['admin-dashboard']})
  ])
}

export function useSaveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, product}: {id: string | null; product: ProductSaveInput}) => saveProduct(id, product),
    onSuccess: async (_result, variables) => {
      await invalidateProductData(queryClient)
      toast.success(variables.id ? 'Produto atualizado.' : 'Produto cadastrado.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o produto.')
  })
}

export function useAdjustProductStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, delta, reason}: {id: number; delta: number; reason: string}) => adjustProductStock(id, delta, reason),
    onSuccess: async () => {
      await invalidateProductData(queryClient)
      toast.success('Saldo ajustado e movimentação registrada.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível ajustar o saldo.')
  })
}
