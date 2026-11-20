import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('barber_services')
@Index('IDX_barber_services_service', ['serviceId'])
export class BarberServiceEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, name: 'barber_id' })
  barberId!: string;

  @PrimaryColumn({ type: 'varchar', length: 36, name: 'service_id' })
  serviceId!: string;

  @Column({ type: 'integer', name: 'commission_pct', default: 0 })
  commissionPct!: number;
}
