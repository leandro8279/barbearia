import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { TabStatus, TabType } from '@/modules/tabs/domain/entities/Tab';

@Entity('tabs')
@Index('UQ_tabs_appointment', ['appointmentId'], { unique: true, where: '"appointment_id" IS NOT NULL' })
@Index('IDX_tabs_customer', ['customerId'])
@Index('IDX_tabs_barber', ['barberId'])
@Index('IDX_tabs_status', ['status'])
export class TabEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'appointment_id', nullable: true })
  appointmentId!: string | null;

  @Column({ type: 'varchar', length: 36, name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'varchar', length: 36, name: 'barber_id', nullable: true })
  barberId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'appointment' })
  type!: TabType;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: TabStatus;

  @Column({ type: 'datetime', name: 'closed_at', nullable: true })
  closedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
