import { useEffect, useState } from 'react';
import { makeAutoObservable } from 'mobx';

import { getAdminDashboard } from '@/modules/admin/dashboard/api/dashboard';
import { MobxQuery } from '@/shared/lib/query';

const STALE_TIME = 30_000;

type DashboardParams = { from: string; to: string };

const dashboardKey = (params: DashboardParams) => ['admin-dashboard', params] as const;
type DashboardKey = ReturnType<typeof dashboardKey>;

class AdminDashboardStore {
  private params: DashboardParams;
  private enabled: boolean;

  #dashboardQuery = new MobxQuery({
    staleTime: STALE_TIME,
    queryFn: ({ queryKey }: { queryKey: DashboardKey }) => {
      const [, { from, to }] = queryKey;
      return getAdminDashboard(from, to);
    },
  });

  constructor(params: DashboardParams, enabled: boolean) {
    this.params = params;
    this.enabled = enabled;
    makeAutoObservable(this);
  }

  get queryResult() {
    return this.#dashboardQuery.query({
      enabled: this.enabled,
      queryKey: dashboardKey(this.params),
    });
  }

  get dashboard() {
    return this.queryResult.data;
  }

  get isLoading() {
    return this.queryResult.isLoading;
  }

  get error() {
    return this.queryResult.error;
  }

  setParams(params: DashboardParams) {
    this.params = params;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
  }
}

export const useAdminDashboard = (from: string, to: string, enabled = true) => {
  const [store] = useState(() => new AdminDashboardStore({ from, to }, enabled));

  return store;
};
