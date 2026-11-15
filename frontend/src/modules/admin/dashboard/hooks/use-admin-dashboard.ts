import { useState } from 'react';

import { getAdminDashboard } from '@/modules/admin/dashboard/api/dashboard';

import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

const STALE_TIME = 30_000;

type DashboardParams = { from: string; to: string };

const dashboardKey = (params: DashboardParams) => ['admin-dashboard', params] as const;
type DashboardKey = ReturnType<typeof dashboardKey>;

class AdminDashboardStore {
  #dashboardQuery = new MobxQuery({
    staleTime: STALE_TIME,
    queryFn: ({ queryKey }: { queryKey: DashboardKey }) => {
      const [, { from, to }] = queryKey;
      return getAdminDashboard(from, to);
    },
  });

  constructor(private readonly params: DashboardParams & { validRange: boolean }) {
    makeAutoObservable<AdminDashboardStore, 'filters'>(this, { filters: false });
  }

  get queryResult() {
    return this.#dashboardQuery.query({
      enabled: this.params.validRange,
      queryKey: dashboardKey({ from: this.params.from, to: this.params.to }),
    });
  }

  get dashboard() {
    return this.queryResult.data;
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

export const useAdminDashboard = (params: DashboardParams & { validRange: boolean }) => {
  const [store] = useState(() => new AdminDashboardStore(params));

  return store;
};
