import { ListAdminCustomersDTO, ListAdminCustomersResponseDTO, toCustomerListItem } from '@/modules/customers/application/dtos/ListAdminCustomersDTO';
import { ICustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { normalizePhone } from '@/shared/utils/phone';
import { normalizeText } from '@/shared/utils/text';

import type { CustomerSortField, CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';
const DAY_MS = 24 * 60 * 60 * 1000;
const onlyDigits = (value: string | null) => (value ?? '').replace(/\D/g, '');

/** Mês (MM) no fuso de São Paulo, usado nos aniversariantes. */
const brazilMonth = (date: Date) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', month: '2-digit' }).format(date);

function compare(a: CustomerSummary, b: CustomerSummary, field: CustomerSortField, direction: 'asc' | 'desc'): number {
  const sign = direction === 'desc' ? -1 : 1;
  const byId = a.id.localeCompare(b.id);

  if (field === 'lastVisit') {
    // Quem nunca visitou fica sempre no fim, independente da direção.
    if (a.lastVisit === null || b.lastVisit === null) {
      if (a.lastVisit === b.lastVisit) return byId;
      return a.lastVisit === null ? 1 : -1;
    }
    return (a.lastVisit.getTime() - b.lastVisit.getTime()) * sign || byId;
  }
  if (field === 'name') return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) * sign || byId;

  return (a[field] - b[field]) * sign || byId;
}

export class ListAdminCustomersUseCase implements IUseCase<ListAdminCustomersDTO, ListAdminCustomersResponseDTO> {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: ListAdminCustomersDTO): Promise<ListAdminCustomersResponseDTO> {
    const now = this.now();
    const currentMonth = brazilMonth(now);
    const search = normalizeText(input.search);
    // Telefone só é pesquisável por quem pode vê-lo inteiro; senão a busca vazaria o número mascarado.
    const searchPhone = input.canViewFullPhone ? (normalizePhone(input.search) ?? onlyDigits(input.search)) : '';
    const cutoff = input.noVisitDays === undefined ? null : now.getTime() - input.noVisitDays * DAY_MS;

    const customers = await this.customerRepository.findAllWithMetrics();

    const filtered = customers
      .filter((customer) => {
        const searchMatches =
          !search || normalizeText(customer.name).includes(search) || (searchPhone !== '' && onlyDigits(customer.phone).includes(searchPhone));
        const visitMatches = cutoff === null || customer.lastVisit === null || customer.lastVisit.getTime() <= cutoff;
        const birthdayMatches = !input.birthdayMonth || (customer.birthDate ?? '').slice(5, 7) === currentMonth;

        return searchMatches && visitMatches && birthdayMatches;
      })
      .sort((a, b) => compare(a, b, input.sortField, input.direction));

    const start = (input.page - 1) * input.pageSize;
    const items = filtered.slice(start, start + input.pageSize).map((customer) => toCustomerListItem(customer, input.canViewFullPhone, currentMonth));

    return { items, total: filtered.length, page: input.page, pageSize: input.pageSize };
  }
}
