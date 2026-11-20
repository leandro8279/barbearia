import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('barbers')
@Index('UQ_barbers_slug', ['slug'], { unique: true })
@Index('IDX_barbers_user', ['userId'])
export class BarberEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @Column({ type: 'text', default: '' })
  bio!: string;

  @Column({ type: 'simple-json', default: '[]' })
  specialties!: string[];

  @Column({ type: 'integer', name: 'commission_service_pct', default: 0 })
  commissionServicePct!: number;

  @Column({ type: 'integer', name: 'commission_product_pct', default: 0 })
  commissionProductPct!: number;

  @Column({ type: 'varchar', nullable: true })
  photo!: string | null;

  @Column({ type: 'varchar', name: 'pix_key', nullable: true })
  pixKey!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
