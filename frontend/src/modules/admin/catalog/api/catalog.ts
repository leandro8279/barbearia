import type { ServiceCategory } from '@/modules/site/api/services';
import { apiRequest, buildQuery } from '@/shared/lib/http';

export interface AdminService {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  description: string;
  image?: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  commissionPct: number;
  active: boolean;
  featured: boolean;
}

export interface BarberServiceAssignment {
  barberId: number;
  name: string;
  photo: string | null;
  assigned: boolean;
  durationMin: number | null;
  price: number | null;
  commissionPct: number | null;
}

export interface AdminServiceDetail extends AdminService {
  barberAssignments: BarberServiceAssignment[];
}

export type AdminServiceSaveInput = Omit<AdminService, 'id' | 'slug'> & { slug?: string; barberAssignments: BarberServiceAssignment[] };

export interface AdminServicePage {
  items: AdminService[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminServiceQuery {
  page: number;
  pageSize: number;
  query: string;
  categoryId?: number;
  active?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export async function getAdminServices(params: AdminServiceQuery) {
  return apiRequest<AdminServicePage>(
    `/admin/catalog/services${buildQuery({
      _page: params.page,
      _limit: params.pageSize,
      q: params.query,
      categoryId: params.categoryId,
      active: params.active === undefined ? undefined : String(params.active),
      _sort: params.sortBy,
      _order: params.sortOrder,
    })}`,
  );
}

export async function getServiceCategories() {
  return apiRequest<ServiceCategory[]>(`/serviceCategories${buildQuery({ _page: 1, _limit: 100, _sort: 'order', _order: 'asc' })}`);
}

export async function getAdminService(id: string) {
  return apiRequest<AdminServiceDetail>(`/admin/catalog/services/${encodeURIComponent(id)}`);
}

export async function getCatalogBarbers() {
  return apiRequest<Array<{ id: number; name: string; photo: string | null }>>('/admin/catalog/barbers');
}

export async function saveAdminService(id: string | null, service: AdminServiceSaveInput) {
  return apiRequest<AdminService>(id ? `/admin/catalog/services/${encodeURIComponent(id)}` : '/admin/catalog/services', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(service) });
}

export async function setServiceActive(id: number, active: boolean) {
  return apiRequest<{ id: number; active: boolean }>(`/admin/catalog/services/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });
}

export async function duplicateService(service: AdminService) {
  const source = await getAdminService(String(service.id));
  return saveAdminService(null, {
    name: `${service.name} (cópia)`,
    slug: `${source.slug || `servico-${service.id}`}-copia-${Date.now().toString(36)}`,
    categoryId: source.categoryId,
    description: source.description,
    image: source.image || '',
    durationMin: source.durationMin,
    bufferMin: source.bufferMin,
    price: source.price,
    commissionPct: source.commissionPct,
    active: false,
    featured: false,
    barberAssignments: source.barberAssignments,
  });
}
