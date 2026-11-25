import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import type { CommissionKind, CommissionStatus } from '@/modules/commissions/domain/entities/Commission';

@Entity('commissions')
@Index('IDX_commissions_tab', ['tabId'])
@Index('IDX_commissions_barber', ['barberId'])
@Index('IDX_commissions_status', ['status'])
export class CommissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'barber_id' })
  barberId!: string;

  @Column({ type: 'varchar', length: 36, name: 'tab_id' })
  tabId!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: CommissionKind;

  /** Base de cálculo, em centavos. */
  @Column({ type: 'integer', name: 'base_cents' })
  baseCents!: number;

  @Column({ type: 'integer' })
  pct!: number;

  /** Valor da comissão, em centavos. */
  @Column({ type: 'integer', name: 'amount_cents' })
  amountCents!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: CommissionStatus;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
