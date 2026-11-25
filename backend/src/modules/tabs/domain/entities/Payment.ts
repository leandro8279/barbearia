export const PAYMENT_METHODS = ['cash', 'pix', 'debit', 'credit'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'canceled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
