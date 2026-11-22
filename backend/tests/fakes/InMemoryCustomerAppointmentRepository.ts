import {
    CustomerAppointmentRecord, ICustomerAppointmentRepository
} from '@/modules/customers/domain/repositories/CustomerAppointmentRepositoryInterface';

export class InMemoryCustomerAppointmentRepository implements ICustomerAppointmentRepository {
  items: Array<CustomerAppointmentRecord & { customerId: string; barberUserId: string }> = [];

  async findDoneVisitDates(customerId: string) {
    return this.items.filter((a) => a.customerId === customerId && a.status === 'done').map((a) => a.start);
  }

  async findByCustomer(customerId: string, { barberUserId }: { barberUserId?: string }) {
    return this.items
      .filter((a) => a.customerId === customerId && (!barberUserId || a.barberUserId === barberUserId))
      .sort((a, b) => b.start.getTime() - a.start.getTime());
  }
}
