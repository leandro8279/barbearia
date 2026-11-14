import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: staleTimeForEntity, retry: 1, refetchOnWindowFocus: false } } });
