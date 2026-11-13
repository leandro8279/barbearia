import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

import { getPublicServiceCatalog, PublicServiceCatalog } from '../api/services';

class PublicServiceCatalogStore {
  private featuredOnly = false;

  #query = new MobxQuery({
    staleTime: 5 * 60 * 1000,
    queryFn: ({ queryKey }: any) => getPublicServiceCatalog(queryKey[1]),
  });

  constructor() {
    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query({ queryKey: ['services', { scope: 'public-catalog', featuredOnly: this.featuredOnly }] });
  }

  get publicServiceCatalog() {
    return this.result.data || ({} as PublicServiceCatalog);
  }

  get featuredServices() {
    return this.publicServiceCatalog.services?.filter((service) => service.featured).slice(0, 3) || [];
  }

  get prices() {
    return new Map(this.publicServiceCatalog.prices?.map((item) => [item.serviceId, item]) || []);
  }

  setParams(value: boolean) {
    this.featuredOnly = value;
  }
}

export const usePublicServiceCatalog = () => new PublicServiceCatalogStore();
