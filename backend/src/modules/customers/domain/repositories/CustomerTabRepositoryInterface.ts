export interface CustomerTabRecord {
  id: string;
  appointmentId: string | null;
  date: Date;
  totalCents: number;
  items: Array<{ name: string; qty: number }>;
  payments: Array<{ method: string; amountCents: number }>;
}

export interface ICustomerTabRepository {
  findClosedByCustomer(customerId: string): Promise<CustomerTabRecord[]>;
}
