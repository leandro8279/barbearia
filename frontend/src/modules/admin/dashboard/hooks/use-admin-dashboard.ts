import { useState } from 'react';

import { getAdminDashboard } from '@/modules/admin/dashboard/api/dashboard';

import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

type DashboardParams = { from: string; to: string };

const dashboardKey = (params: DashboardParams) => ['admin-dashboard', params] as const;

class AdminDashboardStore {
  #enabled = false;
  private params = { from: '', to: '' };

  #query = new MobxQuery({
    staleTime: 30_000,
    queryFn: ({ queryKey }: { queryKey: ReturnType<typeof dashboardKey> }) => {
      const [, { from, to }] = queryKey;
      return getAdminDashboard(from, to);
    },
  });

  constructor(from: string, to: string, enabled = false) {
    this.params = { from, to };
    this.#enabled = enabled;
    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query({
      enabled: this.#enabled,
      queryKey: dashboardKey(this.params),
    });
  }

  get dashboard() {
    return this.result.data;
  }

  setParams(params: DashboardParams) {
    this.params = params;
  }
}

export const useAdminDashboard = (from: string, to: string, enabled = true) => {
  const [store] = useState(() => new AdminDashboardStore(from, to, enabled));

  return store;
};
