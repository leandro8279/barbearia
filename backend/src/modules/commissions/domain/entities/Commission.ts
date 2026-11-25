export const COMMISSION_KINDS = ['service', 'product'] as const;
export type CommissionKind = (typeof COMMISSION_KINDS)[number];

export const COMMISSION_STATUSES = ['pending', 'paid'] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];
