import { Expense } from '@/modules/finance/domain/entities/Expense';
import { ExpenseEntity } from '@/modules/finance/infra/entities/ExpenseEntity';

export class ExpenseMapper {
  static toDomain(entity: ExpenseEntity): Expense {
    return Expense.restore({
      id: entity.id,
      description: entity.description,
      category: entity.category,
      amountCents: entity.amountCents,
      dueAt: entity.dueAt,
      status: entity.status,
      paidAt: entity.paidAt ?? null,
      recurring: entity.recurring,
      createdAt: entity.createdAt,
    });
  }
}
