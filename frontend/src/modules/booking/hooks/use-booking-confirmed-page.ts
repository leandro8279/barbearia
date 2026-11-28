import { useEffect, useState } from 'react';

import { BookingConfirmedPageStore } from '@/modules/booking/stores/booking-confirmed-page.store';

import { useLocation } from 'wouter';

export function useBookingConfirmedPage() {
  const [location, navigate] = useLocation();
  const [store] = useState(() => new BookingConfirmedPageStore(navigate, location));

  useEffect(() => {
    store.setLocation(location);
  }, [store, location]);

  return store;
}
