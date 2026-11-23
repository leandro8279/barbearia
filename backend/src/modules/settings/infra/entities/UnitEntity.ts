import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { BusinessHour, Holiday, UnitAddressDetails } from '@/modules/settings/domain/entities/Unit';

@Entity('units')
export class UnitEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', default: '' })
  address!: string;

  @Column({ type: 'simple-json', name: 'address_details', default: '{}' })
  addressDetails!: UnitAddressDetails;

  @Column({ type: 'varchar', length: 24 })
  phone!: string;

  @Column({ type: 'varchar', length: 24, default: '' })
  whatsapp!: string;

  /** URL, caminho ou data URL (até 200 KB). */
  @Column({ type: 'text', nullable: true })
  logo!: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  amenities!: string[];

  @Column({ type: 'simple-json', default: '[]' })
  photos!: string[];

  @Column({ type: 'simple-json', name: 'business_hours', default: '[]' })
  businessHours!: BusinessHour[];

  @Column({ type: 'simple-json', default: '[]' })
  holidays!: Holiday[];

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
