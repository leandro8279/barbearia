import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {
  addCashTabItem,
  createCashMovement,
  closeCashSession,
  closeCashTab,
  createCounterTab,
  getCashCatalog,
  getCashSessionMovements,
  getCashSummary,
  getCashTabDetail,
  openCashSession,
  updateCashTabDiscount,
  type CashSessionCloseInput,
  type CashMovementInput,
  type CloseCashTabInput
} from '@/modules/admin/cash/api/cash'

export function useCashSummary() {
  return useQuery({queryKey: ['admin-cash-summary'], queryFn: getCashSummary, refetchInterval: 30_000, refetchOnWindowFocus: true})
}

export function useCashSessionMovements(sessionId: number) {
  return useQuery({queryKey: ['cashMovements', sessionId], queryFn: () => getCashSessionMovements(sessionId), enabled: Number.isInteger(sessionId) && sessionId > 0})
}

export function useCreateCashMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CashMovementInput) => createCashMovement(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-cash-summary']}),
        queryClient.invalidateQueries({queryKey: ['cashMovements']}),
        queryClient.invalidateQueries({queryKey: ['cashSessions']})
      ])
      toast.success('Movimentação registrada.')
    }
  })
}

export function useOpenCashSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (openingCents: number) => openCashSession(openingCents),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-cash-summary']}),
        queryClient.invalidateQueries({queryKey: ['cashSessions']}),
        queryClient.invalidateQueries({queryKey: ['tabs']})
      ])
      toast.success('Caixa aberto.')
    }
  })
}

export function useCloseCashSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, input}: {id: number; input: CashSessionCloseInput}) => closeCashSession(id, input),
    onSuccess: async (_session, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-cash-summary']}),
        queryClient.invalidateQueries({queryKey: ['cashSessions']}),
        queryClient.invalidateQueries({queryKey: ['cashMovements', variables.id]}),
        queryClient.invalidateQueries({queryKey: ['tabs']})
      ])
      toast.success('Caixa fechado.')
    }
  })
}

export function useCashTabDetail(id: number) {
  return useQuery({queryKey: ['admin-cash-tab', id], queryFn: () => getCashTabDetail(id), enabled: Number.isInteger(id) && id > 0, refetchInterval: 30_000, refetchOnWindowFocus: true})
}

export function useCashCatalog() {
  return useQuery({queryKey: ['admin-cash-catalog'], queryFn: getCashCatalog, staleTime: 60_000})
}

export function useAddCashTabItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, item}: {id: number; item: {type: 'service' | 'product'; refId: number; qty: number; barberId: number | null}}) => addCashTabItem(id, item),
    onSuccess: async (_tab, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-cash-tab', variables.id]}),
        queryClient.invalidateQueries({queryKey: ['admin-cash-summary']}),
        queryClient.invalidateQueries({queryKey: ['admin-agenda-appointments']}),
        queryClient.invalidateQueries({queryKey: ['appointments']}),
        queryClient.invalidateQueries({queryKey: ['tabs']})
      ])
      toast.success('Item adicionado à comanda.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar o item.')
  })
}

export function useUpdateCashTabDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, discountCents}: {id: number; discountCents: number}) => updateCashTabDiscount(id, discountCents),
    onSuccess: async (_tab, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-cash-tab', variables.id]}),
        queryClient.invalidateQueries({queryKey: ['admin-cash-summary']}),
        queryClient.invalidateQueries({queryKey: ['tabs']})
      ])
      toast.success('Desconto aplicado à comanda.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível aplicar o desconto.')
  })
}

export function useCloseCashTab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({id, input}: {id: number; input: CloseCashTabInput}) => closeCashTab(id, input),
    onSuccess: async (_tab, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['admin-cash-tab', variables.id]}),
        queryClient.invalidateQueries({queryKey: ['admin-cash-summary']}),
        queryClient.invalidateQueries({queryKey: ['tabs']}),
        queryClient.invalidateQueries({queryKey: ['payments']}),
        queryClient.invalidateQueries({queryKey: ['appointments']}),
        queryClient.invalidateQueries({queryKey: ['admin-agenda-appointments']}),
        queryClient.invalidateQueries({queryKey: ['products']}),
        queryClient.invalidateQueries({queryKey: ['stockMovements']}),
        queryClient.invalidateQueries({queryKey: ['commissions']})
      ])
      toast.success('Conta fechada com sucesso.')
    }
  })
}

export function useCreateCounterTab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCounterTab,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['admin-cash-summary']})
      toast.success('Comanda avulsa criada.')
    },
    onError: error => toast.error(error instanceof Error ? error.message : 'Não foi possível criar a comanda.')
  })
}
