import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { createGuestSession } from '@/modules/auth/api/auth';
import {
  createAppointment,
  CreateAppointmentInput,
  CreatedAppointment,
  createSlotHold,
  getAvailabilityDays,
  getAvailabilitySlots,
  getAvailableBarbers,
  getBookingEstimate,
  getBookingPolicy,
  HoldVariables,
  releaseHold,
} from '@/modules/booking/api/booking';

import { MobxMutation } from '@/shared/lib/mutation';
import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';
import { useLocation } from 'wouter';

type BookingEstimateParams = {
  serviceIds: string[];
  barberId: string | null;
};

const bookingEstimateKey = (params: BookingEstimateParams) => ['booking-estimate', params] as const;
type BookingEstimateKey = ReturnType<typeof bookingEstimateKey>;

class BookingEstimateStore {
  #query = new MobxQuery({
    staleTime: 30_000,
    queryFn: ({ queryKey }: { queryKey: BookingEstimateKey }) => {
      const [, { barberId, serviceIds }] = queryKey;

      return getBookingEstimate(serviceIds, barberId);
    },
  });
  constructor(private readonly params: () => BookingEstimateParams) {
    makeAutoObservable<BookingEstimateStore, 'params'>(this, { params: false });
  }

  get result() {
    const { barberId, serviceIds } = this.params();

    return this.#query.query({
      queryKey: bookingEstimateKey({ barberId, serviceIds }),
      enabled: serviceIds.length > 0 && serviceIds.length <= 4,
    });
  }

  get estimate() {
    return this.result.data;
  }

  get isPending() {
    return this.result.isPending;
  }

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }
}

export const useBookingEstimate = (params: () => BookingEstimateParams) => {
  const [store] = useState(() => new BookingEstimateStore(params));

  return store;
};

type AvailableBarbersParams = { serviceIds: string[] };
const availableBarbersKey = (serviceIds: string[]) => ['availability-barbers', serviceIds] as const;
type AvailableBarbersKey = ReturnType<typeof availableBarbersKey>;

class AvailableBarbersStore {
  #query = new MobxQuery({
    retry: 1,
    staleTime: 30_000,
    queryFn: ({ queryKey }: { queryKey: AvailableBarbersKey }) => getAvailableBarbers(queryKey[1]),
  });

  constructor(private readonly params: () => AvailableBarbersParams) {
    makeAutoObservable<AvailableBarbersStore, 'params'>(this, { params: false });
  }

  get result() {
    const { serviceIds } = this.params();

    return this.#query.query({ queryKey: availableBarbersKey(serviceIds), enabled: serviceIds.length > 0 && serviceIds.length <= 4 });
  }

  get barbers() {
    return this.result.data || [];
  }

  get availableBarbers() {
    return this.barbers.filter((barber) => barber.nextSlot !== null);
  }

  get isPending() {
    return this.result.isPending;
  }

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }
}

export const useAvailableBarbers = (params: () => AvailableBarbersParams) => {
  const [store] = useState(() => new AvailableBarbersStore(params));

  return store;
};

type AvailabilityDaysParams = { month: string; barberId: string | null; serviceIds: string[] };
const availabilityDaysKey = (params: AvailabilityDaysParams) => ['availability-days', params] as const;
type AvailabilityDaysKey = ReturnType<typeof availabilityDaysKey>;

class AvailabilityDaysStore {
  #query = new MobxQuery({
    staleTime: 30_000,
    queryFn: ({ queryKey }: { queryKey: AvailabilityDaysKey }) => {
      const [, { barberId, month, serviceIds }] = queryKey;
      return getAvailabilityDays(serviceIds, month, barberId);
    },
  });

  constructor(private readonly params: () => AvailabilityDaysParams) {
    makeAutoObservable<AvailabilityDaysStore, 'params'>(this, { params: false });
  }

  get result() {
    const { serviceIds, barberId, month } = this.params();

    return this.#query.query({
      queryKey: availabilityDaysKey({ serviceIds, barberId, month }),
      enabled: serviceIds.length > 0 && serviceIds.length <= 4 && /^\d{4}-\d{2}$/.test(month),
    });
  }

  get days() {
    return this.result.data || [];
  }

  get isPending() {
    return this.result.isPending;
  }

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }
}

export const useAvailabilityDays = (params: () => AvailabilityDaysParams) => {
  const [store] = useState(() => new AvailabilityDaysStore(params));

  return store;
};

type AvailabilitySlotsParams = {
  serviceIds: string[];
  barberId: string | null;
  selectedDate: string | null;
};
const availabilitySlotsKey = (params: AvailabilitySlotsParams) => ['availability-slots', params] as const;
type AvailabilitySlotsKey = ReturnType<typeof availabilitySlotsKey>;

class AvailabilitySlotsStore {
  constructor(private readonly params: () => AvailabilitySlotsParams) {
    makeAutoObservable<AvailabilitySlotsStore, 'params'>(this, { params: false });
  }

  #query = new MobxQuery({
    staleTime: 10_000,
    queryFn: ({ queryKey }: { queryKey: AvailabilitySlotsKey }) => {
      const [, { barberId, selectedDate, serviceIds }] = queryKey;
      return getAvailabilitySlots(serviceIds, selectedDate ?? '', barberId);
    },
  });

  get result() {
    const { serviceIds, barberId, selectedDate } = this.params();

    return this.#query.query({
      queryKey: availabilitySlotsKey({ serviceIds, barberId, selectedDate }),
      enabled: serviceIds.length > 0 && serviceIds.length <= 4 && Boolean(selectedDate),
    });
  }

  get slots() {
    return this.result.data || [];
  }

  get isPending() {
    return this.result.isPending;
  }

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }
}

export const useAvailabilitySlots = (params: () => AvailabilitySlotsParams) => {
  const [store] = useState(() => new AvailabilitySlotsStore(params));

  return store;
};

export const useCreateHoldMutation = () => {
  const queryClient = useQueryClient();

  const [store] = useState(
    () =>
      new MobxMutation({
        mutationFn: async ({ slot, previousHoldKey, serviceIds }: HoldVariables) => {
          if (previousHoldKey) await releaseHold(previousHoldKey);
          return createSlotHold({ barberId: slot.barberId, serviceIds, start: slot.start });
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['availability-days'] });
          queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['availability-days'] });
          queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
        },
      }),
  );

  return store;
};

export const useReleaseMutation = () => {
  const queryClient = useQueryClient();

  const [store] = useState(
    () =>
      new MobxMutation({
        mutationFn: releaseHold,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['availability-days'] });
          queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
        },
      }),
  );
  return store;
};

export const useBookingMutation = () => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [store] = useState(
    () =>
      new MobxMutation<CreatedAppointment, Error, CreateAppointmentInput & { hasCreateSession?: boolean; customerName?: string; customerPhone?: string }>({
        mutationFn: async ({ hasCreateSession, customerName, customerPhone, ...variables }) => {
          if (hasCreateSession) variables.authorizationToken = (await createGuestSession({ name: customerName!, phone: customerPhone! })).token;

          return createAppointment(variables);
        },
        onSuccess: (appointment) => {
          queryClient.invalidateQueries({ queryKey: ['availability-days'] });
          queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
          queryClient.invalidateQueries({ queryKey: ['appointments'] });

          const tokenFragment = appointment.guestToken ? `#token=${encodeURIComponent(appointment.guestToken)}` : '';
          navigate(`/agendar/confirmado/${appointment.id}${tokenFragment}`);
        },
      }),
  );

  return store;
};

class BookingPolicyStore {
  constructor() {
    makeAutoObservable(this);
  }

  #query = new MobxQuery({
    staleTime: 60_000,
    queryFn: getBookingPolicy,
  });

  get result() {
    return this.#query.query({ queryKey: ['booking-policy'] });
  }

  get policy() {
    return this.result.data;
  }

  get isPending() {
    return this.result.isPending;
  }

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }
}

export const useBookingPolicy = () => {
  const [store] = useState(() => new BookingPolicyStore());

  return store;
};
