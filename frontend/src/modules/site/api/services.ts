import { apiRequest, buildQuery } from '@/shared/lib/http';

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  order: number;
}

export interface PublicService {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  description: string;
  durationMin: number;
  price: number;
  featured?: boolean;
}

export interface EffectiveServicePrice {
  serviceId: number;
  price: number;
  variesByBarber: boolean;
}

export interface PublicServiceCatalog {
  services: PublicService[];
  categories: ServiceCategory[];
  prices: EffectiveServicePrice[];
}

const PAGE_LIMIT = 100;

export async function getPublicServiceCatalog(featuredOnly = false): Promise<PublicServiceCatalog> {
  const [services, categories, prices] = await Promise.all([
    apiRequest<PublicService[]>(
      `/services${buildQuery({ _page: 1, _limit: PAGE_LIMIT, _sort: 'name', _order: 'asc', featured: featuredOnly ? 'true' : undefined })}`,
    ),
    apiRequest<ServiceCategory[]>(`/serviceCategories${buildQuery({ _page: 1, _limit: PAGE_LIMIT, _sort: 'order', _order: 'asc' })}`),
    apiRequest<EffectiveServicePrice[]>('/public/service-prices'),
  ]);

  return { services, categories, prices };
}
