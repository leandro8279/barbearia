import type { CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';
import { ICustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepositoryInterface';

export class InMemoryCustomerRepository implements ICustomerRepository {
  items: CustomerSummary[] = [];

  async findAllWithMetrics() {
    return [...this.items];
  }
}
