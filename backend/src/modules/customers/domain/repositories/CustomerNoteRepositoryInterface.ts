export interface CustomerNoteRecord {
  id: string;
  type: string;
  text: string;
  pinned: boolean;
  createdAt: Date;
}

export interface ICustomerNoteRepository {
  findByCustomer(customerId: string): Promise<CustomerNoteRecord[]>;
}
