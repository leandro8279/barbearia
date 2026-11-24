import {
    StoredNotificationSettings
} from '@/modules/settings/domain/entities/NotificationSettings';
import type { StoredBookingSettings } from '@/modules/settings/domain/entities/BookingSettings';
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { BusinessSocials } from '@/modules/settings/domain/entities/BusinessSettings';
export interface BusinessJson {
  name?: string;
  cnpj?: string;
  email?: string;
  socials?: Partial<BusinessSocials>;
  timezone?: string;
}

@Entity('settings')
@Index('UQ_settings_unit', ['unitId'], { unique: true })
export class SettingsEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'unit_id' })
  unitId!: string;

  @Column({ type: 'simple-json', default: '{}' })
  business!: BusinessJson;

  @Column({ type: 'simple-json', default: '{}' })
  booking!: StoredBookingSettings;

  @Column({ type: 'simple-json', default: '{}' })
  notifications!: StoredNotificationSettings;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
