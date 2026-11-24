import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { NotificationType } from '@/modules/settings/domain/entities/Notification';

@Entity('message_templates')
@Index('UQ_message_templates_type', ['type'], { unique: true })
export class MessageTemplateEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: NotificationType;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
