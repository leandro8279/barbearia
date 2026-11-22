import type { CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';

export interface ICustomerRepository {
  findAllWithMetrics(): Promise<CustomerSummary[]>;
}
