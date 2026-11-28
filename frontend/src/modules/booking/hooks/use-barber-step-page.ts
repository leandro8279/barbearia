import { useEffect, useState } from 'react';

import { BarberStepPageStore } from '@/modules/booking/stores/barber-step-page.store';

import { useLocation } from 'wouter';

export function useBarberStepPage() {
  const [, navigate] = useLocation();
  const [store] = useState(() => new BarberStepPageStore(navigate));

  useEffect(() => store.bindGuards(), [store]);

  return store;
}
