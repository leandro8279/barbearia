import {
    CustomerAppointmentRecord, CustomerTabRecord, ICustomerHistoryRepository
} from '@/modules/customers/domain/repositories/CustomerHistoryRepositoryInterface';

export class InMemoryCustomerHistoryRepository implements ICustomerHistoryRepository {
  appointments: Array<CustomerAppointmentRecord & { customerId: string; barberUserId: string }> = [];
  tabs: Array<CustomerTabRecord & { customerId: string }> = [];

  async findDoneVisitDates(customerId: string) {
    return this.appointments.filter((a) => a.customerId === customerId && a.status === 'done').map((a) => a.start);
  }

  async findAppointments(customerId: string, { barberUserId }: { barberUserId?: string }) {
    return this.appointments
      .filter((a) => a.customerId === customerId && (!barberUserId || a.barberUserId === barberUserId))
      .sort((a, b) => b.start.getTime() - a.start.getTime());
  }

  async findClosedTabs(customerId: string) {
    return this.tabs.filter((t) => t.customerId === customerId).sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
