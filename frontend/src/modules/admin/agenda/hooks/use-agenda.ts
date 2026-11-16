import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  getAgendaAppointments,
  getAgendaBarbers,
  getAgendaTimeBlocks,
  getAgendaUnit,
  rescheduleAgendaAppointment,
  RescheduleAgendaAppointmentInput,
} from '@/modules/admin/agenda/api/agenda';

import { HttpError } from '@/shared/lib/http';
import { MobxMutation } from '@/shared/lib/mutation';
import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';
import { toast } from 'sonner';

const agendaBarbersKey = (userId?: number) => ['admin-agenda-barbers', userId] as const;
type AgendaBarbersKey = ReturnType<typeof agendaBarbersKey>;

class AgendaBarbersStore {
  #query = new MobxQuery({
    queryFn: ({ queryKey }: { queryKey: AgendaBarbersKey }) => getAgendaBarbers(queryKey[1]),
  });

  constructor(private readonly userId?: number) {
    makeAutoObservable<AgendaBarbersStore, 'userId'>(this, { userId: false });
  }

  get queryResult() {
    return this.#query.query({ queryKey: agendaBarbersKey(this.userId) });
  }

  get barbers() {
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
}

export const useAgendaBarbers = (userId?: number) => {
  const [store] = useState(() => new AgendaBarbersStore(userId));

  return store;
};

type AgendaParams = { from: string | Date; to: string | Date; barberId: number | 'me' | undefined };

const agendaAppointmentsKey = (params: AgendaParams) => ['admin-agenda-appointments', params] as const;
type AgendaAppointmentsKey = ReturnType<typeof agendaAppointmentsKey>;

class AgendaAppointmentsStore {
  #query = new MobxQuery({
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: ({ queryKey }: { queryKey: AgendaAppointmentsKey }) => {
      const [, { from, to, barberId }] = queryKey;
      return getAgendaAppointments(from.toString(), to.toString(), barberId);
    },
  });

  constructor(private readonly getParams: () => AgendaParams) {
    makeAutoObservable<AgendaAppointmentsStore, 'getParams'>(this, { getParams: false });
  }

  get queryResult() {
    const { from, to, barberId } = this.getParams();
    return this.#query.query({ enabled: Boolean(from && to), queryKey: agendaAppointmentsKey({ from, to, barberId }) });
  }

  get appointments() {
    return this.queryResult.data || [];
  }

  filteredAppointments(statusFilter: string) {
    return statusFilter === 'all' ? this.appointments : this.appointments.filter((appointment) => appointment.status === statusFilter);
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
}

export const useAgendaAppointments = (getParams: () => AgendaParams) => {
  const [store] = useState(() => new AgendaAppointmentsStore(getParams));

  return store;
};

class AgendaTimeBlocksStore {
  #query = new MobxQuery({
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: getAgendaTimeBlocks,
  });

  constructor() {
    makeAutoObservable(this);
  }

  get queryResult() {
    return this.#query.query({ queryKey: ['admin-agenda-time-blocks'] });
  }

  get timeBlocks() {
    return this.queryResult.data || [];
  }

  get isError() {
    return this.queryResult.isError;
  }

  get isPending() {
    return this.queryResult.isPending;
  }
}

export const useAgendaTimeBlocks = () => {
  const [store] = useState(() => new AgendaTimeBlocksStore());

  return store;
};

class AgendaUnitStore {
  #query = new MobxQuery({ queryFn: getAgendaUnit });

  constructor() {
    makeAutoObservable(this);
  }

  get queryResult() {
    return this.#query.query({ queryKey: ['admin-agenda-unit'] });
  }

  get unit() {
    return this.queryResult.data;
  }

  get isError() {
    return this.queryResult.isError;
  }

  get isPending() {
    return this.queryResult.isPending;
  }
}

export const useAgendaUnit = () => {
  const [store] = useState(() => new AgendaUnitStore());

  return store;
};

export const useRescheduleAgendaAppointment = () => {
  const queryClient = useQueryClient();

  const [store] = useState(
    () =>
      new MobxMutation({
        mutationFn: ({ id, ...params }: RescheduleAgendaAppointmentInput & { id: number }) => rescheduleAgendaAppointment(id, params),
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointment'] }),
            queryClient.invalidateQueries({ queryKey: ['admin-agenda-time-blocks'] }),
          ]);
          toast.success('Agendamento remarcado.');
        },
        onError: async (error) => {
          await queryClient.invalidateQueries({ queryKey: ['admin-agenda-appointments'] });
          if (error instanceof HttpError && error.status === 409) {
            toast.error('Esse horário não está mais disponível. A agenda foi atualizada.');
            return;
          }
          toast.error(error instanceof Error ? error.message : 'Não foi possível remarcar o agendamento.');
        },
      }),
  );

  return store;
};
