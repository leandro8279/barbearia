import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import type { ExpenseStatus } from '@/modules/finance/domain/entities/Expense';

@Entity('expenses')
@Index('IDX_expenses_due', ['dueAt'])
@Index('IDX_expenses_status', ['status'])
export class ExpenseEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  description!: string;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  /** Em centavos. */
  @Column({ type: 'integer', name: 'amount_cents' })
  amountCents!: number;

  @Column({ type: 'datetime', name: 'due_at' })
  dueAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: ExpenseStatus;

  @Column({ type: 'datetime', name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  recurring!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
