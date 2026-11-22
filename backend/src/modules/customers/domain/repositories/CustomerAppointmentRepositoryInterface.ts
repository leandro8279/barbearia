export interface CustomerAppointmentRecord {
  id: string;
  code: string;
  start: Date;
  end: Date;
  status: string;
  items: Array<{ name: string; price: number; durationMin: number }>;
}

export interface ICustomerAppointmentRepository {
  findDoneVisitDates(customerId: string): Promise<Date[]>;
  findByCustomer(customerId: string, scope: { barberUserId?: string }): Promise<CustomerAppointmentRecord[]>;
}
