import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('appointment_items')
@Index('IDX_appointment_items_service', ['serviceId'])
export class AppointmentItemEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, name: 'appointment_id' })
  appointmentId!: string;

  @PrimaryColumn({ type: 'varchar', length: 36, name: 'service_id' })
  serviceId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'integer', name: 'duration_min' })
  durationMin!: number;

  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'integer', name: 'commission_pct', default: 0 })
  commissionPct!: number;
}
