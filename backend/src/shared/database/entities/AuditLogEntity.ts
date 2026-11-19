import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('audit_logs')
@Index('IDX_audit_logs_entity', ['entity', 'entityId'])
@Index('IDX_audit_logs_user', ['userId'])
export class AuditLogEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100 })
  entity!: string;

  @Column({ type: 'varchar', length: 64, name: 'entity_id', nullable: true })
  entityId!: string | null;

  @Column({ type: 'simple-json', default: '{}' })
  details!: Record<string, unknown>;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
