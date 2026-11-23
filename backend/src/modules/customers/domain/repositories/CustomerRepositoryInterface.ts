import type { CustomerSummary } from '@/modules/customers/domain/entities/CustomerSummary';

export interface CustomerSummaryData {
  id: string;
  name: string;
  phone: string | null;
}

export interface ICustomerRepository {
  findAllWithMetrics(): Promise<CustomerSummary[]>;
  findSummaries(excludeId?: string): Promise<CustomerSummaryData[]>;
  findByPhone(phone: string): Promise<CustomerSummaryData | null>;
  findByPhoneAndCustomerId(phone: string, customerId: string): Promise<CustomerSummaryData | null>;
}
