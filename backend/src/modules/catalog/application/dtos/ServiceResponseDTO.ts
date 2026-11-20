import type { Service } from '@/modules/catalog/domain/entities/Service';

export interface ServiceResponseDTO {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  description: string;
  durationMin: number;
  bufferMin: number;
  price: number; // centavos
  commissionPct: number;
  active: boolean;
  featured: boolean;
}

export function toServiceResponse(service: Service): ServiceResponseDTO {
  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    description: service.description,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    price: service.price,
    commissionPct: service.commissionPct,
    active: service.active,
    featured: service.featured,
  };
}
