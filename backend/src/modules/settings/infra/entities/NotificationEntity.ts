import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import type { NotificationChannel, NotificationStatus, NotificationType } from '@/modules/settings/domain/entities/Notification';

@Entity('notifications')
@Index('IDX_notifications_user', ['userId'])
@Index('IDX_notifications_appointment', ['appointmentId'])
export class NotificationEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 36, name: 'appointment_id', nullable: true })
  appointmentId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 20 })
  channel!: NotificationChannel;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status!: NotificationStatus;

  @Column({ type: 'datetime', name: 'scheduled_at', nullable: true })
  scheduledAt!: Date | null;

  @Column({ type: 'datetime', name: 'ready_at', nullable: true })
  readyAt!: Date | null;

  @Column({ type: 'datetime', name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'text', default: '' })
  message!: string;

  @Column({ type: 'varchar', length: 36, name: 'resend_of', nullable: true })
  resendOf!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
