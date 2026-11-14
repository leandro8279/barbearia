import { useState } from 'react';

import { AppointmentListParams, getMyAppointments } from '@/modules/account/api/appointments';
import { getAccountProfile } from '@/modules/account/api/profile';
import { getPublicBarbers } from '@/modules/site/api/barbers';

import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

class AccountUserStore {
  #query = new MobxQuery({
    staleTime: 60_000,
    queryKey: ['users', 'me'],
    queryFn: getAccountProfile,
  });

  constructor() {
    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query();
  }

  get profile() {
    return this.result.data;
  }
}

export const useAccountUser = () => {
  const [store] = useState(() => new AccountUserStore());

  return store;
};

class AccountAppointmentsStore {
  private enabled = false;
  private params: AppointmentListParams;

  #query = new MobxQuery({
    enabled: false,
    staleTime: 30_000,
    queryFn: ({ queryKey, pageParam }) => getMyAppointments(Object.assign({}, queryKey[1], pageParam) as AppointmentListParams),
  });

  constructor(params: AppointmentListParams, enabled = true) {
    this.params = params;
    this.enabled = enabled;

    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query({
      enabled: this.enabled,
      queryKey: ['appointments', this.params],
    });
  }

  get appointments() {
    return this.result.data?.items || [];
  }

  get upcoming() {
    return this.appointments[0];
  }

  get lastCut() {
    return this.appointments[0];
  }

  get serviceNames() {
    return this.upcoming?.items.map((item) => item.name).filter(Boolean) ?? [];
  }

  setParams(value: AppointmentListParams) {
    this.params = value;
  }
}

export const useAccountAppointments = (params: AppointmentListParams, enabled = true) => {
  const [store] = useState(() => new AccountAppointmentsStore(params, enabled));

  return store;
};

class AccountBarbersStore {
  #query = new MobxQuery({
    staleTime: 5 * 60 * 1000,
    queryFn: getPublicBarbers,
    queryKey: ['barbers', { scope: 'public-site' }],
  });

  constructor() {
    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query();
  }

  get barbers() {
    return this.result.data || [];
  }

  barberName(barberId: number) {
    return barberId ? (this.barbers.find((item) => item.id === barberId)?.name ?? 'Profissional') : '';
  }
}

export const useAccountBarbers = () => {
  const [store] = useState(() => new AccountBarbersStore());

  return store;
};
