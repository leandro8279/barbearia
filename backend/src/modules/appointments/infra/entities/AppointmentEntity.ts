import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { AppointmentEvent, AppointmentOrigin, AppointmentStatus } from '@/modules/appointments/domain/entities/Appointment';

@Entity('appointments')
@Index('UQ_appointments_code', ['code'], { unique: true })
@Index('IDX_appointments_barber_start', ['barberId', 'start'])
@Index('IDX_appointments_customer', ['customerId'])
export class AppointmentEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 36, name: 'barber_id' })
  barberId!: string;

  @Column({ type: 'varchar', length: 36, name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'datetime', name: 'start_at' })
  start!: Date;

  @Column({ type: 'datetime', name: 'end_at' })
  end!: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: AppointmentStatus;

  @Column({ type: 'varchar', length: 20, default: 'admin' })
  origin!: AppointmentOrigin;

  @Column({ type: 'integer', default: 0 })
  subtotal!: number;

  @Column({ type: 'integer', default: 0 })
  discount!: number;

  @Column({ type: 'integer', default: 0 })
  total!: number;

  @Column({ type: 'text', default: '' })
  notes!: string;

  @Column({ type: 'integer', name: 'reschedule_count', default: 0 })
  rescheduleCount!: number;

  @Column({ type: 'datetime', name: 'started_at', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime', name: 'finished_at', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'varchar', length: 200, name: 'canceled_reason', nullable: true })
  canceledReason!: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  events!: AppointmentEvent[];

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
