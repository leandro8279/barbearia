import { getPublicBarbers } from '@/modules/site/api/barbers';

import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

class PublicBarberListStore {
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
}

export const usePublicBarberList = () => new PublicBarberListStore();
