import { useState } from 'react';

import { AccountOverviewPageStore } from '@/modules/account/stores/account-overview-page.store';

import { useLocation } from 'wouter';

export function useAccountOverviewPage() {
  const [, navigate] = useLocation();
  const [store] = useState(() => new AccountOverviewPageStore(navigate));

  return store;
}
