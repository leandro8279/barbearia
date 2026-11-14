import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

import { getPublicServiceCatalog, PublicServiceCatalog } from '@/modules/site/api/services';

const STALE_TIME = 5 * 60 * 1000;
const FEATURED_LIMIT = 3;
const EMPTY_CATALOG: PublicServiceCatalog = { services: [], prices: [] };

type CatalogKey = readonly ['services', { scope: 'public-catalog'; featuredOnly: boolean }];

class PublicServiceCatalogStore {
  private featuredOnly: boolean;

  #query = new MobxQuery({
    staleTime: STALE_TIME,
    queryFn: ({ queryKey }: { queryKey: CatalogKey }) => getPublicServiceCatalog(queryKey[1]),
  });

  constructor(featuredOnly = false) {
    this.featuredOnly = featuredOnly;
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

  setFeaturedOnly(featuredOnly: boolean) {
    this.featuredOnly = featuredOnly;
  }
}

export const usePublicServiceCatalog = (featuredOnly = false) => {
  const [store] = useState(() => new PublicServiceCatalogStore(featuredOnly));
  
  return store;
};
