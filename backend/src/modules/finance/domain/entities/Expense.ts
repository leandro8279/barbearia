export const EXPENSE_STATUSES = ['open', 'paid'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

import { normalizeCategoryName } from '@/modules/finance/domain/services/expenseCategories';
import { startOfLocalDay } from '@/modules/finance/domain/services/financeCalendar';

export const EXPENSE_DISPLAY_STATUSES = ['open', 'paid', 'overdue'] as const;
export type ExpenseDisplayStatus = (typeof EXPENSE_DISPLAY_STATUSES)[number];

export interface ExpenseProps {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  dueAt: Date;
  status: ExpenseStatus;
  paidAt: Date | null;
  recurring: boolean;
  createdAt: Date;
}

export class Expense {
  private constructor(private readonly props: ExpenseProps) {}

  static restore(props: ExpenseProps): Expense {
    return new Expense({ ...props });
  }

  displayStatus(now: Date): ExpenseDisplayStatus {
    if (this.props.status === 'paid') return 'paid';

    return this.props.dueAt.getTime() < startOfLocalDay(now).getTime() ? 'overdue' : 'open';
  }

  get id(): string {
    return this.props.id;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return normalizeCategoryName(this.props.category);
  }

  get amountCents(): number {
    return this.props.amountCents;
  }

  get dueAt(): Date {
    return this.props.dueAt;
  }

  get status(): ExpenseStatus {
    return this.props.status;
  }

  get paidAt(): Date | null {
    return this.props.paidAt;
  }

  get recurring(): boolean {
    return this.props.recurring;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
