import {
    CustomerNoteRecord, ICustomerNoteRepository
} from '@/modules/customers/domain/repositories/CustomerNoteRepositoryInterface';

export class InMemoryCustomerNoteRepository implements ICustomerNoteRepository {
  items: Array<CustomerNoteRecord & { customerId: string }> = [];

  async findByCustomer(customerId: string) {
    return this.items
      .filter((n) => n.customerId === customerId)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.getTime() - a.createdAt.getTime());
  }
}
