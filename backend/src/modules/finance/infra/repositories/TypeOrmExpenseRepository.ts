import { Expense } from '@/modules/finance/domain/entities/Expense';
import { ExpenseFilters, ExpenseSortField, IExpenseRepository } from '@/modules/finance/domain/repositories/ExpenseRepositoryInterface';
import { ExpenseEntity } from '@/modules/finance/infra/entities/ExpenseEntity';
import { ExpenseMapper } from '@/modules/finance/infra/mappers/ExpenseMapper';

import { PaginationParams } from '@/shared/types/pagination.types';
import { getSkip } from '@/shared/utils/pagination';

import { DataSource, Repository } from 'typeorm';

const toDbDatetime = (date: Date): string => date.toISOString().replace('T', ' ').replace('Z', '');

const STATUS_SQL = "CASE WHEN expense.status = 'paid' THEN 'paid' WHEN expense.dueAt < :cutoff THEN 'overdue' ELSE 'open' END";

const SORT_COLUMN: Record<ExpenseSortField, string> = {
  dueAt: 'expense.dueAt',
  description: 'expense.description',
  category: 'expense.category',
  amountCents: 'expense.amountCents',
  status: STATUS_SQL,
};

export class TypeOrmExpenseRepository implements IExpenseRepository {
  private readonly repository: Repository<ExpenseEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ExpenseEntity);
  }

  async findPage(
    { search, categories, status, dueFrom, dueTo, overdueBefore, sortField, direction }: ExpenseFilters,
    pagination: PaginationParams,
  ): Promise<{ items: Expense[]; total: number }> {
    const qb = this.repository.createQueryBuilder('expense').setParameter('cutoff', toDbDatetime(overdueBefore));

    if (search) {
      const escaped = search.toLowerCase().replace(/[\\%_]/g, '\\$&');
      qb.andWhere("(LOWER(expense.description) LIKE :search ESCAPE '\\' OR LOWER(expense.category) LIKE :search ESCAPE '\\')", {
        search: `%${escaped}%`,
      });
    }
    if (categories?.length) qb.andWhere('expense.category IN (:...categories)', { categories });

    if (status === 'paid') qb.andWhere("expense.status = 'paid'");
    if (status === 'overdue') qb.andWhere("expense.status <> 'paid' AND expense.dueAt < :cutoff");
    if (status === 'open') qb.andWhere("expense.status <> 'paid' AND expense.dueAt >= :cutoff");

    if (dueFrom) qb.andWhere('expense.dueAt >= :dueFrom', { dueFrom: toDbDatetime(dueFrom) });
    if (dueTo) qb.andWhere('expense.dueAt <= :dueTo', { dueTo: toDbDatetime(dueTo) });

    const [entities, total] = await qb
      .orderBy(SORT_COLUMN[sortField], direction === 'desc' ? 'DESC' : 'ASC')
      .addOrderBy('expense.id', 'ASC')
      .skip(getSkip(pagination))
      .take(pagination.limit)
      .getManyAndCount();

    return { items: entities.map(ExpenseMapper.toDomain), total };
  }
}
