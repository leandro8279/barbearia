import {
    CustomerTabRecord, ICustomerTabRepository
} from '@/modules/customers/domain/repositories/CustomerTabRepositoryInterface';

export class InMemoryCustomerTabRepository implements ICustomerTabRepository {
  items: Array<CustomerTabRecord & { customerId: string }> = [];

  async findClosedByCustomer(customerId: string) {
    return this.items.filter((t) => t.customerId === customerId).sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
