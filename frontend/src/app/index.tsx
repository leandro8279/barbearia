import { useEffect } from 'react';

import { Query, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AppErrorBoundary } from '@/shared/components/app-error-boundary';
import { syncOpenGraph } from '@/shared/lib/page-meta';
import { Toaster } from '@/shared/ui/sonner';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { queryClient } from '@/shared/lib/query-client';
import { Router } from '@/app/router';

const entityStaleTimes: Record<string, number> = {
  appointments: 15_000,
  'availability-barbers': 10_000,
  'availability-days': 10_000,
  'availability-next': 30_000,
  'availability-slots': 10_000,
  'booking-estimate': 30_000,
  'confirmed-appointment': 15_000,
  barbers: 5 * 60_000,
  'booking-policy': 60_000,
  cashMovements: 30_000,
  cashSessions: 15_000,
  tabs: 15_000,
  payments: 15_000,
  commissions: 30_000,
  stockMovements: 30_000,
  products: 30_000,
  product: 60_000,
  'catalog-barbers': 5 * 60_000,
  expenseCategories: 5 * 60_000,
  productCategories: 5 * 60_000,
  serviceCategories: 5 * 60_000,
  services: 5 * 60_000,
  unit: 5 * 60_000,
  units: 5 * 60_000,
  users: 60_000,
  'admin-agenda-barbers': 60_000,
  'admin-agenda-unit': 5 * 60_000,
  'admin-agenda-services': 5 * 60_000,
  'admin-agenda-time-blocks': 15_000,
  'admin-agenda-customer-suggestions': 10_000,
  'admin-agenda-eligible-barbers': 30_000,
  'admin-agenda-availability': 10_000,
  'admin-agenda-appointment': 15_000,
  'admin-agenda-appointments': 15_000,
  'admin-cash-summary': 15_000,
  'admin-cash-tab': 15_000,
  'admin-cash-catalog': 60_000,
  'admin-team-users': 60_000,
  'admin-commission-summary': 30_000,
  'admin-dashboard': 30_000,
  'admin-my-day': 15_000,
  'admin-my-day-commissions': 15_000,
  'admin-finance-summary': 30_000,
  'admin-expenses': 30_000,
  'admin-customers': 30_000,
  'admin-customer': 15_000,
  'admin-customer-duplicates': 10_000,
  'admin-products': 30_000,
  'admin-services': 30_000,
  'admin-service': 60_000,
  'admin-settings-business': 60_000,
  'admin-settings-hours': 60_000,
  'admin-settings-booking': 60_000,
  'admin-settings-notifications': 60_000,
  'admin-team-week': 60_000,
  'admin-team': 60_000,
  'team-service-catalog': 5 * 60_000,
  'team-timeoff-barbers': 5 * 60_000,
  'team-profile': 60_000,
  'team-schedule': 60_000,
};

function staleTimeForEntity(query: Query): number {
  const entity = query.queryKey[0];
  return typeof entity === 'string' ? (entityStaleTimes[entity] ?? 30_000) : 30_000;
}

export function App() {
  useEffect(() => {
    const observer = new MutationObserver(syncOpenGraph);
    observer.observe(document.head, { attributes: true, attributeFilter: ['content'], childList: true, characterData: true, subtree: true });
    syncOpenGraph();
    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppErrorBoundary>
          <Router />
          <Toaster position="top-right" richColors />
        </AppErrorBoundary>
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
