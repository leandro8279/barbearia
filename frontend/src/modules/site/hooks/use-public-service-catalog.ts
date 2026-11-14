import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

import { getPublicServiceCatalog, PublicServiceCatalog } from '../api/services';

const STALE_TIME = 5 * 60 * 1000;
const FEATURED_LIMIT = 3;
const EMPTY_CATALOG: PublicServiceCatalog = { services: [], prices: [] };

type CatalogKey = readonly ['services', { scope: 'public-catalog'; featuredOnly: boolean }];

class PublicServiceCatalogStore {
  private featuredOnly = false;

  #query = new MobxQuery({
    staleTime: STALE_TIME,
    queryFn: ({ queryKey }: { queryKey: CatalogKey }) => getPublicServiceCatalog(queryKey[1]),
  });

  constructor() {
    makeAutoObservable(this);
  }

  get result() {
    return this.#query.query({ queryKey: ['services', { scope: 'public-catalog', featuredOnly: this.featuredOnly }] });
  }

  get catalog() {
    return this.result.data ?? EMPTY_CATALOG;
  }

  get featuredServices() {
    return this.catalog.services.filter((service) => service.featured).slice(0, FEATURED_LIMIT);
  }

  get prices() {
    return new Map(this.catalog.prices.map((p) => [p.serviceId, p]));
  }

  setFeaturedOnly(value: boolean) {
    this.featuredOnly = value;
  }
}

export const usePublicServiceCatalog = () => {
  const [store] = useState(() => new PublicServiceCatalogStore());
  return store;
};
