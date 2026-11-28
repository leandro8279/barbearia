import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { customerDetailsSchema, CustomerDetailsValues } from '@/modules/booking/schemas/customer-details.schema';
import { CustomerDetailsStepPageStore } from '@/modules/booking/stores/customer-details-step-page.store';

import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';

import { useLocation } from 'wouter';

export function useCustomerDetailsStepPage() {
  const [, navigate] = useLocation();
  const form = useForm<CustomerDetailsValues>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { name: useBookingDraftStore.getState().customerName, phone: useBookingDraftStore.getState().customerPhone },
  });
  const [store] = useState(() => new CustomerDetailsStepPageStore({ navigate, form }));

  useEffect(() => store.connect(), [store]);

  return store;
}
