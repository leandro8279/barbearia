import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  getMyDayAppointments,
  getMyDayCommissions,
  updateAppointmentStatus,
  UpdateAppointmentStatusInput,
} from '@/modules/admin/dashboard/api/my-day';

import { MobxMutation } from '@/shared/lib/mutation';
import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';
import { toast } from 'sonner';

const STALE_TIME = 30_000;
const myDayCommissionsKey = (date: string) => ['admin-my-day-commissions', date] as const;
type MyDayCommissionsKey = ReturnType<typeof myDayCommissionsKey>;
type MyDayCommissionsParams = { date: string; canReadCommissions: boolean };

class MyDayCommissionsStore {
  #myDayCommissionsQuery = new MobxQuery({
    refetchInterval: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: ({ queryKey }: { queryKey: MyDayCommissionsKey }) => getMyDayCommissions(queryKey[1]),
  });

  constructor(private readonly params: MyDayCommissionsParams) {
    makeAutoObservable<MyDayCommissionsStore, 'params'>(this, { params: false });
  }

  get queryResult() {
    return this.#myDayCommissionsQuery.query({
      enabled: this.params.canReadCommissions,
      queryKey: myDayCommissionsKey(this.params.date),
    });
  }

  get commissionSummary() {
    return this.queryResult.data;
  }

  get commissions() {
    return this.commissionSummary?.totals.reduce(
      (totals, item) => ({
        totalCents: totals.totalCents + item.totalCents,
        pendingCents: totals.pendingCents + item.pendingCents,
        paidCents: totals.paidCents + item.paidCents,
      }),
      { totalCents: 0, pendingCents: 0, paidCents: 0 },
    );
  }

  get isPending() {
    return this.queryResult.isPending;
  }

  get error() {
    return this.queryResult.error;
  }

  get isError() {
    return this.queryResult.isError;
  }

  get isSuccess() {
    return this.queryResult.isSuccess;
  }
}

export const useMyDayCommissions = (params: MyDayCommissionsParams) => {
  const [store] = useState(() => new MyDayCommissionsStore(params));

  return store;
};

const myDayAppointmentsKey = (date: string) => ['admin-my-day', date] as const;
type MyDayAppointmentsKey = ReturnType<typeof myDayAppointmentsKey>;

class MyDayAppointmentsStore {
  #query = new MobxQuery({
    refetchInterval: STALE_TIME,
    refetchOnWindowFocus: true,
    queryFn: ({ queryKey }: { queryKey: MyDayAppointmentsKey }) => getMyDayAppointments(queryKey[1]),
  });

  constructor(private readonly date: string) {
    makeAutoObservable<MyDayAppointmentsStore, 'date'>(this, { date: false });
  }

  get queryResult() {
    return this.#query.query({ queryKey: myDayAppointmentsKey(this.date) });
  }

  get appointments() {
    return this.queryResult.data || [];
  }

  get isPending() {
    return this.queryResult.isPending;
  }

  get error() {
    return this.queryResult.error;
  }

  get isError() {
    return this.queryResult.isError;
  }

  get isSuccess() {
    return this.queryResult.isSuccess;
  }
}

export const useMyDayAppointments = (date: string) => {
  const [store] = useState(() => new MyDayAppointmentsStore(date));

  return store;
};

export const useUpdateMyDayAppointment = () => {
  const queryClient = useQueryClient();
  const [store] = useState(
    () =>
      new MobxMutation({
        mutationFn: (variables: UpdateAppointmentStatusInput) => updateAppointmentStatus(variables),
        onSuccess: async (_, variables) => {
          await queryClient.invalidateQueries({ queryKey: ['admin-my-day'] });
          toast.success(variables.status === 'checked_in' ? 'Cliente marcado como presente.' : 'Atendimento iniciado.');
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o atendimento.'),
      }),
  );

  return store;
};
