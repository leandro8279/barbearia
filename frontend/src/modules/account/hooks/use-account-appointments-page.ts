import { useState } from 'react';

import { AccountAppointmentsPageStore } from '@/modules/account/stores/account-appointments-page.store';

import { useLocation } from 'wouter';

export function useAccountAppointmentsPage() {
  const [, navigate] = useLocation();
  const [store] = useState(() => new AccountAppointmentsPageStore(navigate));

  return store;
}
