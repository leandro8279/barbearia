import { useState } from 'react';

import { getPublicUnit, PublicUnit } from '@/modules/site/api/unit';

import { footerHours } from '@/shared/lib/format';
import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

class PublicUnitStore {
  #query = new MobxQuery({
    queryFn: getPublicUnit,
    staleTime: 5 * 60 * 1000,
    queryKey: ['units', { id: 1 }],
  });

  constructor() {
    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query();
  }

  get unit() {
    return this.result.data || ({} as PublicUnit);
  }

  get hours() {
    return footerHours(this.unit);
  }
}

export const usePublicUnit = () => {
  const [store] = useState(() => new PublicUnitStore());

  return store;
};
