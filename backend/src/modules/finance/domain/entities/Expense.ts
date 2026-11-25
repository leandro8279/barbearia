export const EXPENSE_STATUSES = ['open', 'paid'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
