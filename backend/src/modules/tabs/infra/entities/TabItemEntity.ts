import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { TabItemType } from '@/modules/tabs/domain/entities/Tab';

@Entity('tab_items')
@Index('IDX_tab_items_tab', ['tabId'])
@Index('IDX_tab_items_barber', ['barberId'])
export class TabItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'tab_id' })
  tabId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: TabItemType;

  /** Serviço ou produto, conforme `type`. Sem FK: o snapshot abaixo preserva o histórico. */
  @Column({ type: 'varchar', length: 36, name: 'ref_id' })
  refId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'integer', default: 1 })
  qty!: number;

  @Column({ type: 'integer', name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'integer', default: 0 })
  discount!: number;

  @Column({ type: 'varchar', length: 36, name: 'barber_id', nullable: true })
  barberId!: string | null;

  @Column({ type: 'integer', name: 'commission_pct', default: 0 })
  commissionPct!: number;
}
