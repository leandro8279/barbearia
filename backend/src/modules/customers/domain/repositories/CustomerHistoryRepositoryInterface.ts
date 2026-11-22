export interface CustomerAppointmentRecord {
  id: string;
  code: string;
  start: Date;
  end: Date;
  status: string;
  items: Array<{ name: string; price: number; durationMin: number }>;
}

export interface CustomerTabRecord {
  id: string;
  appointmentId: string | null;
  date: Date;
  totalCents: number;
  items: Array<{ name: string; qty: number }>;
  payments: Array<{ method: string; amountCents: number }>;
}

export interface ICustomerHistoryRepository {
  findDoneVisitDates(customerId: string): Promise<Date[]>;

  findAppointments(customerId: string, scope: { barberUserId?: string }): Promise<CustomerAppointmentRecord[]>;

  findClosedTabs(customerId: string): Promise<CustomerTabRecord[]>;
}
