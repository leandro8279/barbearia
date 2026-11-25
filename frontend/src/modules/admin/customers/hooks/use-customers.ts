import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAdminCustomerDuplicates, getAdminCustomerProfile, getAdminCustomers, saveAdminCustomer, type AdminCustomerInput, type AdminCustomerQuery } from '@/modules/admin/customers/api/customers';

export function useAdminCustomers(params: AdminCustomerQuery) {
  return useQuery({ queryKey: ['admin-customers', params], queryFn: () => getAdminCustomers(params) });
}

export function useAdminCustomerProfile(id: string | null, enabled = true) {
  return useQuery({ queryKey: ['admin-customer', id], queryFn: () => getAdminCustomerProfile(id!), enabled: enabled && Boolean(id && /^\d+$/.test(id)), staleTime: 15_000 });
}

export function useAdminCustomerDuplicates(params: { phone: string; name: string; excludeId?: string }, enabled: boolean) {
  return useQuery({ queryKey: ['admin-customer-duplicates', params], queryFn: () => getAdminCustomerDuplicates(params), enabled, staleTime: 10_000, retry: false });
}

export function useSaveAdminCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: AdminCustomerInput }) => saveAdminCustomer(id, input),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-customers'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-customer'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
      toast.success(variables.id ? 'Cadastro do cliente atualizado.' : 'Cliente cadastrado.');
    },
  });
}
