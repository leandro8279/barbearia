import { useState } from 'react';

import { getPublicServiceCatalog, PublicServiceCatalog } from '@/modules/site/api/services';

import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

const STALE_TIME = 5 * 60 * 1000;
const FEATURED_LIMIT = 3;

const EMPTY_CATALOG: PublicServiceCatalog = { services: [], prices: [], categories: [] };

type CatalogKey = readonly ['services', { scope: 'public-catalog'; featuredOnly?: boolean }];

class PublicServiceCatalogStore {
  #query = new MobxQuery({
    staleTime: STALE_TIME,
    queryFn: ({ queryKey }: { queryKey: CatalogKey }) => getPublicServiceCatalog(queryKey[1].featuredOnly),
  });

  constructor(private readonly featuredOnly = false) {
    makeAutoObservable<PublicServiceCatalogStore, 'featuredOnly'>(this, { featuredOnly: false });
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

  get services() {
    return this.catalog.services || [];
  }

  get categories() {
    return this.catalog.categories || [];
  }

  get categoryGroups() {
    return this.categories
      .map((category) => ({ ...category, services: this.services.filter((service) => service.categoryId === category.id) }))
      .filter((category) => category.services.length > 0);
  }

  get isPending() {
    return this.result.isPending;
  }

  get isError() {
    return this.result.isError;
  }

  get isSuccess() {
    return this.result.isSuccess;
  }
}

export const usePublicServiceCatalog = (featuredOnly = false) => {
  const [store] = useState(() => new PublicServiceCatalogStore(featuredOnly));

  return store;
};
