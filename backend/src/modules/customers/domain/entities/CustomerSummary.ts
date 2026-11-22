export const CUSTOMER_SORT_FIELDS = ['name', 'lastVisit', 'visitsCount', 'totalSpentCents'] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  guest: boolean;
  tags: string[];
  lastVisit: Date | null;
  visitsCount: number;
  totalSpentCents: number;
}
