import type { Expense, ExpenseDisplayStatus, ExpenseStatus } from '@/modules/finance/domain/entities/Expense';

export interface ExpenseResponseDTO {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  dueAt: string;
  status: ExpenseStatus;
  displayStatus: ExpenseDisplayStatus;
  paidAt: string | null;
  recurring: boolean;
  createdAt: string;
}

export function toExpenseResponse(expense: Expense, now: Date): ExpenseResponseDTO {
  return {
    id: expense.id,
    description: expense.description,
    category: expense.category,
    amountCents: expense.amountCents,
    dueAt: expense.dueAt.toISOString(),
    status: expense.status,
    displayStatus: expense.displayStatus(now),
    paidAt: expense.paidAt?.toISOString() ?? null,
    recurring: expense.recurring,
    createdAt: expense.createdAt.toISOString(),
  };
}
