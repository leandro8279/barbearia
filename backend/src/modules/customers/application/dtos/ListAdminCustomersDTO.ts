import type { CustomerSortField, CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';

import { maskPhone } from '@/shared/utils/phone';

export interface ListAdminCustomersDTO {
  page: number;
  pageSize: number;
  search: string;
  noVisitDays?: number;
  birthdayMonth: boolean;
  sortField: CustomerSortField;
  direction: 'asc' | 'desc';
  canViewFullPhone: boolean;
}

export interface CustomerListItemDTO {
  id: string;
  name: string;
  phone: string;
  phoneMasked: boolean;
  lastVisit: string | null;
  visitsCount: number;
  totalSpentCents: number;
  tags: string[];
}

export interface ListAdminCustomersResponseDTO {
  items: CustomerListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export function toCustomerListItem(customer: CustomerSummary, canViewFullPhone: boolean, currentMonth: string): CustomerListItemDTO {
  const tags = new Set(
    customer.tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12),
  );
  if (customer.guest) tags.add('Visitante');
  if ((customer.birthDate ?? '').slice(5, 7) === currentMonth) tags.add('Aniversariante');

  return {
    id: customer.id,
    name: customer.name,
    phone: canViewFullPhone ? (customer.phone ?? '') : maskPhone(customer.phone),
    phoneMasked: !canViewFullPhone,
    lastVisit: customer.lastVisit?.toISOString() ?? null,
    visitsCount: customer.visitsCount,
    totalSpentCents: customer.totalSpentCents,
    tags: [...tags],
  };
}
