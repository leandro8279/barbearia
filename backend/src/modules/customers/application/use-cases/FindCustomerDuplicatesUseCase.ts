import {
  CustomerDuplicateMatch,
  FindCustomerDuplicatesDTO,
  FindCustomerDuplicatesResponseDTO,
} from '@/modules/customers/application/dtos/FindCustomerDuplicatesDTO';
import { CustomerSummaryData, ICustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepositoryInterface';

import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { normalizePhone } from '@/shared/utils/phone';
import { normalizeText } from '@/shared/utils/text';

const MIN_NAME_LENGTH = 3;
const MAX_RESULTS = 5;

interface Candidate {
  customer: CustomerSummaryData;
  matchedBy: CustomerDuplicateMatch[];
}

export class FindCustomerDuplicatesUseCase implements IUseCase<FindCustomerDuplicatesDTO, FindCustomerDuplicatesResponseDTO> {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute({ phone: rawPhone, name: rawName, excludeId }: FindCustomerDuplicatesDTO): Promise<FindCustomerDuplicatesResponseDTO> {
    const phone = normalizePhone(rawPhone); // null quando tem menos de 10 dígitos
    const name = normalizeText(rawName);
    const searchByName = name.length >= MIN_NAME_LENGTH;

    if (!phone && !searchByName) return [];

    const customers = await this.customerRepository.findSummaries(excludeId);

    return customers
      .map<Candidate>((customer) => {
        const matchedBy: CustomerDuplicateMatch[] = [];
        if (phone && customer.phone && normalizePhone(customer.phone) === phone) matchedBy.push('phone');
        if (searchByName && normalizeText(customer.name) === name) matchedBy.push('name');

        return { customer, matchedBy };
      })
      .filter(({ matchedBy }) => matchedBy.length > 0)
      .sort(
        (a, b) =>
          Number(b.matchedBy.includes('phone')) - Number(a.matchedBy.includes('phone')) || a.customer.name.localeCompare(b.customer.name, 'pt-BR'),
      )
      .slice(0, MAX_RESULTS)
      .map(({ customer, matchedBy }) => ({ id: customer.id, name: customer.name, phone: customer.phone ?? '', matchedBy }));
  }
}
