export const CUSTOMER_DUPLICATE_MATCHES = ['phone', 'name'] as const;
export type CustomerDuplicateMatch = (typeof CUSTOMER_DUPLICATE_MATCHES)[number];

export interface FindCustomerDuplicatesDTO {
  phone: string;
  name: string;
  excludeId?: string;
}

export interface CustomerDuplicateDTO {
  id: string;
  name: string;
  phone: string;
  matchedBy: CustomerDuplicateMatch[];
}

export type FindCustomerDuplicatesResponseDTO = CustomerDuplicateDTO[];
