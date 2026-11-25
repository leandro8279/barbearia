import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import type { PaymentMethod, PaymentStatus } from '@/modules/tabs/domain/entities/Payment';

@Entity('payments')
@Index('IDX_payments_tab', ['tabId'])
@Index('IDX_payments_created', ['createdAt'])
export class PaymentEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'tab_id' })
  tabId!: string;

  @Column({ type: 'varchar', length: 20 })
  method!: PaymentMethod;

  /** Em centavos. */
  @Column({ type: 'integer', name: 'amount_cents' })
  amountCents!: number;

  @Column({ type: 'varchar', length: 20, default: 'paid' })
  status!: PaymentStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
